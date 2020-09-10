import color from 'color';
import intervalTreeDefaultExport, {
  Interval,
  IntervalTree,
} from 'interval-tree-1d';
import {
  desaturate,
} from 'polished';
import {
  ColorQuadruplet,
  ColorTriplet,
  IUpdatePatternItem,
  normalizeColorTriplet,
  PersistentFloat32Array,
  UpdateType,
} from './webglUtils';
import {
  failIfValidOrNonExhaustive,
} from './Utils';
import {
  ITreeMapCell,
  TextLayout,
} from './otherTypes';

export enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

export const transitionDuration = 350; // in ms;

export interface ICellInternal {
  id: string;
  fillColor: ColorQuadruplet;
  strokeOpacity: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  textLayout: TextLayout;
  isComparisonCell: boolean;
}

const getColorTripletFromColorString =
  (colorString: string) => normalizeColorTriplet(color(colorString).rgb().array() as ColorTriplet);

export const convertToInternalCells =
  (cellList: ITreeMapCell[], highlighted: string | undefined) => {

  const nextCells: Map<string, ICellInternal> = new Map();
  const nextKeys: string[] = [];

  const cellListLength = cellList.length;
  const someCellHighlighted = (highlighted !== undefined);
  for (let i = 0; i < cellListLength; i += 1) {
    const cell = cellList[i];
    const id = cell.id;
    const x0 = cell.x0;
    const y0 = cell.y0;
    const x1 = cell.x1;
    const y1 = cell.y1;
    const isComparisonCell = cell.comparison ? true : false;
    const textLayout = cell.textLayout;
    const retrievedColor = cell.color;

    const colorTriplet: ColorTriplet = (someCellHighlighted && highlighted !== id) ?
                                        getColorTripletFromColorString(desaturate(0.3, retrievedColor)) :
                                        getColorTripletFromColorString(retrievedColor);
    const colorQuadruplet = [colorTriplet[0], colorTriplet[1], colorTriplet[2], 1] as ColorQuadruplet;
    const internalCell: ICellInternal = {
      id, x0, y0, x1, y1, textLayout,
      fillColor: colorQuadruplet,
      strokeOpacity: 1,
      isComparisonCell,
    };
    nextKeys.push(id);
    nextCells.set(id, internalCell);
  }
  return {
    nextCells, nextKeys,
  };
};

export const rectangleReferencePositionValues = [
  // top left:
  1, 1,
  // top right:
  0, 1,
  // bottom right:
  0, 0,
  // bottom left:
  1, 0,
];

export const rectangleIndices = [
  1, 0, 2,
  2, 0, 3,
];
export const rectangleIndicesCount = rectangleIndices.length;

export const numFloatsPerCellInstance = 17;

export const writeToCellBuffers = (
    prevCells: Map<string, ICellInternal>,
    nextCells: Map<string, ICellInternal>,
    updatePattern: IUpdatePatternItem[],
    halfStrokeWidth: number,
    strokeColor: ColorQuadruplet,
    cellBuffer: PersistentFloat32Array,
  ) => {

  const updatePatternLength = updatePattern.length;

  const numInstancesPerCell = 2;
  const actualBuffer = cellBuffer.buffer;
  const numFloatsPerCell = numFloatsPerCellInstance * numInstancesPerCell;
  cellBuffer.length = updatePatternLength * numFloatsPerCell;

  for (let i = 0; i < updatePatternLength; i += 1) {
    const {key, type} = updatePattern[i];
    let initialTopLeftX: number, initialTopLeftY: number;
    let finalTopLeftX: number, finalTopLeftY: number;
    let initialBottomRightX: number, initialBottomRightY: number;
    let finalBottomRightX: number, finalBottomRightY: number;
    let initialFillColor: ColorQuadruplet, finalFillColor: ColorQuadruplet;
    let initialStrokeColor: ColorQuadruplet, finalStrokeColor: ColorQuadruplet;
    let strokeWidth: number;

    if (type === UpdateType.Enter) {
      const cell = nextCells.get(key)!;
      initialTopLeftX = finalTopLeftX = cell.x0;
      initialTopLeftY = finalTopLeftY = cell.y0;
      initialBottomRightX = finalBottomRightX = cell.x1;
      initialBottomRightY = finalBottomRightY = cell.y1;

      const {fillColor, isComparisonCell} = cell;
      initialFillColor = fillColor.slice(0) as ColorQuadruplet;
      initialFillColor[3] = 0;
      finalFillColor = fillColor.slice(0) as ColorQuadruplet;

      initialStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      initialStrokeColor[3] = 0;
      finalStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      strokeWidth = isComparisonCell ? 0 : halfStrokeWidth;

    } else if (type === UpdateType.Exit) {
      const cell = prevCells.get(key)!;
      initialTopLeftX = finalTopLeftX = cell.x0;
      initialTopLeftY = finalTopLeftY = cell.y0;
      initialBottomRightX = finalBottomRightX = cell.x1;
      initialBottomRightY = finalBottomRightY = cell.y1;

      const {fillColor, strokeOpacity, isComparisonCell} = cell;

      initialFillColor = fillColor.slice(0) as ColorQuadruplet;
      finalFillColor = fillColor.slice(0) as ColorQuadruplet;
      finalFillColor[3] = 0;

      initialStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      initialStrokeColor[3] = strokeOpacity;
      finalStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      finalStrokeColor[3] = 0;
      strokeWidth = isComparisonCell ? 0 : halfStrokeWidth;

    } else if (type === UpdateType.Update) {
      const prevCell = prevCells.get(key)!;
      const nextCell = nextCells.get(key)!;
      ({
        x0: initialTopLeftX, y0: initialTopLeftY, x1: initialBottomRightX, y1: initialBottomRightY,
        /* tslint:disable-next-line:trailing-comma */
        fillColor: initialFillColor
      } = prevCell);
      ({
        x0: finalTopLeftX, y0: finalTopLeftY, x1: finalBottomRightX, y1: finalBottomRightY,
        /* tslint:disable-next-line:trailing-comma */
        fillColor: finalFillColor
      } = nextCell);

      initialStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      initialStrokeColor[3] = prevCell.strokeOpacity;

      finalStrokeColor = strokeColor.slice(0) as ColorQuadruplet;
      finalStrokeColor[3] = nextCell.strokeOpacity;
      strokeWidth = halfStrokeWidth;

    } else {
      failIfValidOrNonExhaustive(type, 'Invalid update type');
      // These lines will never execute:
      initialTopLeftX = finalTopLeftX = 0;
      initialTopLeftY = finalTopLeftY = 0;
      initialBottomRightX = finalBottomRightX = 0;
      initialBottomRightY = finalBottomRightY = 0;
      initialFillColor = finalFillColor = [0, 0, 0, 0];
      initialStrokeColor = finalStrokeColor = [0, 0, 0, 0];
      strokeWidth = halfStrokeWidth;
    }

    // Add the position values twice because they are shared by the fill and stroke rectangles:
    for (let j = 0; j < numFloatsPerCellInstance; j += 1) {
      // initialTopLeft
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j] = initialTopLeftX;
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 1] = initialTopLeftY;

      // finalTopLeft
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 2] = finalTopLeftX;
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 3] = finalTopLeftY;

      // initialBottomRight:
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 4] = initialBottomRightX;
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 5] = initialBottomRightY;

      // finalBottomRight:
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 6] = finalBottomRightX;
      actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance * j + 7] = finalBottomRightY;
    }

    let numFloatsSetPerInstanceSoFar = 8;

    // Assign stroke color to first instance:
    for (let k = 0; k < 4; k += 1) {
      actualBuffer[numFloatsPerCell * i + numFloatsSetPerInstanceSoFar + k] = initialStrokeColor[k];
      actualBuffer[numFloatsPerCell * i + numFloatsSetPerInstanceSoFar + 4 + k] = finalStrokeColor[k];
    }

    // Assign fill color to second instance:
    for (let m = 0; m < 4; m += 1) {
      actualBuffer[
        numFloatsPerCell * i + numFloatsPerCellInstance + numFloatsSetPerInstanceSoFar + m
      ] = initialFillColor[m];
      actualBuffer[
        numFloatsPerCell * i + numFloatsPerCellInstance + numFloatsSetPerInstanceSoFar + 4 + m
      ] = finalFillColor[m];
    }

    numFloatsSetPerInstanceSoFar = 16;
    // Set `halfStrokeWidth` to 0 for first instance (stroke):
    actualBuffer[numFloatsPerCell * i + numFloatsSetPerInstanceSoFar] = 0;
    // Set `halfStrokeWidth` to `halfStrokeWidth` for first instance (fill):
    actualBuffer[numFloatsPerCell * i + numFloatsPerCellInstance + numFloatsSetPerInstanceSoFar] = strokeWidth;
  }

  return {
    instancesCount: updatePatternLength * 2,
  };
};

export const getIntervalTrees = (
    nextKeys: string[],
    nextCells: Map<string, ICellInternal>,
    // Need to do this because doing this
    // `import createIntervalTree from 'interval-tree-1d`
    // works in TypeScript but not in jest so we need to import the module separately
    // in the typescript and jest worlds.
    // TODO: figure out why there's discrepancy between how jest and typescript produces
    // different import calls
    createIntervalTree: typeof intervalTreeDefaultExport,
  ) => {

  const nextKeysLength = nextKeys.length;
  const xIntervals: Array<Interval<string>> = [];
  const yIntervals: Array<Interval<string>> = [];
  for (let i = 0; i < nextKeysLength; i += 1) {
    const cell = nextCells.get(nextKeys[i])!;
    const id = cell.id;
    const x0 = cell.x0;
    const y0 = cell.y0;
    const x1 = cell.x1;
    const y1 = cell.y1;

    const xInterval: Interval<string> = [x0, x1, id];
    const yInterval: Interval<string> = [y0, y1, id];
    xIntervals.push(xInterval);
    yIntervals.push(yInterval);
  }

  return {
    xIntervalTree: createIntervalTree(xIntervals),
    yIntervalTree: createIntervalTree(yIntervals),
  };
};

export const searchForHits = (
    xIntervalTree: IntervalTree<string>,
    yIntervalTree: IntervalTree<string>,
    xMax: number,
    yMax: number,
    xTarget: number,
    yTarget: number,
  ) => {

  if (xTarget < 0 || xTarget > xMax || yTarget < 0 || yTarget > yMax) {
    return undefined;
  }  else {
    const xMatchIds: string[] = [];
    xIntervalTree.queryPoint(xTarget, (interval: Interval<string>) => {
      xMatchIds.push(interval[2]);
      return undefined;
    });

    const yMatchIds: string[] = [];
    yIntervalTree.queryPoint(yTarget, (interval: Interval<string>) => {
      yMatchIds.push(interval[2]);
      return undefined;
    });

    const numXMatches = xMatchIds.length;
    const numYMatches = yMatchIds.length;

    for (let i = 0; i < numXMatches; i += 1) {
      const xId = xMatchIds[i];
      for (let j = 0; j < numYMatches; j += 1) {
        const yId = yMatchIds[j];
        if (xId === yId) {
          return xId;
        }
      }
    }
    return undefined;
  }
};
