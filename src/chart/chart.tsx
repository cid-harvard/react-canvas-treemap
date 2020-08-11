import {CSSPlugin, TimelineLite, TweenLite, registerPlugin} from 'gsap';
import createIntervalTree, {
  IntervalTree,
} from 'interval-tree-1d';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import React, {
  MutableRefObject,
  useEffect,
  useRef,
} from 'react';
import styled from 'styled-components/macro';
import {
  sendHeroElementTiming,
} from './heroElement';
import DOMPool from './DOMPool';
import {
  ANGLEInstancedArrays,
  AttributeBufferRequestType,
  createPopulatedGLBuffer,
  EXTDisjointTimerQuery,
  getProgramInfo,
  getUpdatePattern,
  GL_NUM_BYTES_PER_FLOAT,
  IndexElementType,
  IProgramInfo,
  normalizeColorQuadruplet,
  PersistentFloat32Array,
  resizeViewport,
  sendAttributesToGPUWithVAO,
  sendIndicesToGPUWithVAO,
  updateGLBuffer,
  WebGLVersion,
} from './webglUtils';
import {
  failIfValidOrNonExhaustive,
  millisecondsPerSeconds,
  halfStrokeWidth,
  strokeColor,
} from './Utils';
import {
  getTextLabelFragment,
} from './domDependentDrawUtils';
import {
  convertToInternalCells,
  getIntervalTrees,
  ICellInternal,
  NumCellsTier,
  numFloatsPerCellInstance,
  rectangleIndices,
  rectangleIndicesCount,
  rectangleReferencePositionValues,
  searchForHits,
  transitionDuration,
  writeToCellBuffers,
} from './domIndependentDrawUtils';

import {
  ITreeMapCell,
} from './otherTypes';
import usePropsChangeRateLimiter, {
  PropsChangeHandlerInput,
} from './usePropsChangeRateLimiter';
import useTrackingRef from './useTrackingRef';
import raw from 'raw.macro';


// Need to do this so that `CSSPlugin` is not dropped by the minifier:
/* tslint:disable-next-line:no-unused-expression */
CSSPlugin;
/* tslint:disable-next-line:no-unused-expression */
TimelineLite;
/* tslint:disable-next-line:no-unused-expression */
TweenLite;
registerPlugin(CSSPlugin);

//#region Styling
const Root = styled.div`
  contain: content;
  .react-canvas-tree-map-container {
    position: absolute;
    color: white;
    font-weight: 300;
  }

  .react-canvas-tree-map-percentage {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .react-canvas-tree-map-masterContainer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    will-change: opacity;
    -webkit-transition: opacity 175ms ease-out;
    transition: opacity 175ms ease-out;
  }

`;
//#endregion

const normalizedStrokeColor = normalizeColorQuadruplet(strokeColor);

const durationInSeconds = transitionDuration / millisecondsPerSeconds;
const hoverContinuousHitTestFrameRate = 20;

// This the max number of cells that can possibly appear for all tree maps
// except the 6-digit product tree map. This is the sum of (the number of
// 4-digit HS products) + (the number of 4-digit SITC products):
const maxNumCellsAtAnyTimeLowTier = 2600;
// This the max number of cells that can possibly happen when 6 digit is enabled
// which we call here "higher tier".
// This is the sum of the (number of 6-digit HS products) + max of (number of
// 4-digit HS products, number of SITC 4-digit products):
const maxNumCellsAtAnyTimeHighTier = 8000;
// for each cell, we draw 2 rectangles: one for stroke and one for fill:
const numInstancesPerCell = 2;

enum AnimationStatus {
  Initial,
  InProgress,
  FinishedCompletely,
}

type TextContainerTransitionStatus = {
  isTextContainerChanging: true
  prevContainer: HTMLElement;
  prevAttachedDOMNodes: HTMLElement[];
  nextContainer: HTMLElement;
  nextAttachedDOMNodes: HTMLElement[];
  fragment: DocumentFragment;
} | {
  isTextContainerChanging: false;
  currentTextContainer: HTMLElement;
  currentAttachedDOMNodes: HTMLElement[];
};

type Status = {
  status: AnimationStatus.Initial,
} | {
  status: AnimationStatus.InProgress,
  timeline: gsap.Timeline;
} | {
  status: AnimationStatus.FinishedCompletely,
  // Cell related:
  currentCells: Map<string, ICellInternal>;
  currentKeys: string[];
  cellIndicesCount: number;
  cellInstancesCount: number;

  // Hit test related
  xIntervalTree: IntervalTree<string>;
  yIntervalTree: IntervalTree<string>;
  // Text related:
  currentTextContainer: HTMLElement;
  currentAttachedDOMNodes: HTMLElement[];
};

interface IGLInfo {
  gl: WebGLRenderingContext;
  vaoExtension: OES_vertex_array_object;
  timerExtension: EXTDisjointTimerQuery | null;
  instancedDrawingExtension: ANGLEInstancedArrays;
  cellsVAO: WebGLVertexArrayObjectOES;
  cellBuffer: PersistentFloat32Array;
  cellGLBuffer: WebGLBuffer;
  rebindGLBuffer: (buffer: PersistentFloat32Array) => void;
}

const createCellsBuffer = (numCellsTier: NumCellsTier): PersistentFloat32Array => {
  let numCells: number;
  if (numCellsTier === NumCellsTier.Small) {
    numCells = maxNumCellsAtAnyTimeLowTier;
  } else if (numCellsTier === NumCellsTier.Large) {
    numCells = maxNumCellsAtAnyTimeHighTier;
  } else {
    failIfValidOrNonExhaustive(numCellsTier, 'Invalid num cells tier' + numCellsTier);
    // The following lines will never execute:
    numCells = 0;
  }
  return new PersistentFloat32Array(
    numCells * numInstancesPerCell * numFloatsPerCellInstance,
  );
};

// Assume that the cells are not the same if either the identities of the cells are different
// or the sizes or colors are different:
const haveCellsChanged = (prevCells: ITreeMapCell[], nextCells: ITreeMapCell[]): boolean => {
  const prevCellsLength = prevCells.length;
  const nextCellsLength = nextCells.length;
  if (prevCellsLength !== nextCellsLength) {
    return true;
  } else {
    for (let i = 0; i < prevCellsLength; i += 1) {
      const prevCell = prevCells[i];
      const nextCell = nextCells[i];
      if (prevCell.value !== nextCell.value ||
            prevCell.id !== nextCell.id ||
            prevCell.color !== nextCell.color) {
        return true;
      }
    }
    return false;
  }
};

const setupWebGL = (input: {
    numCellsTier: NumCellsTier
    canvasRef: MutableRefObject<HTMLCanvasElement | null>
    glInfoRef: MutableRefObject<IGLInfo | undefined>
    cellProgramRef: MutableRefObject<IProgramInfo | undefined>,
  }) => {

  const {
    numCellsTier,
    canvasRef: {current: canvas},
    glInfoRef, cellProgramRef,
  } = input;
  if (canvas !== null) {
    const gl = canvas.getContext('webgl', {alpha: false});
    if (gl === null) {
      console.warn('WebGL not available');
      glInfoRef.current = undefined;
    } else {
      const vaoExtension = gl.getExtension('OES_vertex_array_object');
      const instancedDrawingExtension = gl.getExtension('ANGLE_instanced_arrays');

      const cellBuffer = createCellsBuffer(numCellsTier);

      let timerExtension: EXTDisjointTimerQuery | null = null;
      if (process.env.NODE_ENV !== 'production') {
        timerExtension = gl.getExtension('EXT_disjoint_timer_query');
      }

      if (vaoExtension === null || instancedDrawingExtension === null) {
        if (vaoExtension === null) {
          console.warn('OES_vertex_array_object extension not available.');
        }
        if (instancedDrawingExtension === null) {
          console.warn('ANGLE_instanced_arrays extension not available');
        }
        glInfoRef.current = undefined;
      } else {
        const cellsVAO = vaoExtension.createVertexArrayOES();

        if (cellsVAO === null) {
          throw new Error('Cannot create vertex array for cells');
        }

        const {
          buffer: cellGLBuffer,
          rebindBuffer: rebindGLBuffer,
        } = createPopulatedGLBuffer(gl, cellBuffer);

        cellProgramRef.current = getProgramInfo({
          version: WebGLVersion.One,
          gl,
          vertexShader: raw('./rectangle.vert'),
          fragmentShader: raw('./rectangle.frag'),
          attributes: [{
            name: 'referencePosition',
            numFloatsPerVertex: 2,
            buffer: {
              type: AttributeBufferRequestType.Implicit,
              totalSizeAsNumOfFloats: rectangleReferencePositionValues.length,
            },
            stride: 0,
            offset: 0,
            isInstanced: false,
          }, {
            name: 'initialTopLeft',
            numFloatsPerVertex: 2,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 0,
            isInstanced: true,
          }, {
            name: 'finalTopLeft',
            numFloatsPerVertex: 2,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 2 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }, {
            name: 'initialBottomRight',
            numFloatsPerVertex: 2,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 4 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }, {
            name: 'finalBottomRight',
            numFloatsPerVertex: 2,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 6 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }, {
            name: 'initialColor',
            numFloatsPerVertex: 4,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 8 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }, {
            name: 'finalColor',
            numFloatsPerVertex: 4,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 12 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }, {
            name: 'halfStrokeWidth',
            numFloatsPerVertex: 1,
            buffer: {type: AttributeBufferRequestType.Explicit, buffer: cellGLBuffer},
            stride: numFloatsPerCellInstance * GL_NUM_BYTES_PER_FLOAT,
            offset: 16 * GL_NUM_BYTES_PER_FLOAT,
            isInstanced: true,
          }],
          uniforms: ['canvasSize', 'tweenProgress'],
          indexBuffer: {elementType: IndexElementType.Int16, totalSizeAsNumOfInts: rectangleIndicesCount},
          vaoObject: cellsVAO,
          vaoExtension,
          instancedDrawingExtension,
        });

        glInfoRef.current = {
          gl, vaoExtension, timerExtension, instancedDrawingExtension, cellsVAO,
          cellBuffer, cellGLBuffer, rebindGLBuffer,
        };
      }
    }
  }
};

const setWidthHeightInCSSPixels = (input: {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    widthInCSSPixelsRef: MutableRefObject<number | undefined>,
    heightInCSSPixelsRef: MutableRefObject<number | undefined>,
  }) => {

  const {
    canvasRef: {current: canvas},
    widthInCSSPixelsRef, heightInCSSPixelsRef,
  } = input;

  if (canvas !== null) {
    const {width, height} = canvas.getBoundingClientRect();
    widthInCSSPixelsRef.current = width;
    heightInCSSPixelsRef.current = height;
  }
};

const upgradeToLargeBuffer = (glInfo: IGLInfo) => {
  const newCellBuffer = createCellsBuffer(NumCellsTier.Large);
  newCellBuffer.copyFrom(glInfo.cellBuffer);
  glInfo.cellBuffer = newCellBuffer;
  glInfo.rebindGLBuffer(newCellBuffer);
};

type IMonitoredProps = Pick<
  IProps,
  'cells' | 'highlighted' | 'numCellsTier' | 'chartContainerHeight' | 'chartContainerWidth'
>;

interface IPropsChangeHandlerExtraInputs {
  rootElRef: MutableRefObject<HTMLDivElement | null>;
  glInfoRef: MutableRefObject<IGLInfo | undefined>;
  cellProgramRef: MutableRefObject<IProgramInfo | undefined>;
  statusRef: MutableRefObject<Status>;
  domPoolRef: MutableRefObject<DOMPool>;
  upgradeToLargeBufferRef: MutableRefObject<typeof upgradeToLargeBuffer>;
  sendHeroElementTimingOnceRef: MutableRefObject<typeof sendHeroElementTiming>;
}

const performPropsChange =
  (input: PropsChangeHandlerInput<IPropsChangeHandlerExtraInputs, IMonitoredProps>) => {

  const {
    nextValue,
    extraInputs: {
      rootElRef: {current: rootEl},
      glInfoRef: {current: glInfo},
      cellProgramRef: {current: cellProgram},
      statusRef: {current: prevStatus}, statusRef,
      domPoolRef,
      upgradeToLargeBufferRef: {current: upgradeBuffer},
      sendHeroElementTimingOnceRef: {current: sendHeroElementTimingOnce},
    },
    done,
  } = input;

  const prevValue = (input.prevValue === undefined) ? nextValue : input.prevValue;
  const hasChartSizeChanged =
    (nextValue.chartContainerHeight !== prevValue.chartContainerHeight ||
    nextValue.chartContainerWidth !== prevValue.chartContainerWidth) &&
    (nextValue.chartContainerHeight !== undefined && nextValue.chartContainerWidth !== undefined);

  if (hasChartSizeChanged && glInfo !== undefined) {
    const {gl} = glInfo;
    resizeViewport(gl, true);
  }

  const {
    chartContainerHeight, chartContainerWidth,
  } = nextValue;

  if (glInfo !== undefined && cellProgram !== undefined && rootEl !== null) {

    if (hasChartSizeChanged === true ||
        // This is true on the very first render:
        (input.prevValue === undefined) ||
        // This is true when the data changes on subsequent renders:
        (input.prevValue !== undefined &&
          (haveCellsChanged(prevValue.cells, nextValue.cells)) ||
            prevValue.highlighted !== nextValue.highlighted)
      ) {

      if (nextValue.numCellsTier !== prevValue.numCellsTier &&
            prevValue.numCellsTier === NumCellsTier.Small &&
            nextValue.numCellsTier === NumCellsTier.Large) {

        upgradeBuffer(glInfo);
      }

      const {
        gl, vaoExtension,
        instancedDrawingExtension,
        cellsVAO,
        cellBuffer, cellGLBuffer,
      } = glInfo;
      if (prevStatus.status === AnimationStatus.FinishedCompletely ||
          prevStatus.status === AnimationStatus.Initial) {

        let prevCells: Map<string, ICellInternal>, prevKeys: string[];
        let prevTextContainer: HTMLElement, prevAttachedDOMNodes: HTMLElement[];
        if (prevStatus.status === AnimationStatus.FinishedCompletely) {
          prevCells = prevStatus.currentCells;
          prevKeys = prevStatus.currentKeys;
          prevTextContainer = prevStatus.currentTextContainer;
          prevAttachedDOMNodes = prevStatus.currentAttachedDOMNodes;
        } else if (prevStatus.status === AnimationStatus.Initial) {
          prevCells = new Map();
          prevKeys = [];
          prevTextContainer = document.createElement('div');
          prevAttachedDOMNodes = [];

          // Bind non-instanced attributes and indices for the 2 vertex shaders.
          // This only needs to happen once because they never change:
          vaoExtension.bindVertexArrayOES(cellsVAO);
          sendAttributesToGPUWithVAO({
            gl, programInfo: cellProgram,
            attributeName: 'referencePosition',
            data: new Float32Array(rectangleReferencePositionValues),
          });
          sendIndicesToGPUWithVAO({
            gl, programInfo: cellProgram, data: new Uint16Array(rectangleIndices),
          });

          vaoExtension.bindVertexArrayOES(null);

          gl.disable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.clearColor(1, 1, 1, 1);
        } else {
          failIfValidOrNonExhaustive(prevStatus, 'Invalid status type');
          // These lines will never be executed:
          prevCells = new Map();
          prevKeys = [];
          prevTextContainer = undefined as any;
          prevAttachedDOMNodes = [];
        }

        const {cells, highlighted} = nextValue;
        const {nextKeys, nextCells} = convertToInternalCells(cells, highlighted);
        const updatePattern = getUpdatePattern(prevKeys, nextKeys);
        const cellsInfo = writeToCellBuffers(
          prevCells, nextCells, updatePattern, halfStrokeWidth, normalizedStrokeColor, cellBuffer,
        );
        // Update vertex data for cells:
        updateGLBuffer({gl, buffer: cellGLBuffer, data: cellBuffer.getMeaningfulData()});

        // `false` means the next update actually has no data to show so we should skip the animation:
        const doesNextUpdateHaveData = nextValue.cells.length > 0;

        let nextXIntervalTree: IntervalTree<string>, nextYIntervalTree: IntervalTree<string>;
        if ((doesNextUpdateHaveData && nextValue.cells !== prevValue.cells) ||
            prevStatus.status === AnimationStatus.Initial) {

          const intervalTrees = getIntervalTrees(nextKeys, nextCells, createIntervalTree);
          nextXIntervalTree = intervalTrees.xIntervalTree;
          nextYIntervalTree = intervalTrees.yIntervalTree;
        } else {
          nextXIntervalTree = prevStatus.xIntervalTree;
          nextYIntervalTree = prevStatus.yIntervalTree;
        }

        const tweenTarget = {tweenProgress: 0};

        const timeline = new TimelineLite({paused: true});
        const timelineStartTime = 0;

        let textContainerStatus: TextContainerTransitionStatus;
        if (nextValue.cells !== prevValue.cells ||
            prevStatus.status === AnimationStatus.Initial) {
          const {
            rootNode, fragment, allCurrentlyAttachedDOMNodes,
          } = getTextLabelFragment(nextCells, updatePattern, prevAttachedDOMNodes, domPoolRef.current);
          textContainerStatus = {
            isTextContainerChanging: true,
            prevAttachedDOMNodes,
            prevContainer: prevTextContainer,
            nextAttachedDOMNodes: allCurrentlyAttachedDOMNodes,
            nextContainer: rootNode,
            fragment,
          };
        } else {
          textContainerStatus = {
            isTextContainerChanging: false,
            currentAttachedDOMNodes: prevAttachedDOMNodes,
            currentTextContainer: prevTextContainer,
          };
        }
        if (textContainerStatus.isTextContainerChanging === true) {
          timeline.set(textContainerStatus.nextContainer, {css: {opacity: 1}}, durationInSeconds / 2);
          timeline.set(textContainerStatus.prevContainer, {css: {opacity: 0}}, timelineStartTime);
        }

        const setupVisibleDraw = (inputWidth: number, inputHeight: number) => {
          gl.useProgram(cellProgram.program);
          gl.uniform2f(cellProgram.uniforms.canvasSize, inputWidth, inputHeight);

          vaoExtension.bindVertexArrayOES(cellsVAO);
        };

        const onAnimationUpdate = () => {
          const {tweenProgress} = tweenTarget;

          gl.uniform1f(cellProgram.uniforms.tweenProgress, tweenProgress);
          // tslint:disable-next-line:no-bitwise
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          instancedDrawingExtension.drawElementsInstancedANGLE(
            gl.TRIANGLES, rectangleIndicesCount, cellProgram.indexBuffer.elementType, 0, cellsInfo.instancesCount,
          );
        };

        const reportHeroElementTimingIfNeeded = () => {
          if (chartContainerHeight !== undefined &&
                chartContainerWidth !== undefined && cells.length > 0) {
            sendHeroElementTimingOnce('tree map');
          }
        };

        const onAnimationComplete = () => {
          vaoExtension.bindVertexArrayOES(null);

          const endProspChangeTransition = () => {
            reportHeroElementTimingIfNeeded();

            statusRef.current = {
              status: AnimationStatus.FinishedCompletely,
              // cells related:
              currentCells: nextCells,
              currentKeys: nextKeys,
              cellIndicesCount: rectangleIndicesCount,
              cellInstancesCount: cellsInfo.instancesCount,
              // Text related:
              currentTextContainer: newTextContainer,
              currentAttachedDOMNodes: newAttachedDOMNOdes,
              // Hit test related:
              xIntervalTree: nextXIntervalTree,
              yIntervalTree: nextYIntervalTree,
            };

            done();
          };
          let newAttachedDOMNOdes: HTMLElement[], newTextContainer: HTMLElement;
          if (textContainerStatus.isTextContainerChanging === true) {
            newAttachedDOMNOdes = textContainerStatus.nextAttachedDOMNodes;
            newTextContainer = textContainerStatus.nextContainer;
            const domNodesToRemove = textContainerStatus.prevAttachedDOMNodes;
            const textContainerToRemove = textContainerStatus.prevContainer;
            requestAnimationFrame(() => {
              const domPool = domPoolRef.current;
              const prevAttachedDOMNodesLength = domNodesToRemove.length;
              textContainerToRemove.remove();
              for (let j = 0; j < prevAttachedDOMNodesLength; j += 1) {
                domPool.enqueue(domNodesToRemove[j]);
              }
              endProspChangeTransition();
            });

          } else {
            newAttachedDOMNOdes = textContainerStatus.currentAttachedDOMNodes;
            newTextContainer = textContainerStatus.currentTextContainer;
            endProspChangeTransition();
          }
        };
        const animationTween = TweenLite.to(tweenTarget, durationInSeconds, {
          tweenProgress: 1,
          ease: 'Cubic.easeOut',
          onUpdate: onAnimationUpdate,
          onComplete: onAnimationComplete,
        });
        timeline.add(animationTween, timelineStartTime);

        statusRef.current = {
          status: AnimationStatus.InProgress, timeline,
        };
        setupVisibleDraw(nextValue.chartContainerWidth, nextValue.chartContainerHeight);
        if (doesNextUpdateHaveData === true) {
          requestAnimationFrame(() => {
            if (textContainerStatus.isTextContainerChanging === true) {
              rootEl.appendChild(textContainerStatus.fragment);
            }

            // If there's nothing to render in `nextProps` (usually due to error
            // or all categories deselected), we want to just clear the screen
            // instead of going through a draw operation:
            requestAnimationFrame(() => {
              timeline.play();
            });
          });

        } else {
          gl.clearColor(1, 1, 1, 1);
          // tslint:disable-next-line:no-bitwise
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          onAnimationComplete();
        }

      }
    } else {
      done();
    }
  } else {
    done();
  }
};
const performHitTest = (input: {
    status: Status,
    mouseClientX: number | undefined,
    mouseClientY: number | undefined,
    canvas: HTMLCanvasElement | null,
    chartWidth: number | undefined,
    chartHeight: number | undefined,
  }) => {

  const {
    status,
    mouseClientX, mouseClientY,
    canvas, chartWidth, chartHeight,
  } = input;
  if (mouseClientX !== undefined && mouseClientY !== undefined && canvas !== null &&
      chartWidth !== undefined && chartHeight !== undefined) {
    if (status.status === AnimationStatus.FinishedCompletely) {
      const {top, left} = canvas.getBoundingClientRect();
      const {xIntervalTree, yIntervalTree} = status;
      const relativeX = mouseClientX - left;
      const relativeY = mouseClientY - top;

      const searchResult = searchForHits(
        xIntervalTree, yIntervalTree, chartWidth, chartHeight, relativeX, relativeY,
      );
      return searchResult;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

};

const getUnthrottledHoverHandler = (input: {
    statusRef: MutableRefObject<Status>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    isTransitionInProgress: () => boolean,
    onMouseOverCellRef: MutableRefObject<IProps['onMouseOverCell']>,
    onMouseLeaveChartRef: MutableRefObject<IProps['onMouseLeaveChart']>,
    chartWidthRef: MutableRefObject<IProps['chartContainerWidth']>
    chartHeightRef: MutableRefObject<IProps['chartContainerHeight']>

    // Note: need to update these refs every time before invoking the throttled
    // version of `performHover`:
    mouseClientXRef: MutableRefObject<number | undefined>,
    mouseClientYRef: MutableRefObject<number | undefined>,
  }) => {

  const {
    onMouseLeaveChartRef, onMouseOverCellRef, canvasRef,
    mouseClientXRef, mouseClientYRef,
    chartWidthRef, chartHeightRef,
    statusRef, isTransitionInProgress,
  } = input;

  let hoveredNode: string | undefined;

  return () => {
    const {current: status} = statusRef;
    if (isTransitionInProgress() === false && status.status === AnimationStatus.FinishedCompletely) {
      const prevHoveredNode = hoveredNode;
      const {current: chartWidth} = chartWidthRef;
      const {current: chartHeight} = chartHeightRef;
      if (chartWidth !== undefined && chartHeight !== undefined) {
        const nextHoveredNode = performHitTest({
          status,
          mouseClientX: mouseClientXRef.current,
          mouseClientY: mouseClientYRef.current,
          canvas: canvasRef.current,
          chartWidth,
          chartHeight,
        });
        hoveredNode = nextHoveredNode;
        const {current: onMouseOverCell} = onMouseOverCellRef;
        const {current: onMouseLeaveChart} = onMouseLeaveChartRef;
        if (nextHoveredNode !== prevHoveredNode) {
          if (prevHoveredNode === undefined && nextHoveredNode !== undefined) {
            onMouseOverCell(nextHoveredNode);
          } else if (prevHoveredNode !== undefined && nextHoveredNode === undefined) {
            onMouseLeaveChart();
          } else if (prevHoveredNode !== undefined && nextHoveredNode !== undefined) {
            onMouseOverCell(nextHoveredNode);
          }
        }
      }
    }
  };

};

export interface IProps {
  highlighted: string | undefined;
  cells: ITreeMapCell[];

  numCellsTier: NumCellsTier;

  chartContainerWidth: number ;
  chartContainerHeight: number;

  onCellClick: (id: string) => void;
  onMouseOverCell: (id: string) => void;
  onMouseLeaveChart: () => void;
}

export default (props: IProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<Status>({status: AnimationStatus.Initial});
  const glInfoRef = useRef<IGLInfo | undefined>(undefined);
  const cellProgramRef = useRef<IProgramInfo | undefined>(undefined);
  const domPoolRef = useRef<DOMPool>(new DOMPool(1000, 'div'));
  const rootElRef = useRef<HTMLDivElement | null>(null);

  const upgradeToLargeBufferRef = useRef(once(upgradeToLargeBuffer));
  const sendHeroElementTimingOnceRef = useRef(once(sendHeroElementTiming));

  const {
    numCellsTier, cells, highlighted,
    chartContainerHeight, chartContainerWidth,
  } = props;

  const chartWidthRef = useTrackingRef(chartContainerWidth);
  const chartHeightRef = useTrackingRef(chartContainerHeight);
  const onMouseOverCellRef = useTrackingRef(props.onMouseOverCell);
  const onMouseLeaveChartRef = useTrackingRef(props.onMouseLeaveChart);

  useEffect(() => {
    setupWebGL({numCellsTier, canvasRef, glInfoRef, cellProgramRef});
    const {current: glInfo} = glInfoRef;
    if (props.chartContainerWidth !== undefined &&
        props.chartContainerHeight !== undefined &&
        glInfo !== undefined) {
      const {gl} = glInfo;
      setWidthHeightInCSSPixels({
        canvasRef,
        widthInCSSPixelsRef: chartWidthRef,
        heightInCSSPixelsRef: chartHeightRef,
      });
      resizeViewport(gl, true);
    }

    return () => {
      const {current: innerGLInfo} = glInfoRef;
      const {current: status} = statusRef;
      if (innerGLInfo !== undefined) {
        if (status.status === AnimationStatus.InProgress) {
          const {timeline} = status;
          (timeline as any).stop();
        }
        const {gl, cellGLBuffer} = innerGLInfo;
        innerGLInfo.cellBuffer = null as any;
        gl.deleteBuffer(cellGLBuffer);
      }
    };
  }, []);

  const {
    isTransitionInProgress,
  } = usePropsChangeRateLimiter<IPropsChangeHandlerExtraInputs, IMonitoredProps>({
    value: {
      cells, highlighted, numCellsTier,
      chartContainerHeight, chartContainerWidth,
    },
    getExtraInputToPropsChangeHandler: () => ({
      glInfoRef, cellProgramRef,
      widthInCSSPixelsRef: chartWidthRef,
      heightInCSSPixelsRef: chartHeightRef,
      statusRef, domPoolRef, upgradeToLargeBufferRef, sendHeroElementTimingOnceRef,
      rootElRef,
    }),
    performPropsChange,
  });

  const mouseClientXRef = useRef<number | undefined>(undefined);
  const mouseClientYRef = useRef<number | undefined>(undefined);

  const unthrottledHoverHandler = getUnthrottledHoverHandler({
    statusRef, canvasRef, isTransitionInProgress,
    onMouseOverCellRef, onMouseLeaveChartRef, chartWidthRef, chartHeightRef,
    mouseClientXRef, mouseClientYRef,
  });

  // We perform hover hit test at 20fps:
  const throttledPerformHoverRef = useRef(
    throttle(unthrottledHoverHandler, millisecondsPerSeconds / hoverContinuousHitTestFrameRate),
  );

  const onMouseLeave = () => {
    const {current: throttledHover} = throttledPerformHoverRef;
    throttledHover.cancel();
    props.onMouseLeaveChart();
  };

  const onMouseMove = ({clientX, clientY}: React.MouseEvent<any>) => {
    mouseClientXRef.current = clientX;
    mouseClientYRef.current = clientY;
    const {current: throttledPerformHover} = throttledPerformHoverRef;
    if (isTransitionInProgress() === false) {
      throttledPerformHover();
    }
  };

  const onClick = () => {
    if (isTransitionInProgress() === false) {
      const {current: status} = statusRef;
      if (status.status === AnimationStatus.FinishedCompletely) {
        const result = performHitTest({
          status,
          mouseClientX: mouseClientXRef.current,
          mouseClientY: mouseClientYRef.current,
          canvas: canvasRef.current,
          chartWidth: chartContainerWidth,
          chartHeight: chartContainerHeight,
        });
        if (result !== undefined) {
          props.onCellClick(result);
        }
      }
    }

  };

  return (
    <Root ref={rootElRef}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      onClick={onClick}
      style={{width: props.chartContainerWidth, height: chartContainerHeight}}
    >
      <canvas
        ref={canvasRef}
        style={{width: props.chartContainerWidth, height: chartContainerHeight}}
      />
    </Root>
  );

};
