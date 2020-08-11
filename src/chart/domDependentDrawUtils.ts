import Pool from './DOMPool';
import {
  IUpdatePatternItem,
  UpdateType,
} from './webglUtils';
import {
  ICellInternal,
} from './domIndependentDrawUtils';
import {
  TextLayoutType,
} from './otherTypes';
import {
  heightProportionReservedForShare,
  labelHorizontalMargin,
  labelTopMargin,
} from './transformUtils';

interface ITextElemStyles {
  className: string;
  textContent: string;
  top: string;
  left: string;
  width: string;
  height: string;
  fontSize: string;
  paddingTop: string;
  paddingLeft: string;
  paddingRight: string;
}

const applyStyleToDOMNode = (domNode: HTMLElement, textStyle: ITextElemStyles) => {
  domNode.className = textStyle.className;
  domNode.textContent = textStyle.textContent;
  domNode.style.top = textStyle.top;
  domNode.style.left = textStyle.left;
  domNode.style.width = textStyle.width;
  domNode.style.height = textStyle.height;
  domNode.style.fontSize = textStyle.fontSize;
  domNode.style.paddingTop = textStyle.paddingTop;
  domNode.style.paddingLeft = textStyle.paddingLeft;
  domNode.style.paddingRight = textStyle.paddingRight;
};

export const getTextLabelFragment = (
    nextCells: Map<string, ICellInternal>,
    updatePattern: IUpdatePatternItem[],
    allCurrentlyAttachedDOMNodes: HTMLElement[],
    pool: Pool,
  ) => {

  const childrenNodes: HTMLElement[] = [];
  const updatePatternLength = updatePattern.length;
  for (let i = 0; i < updatePatternLength; i += 1) {
    const {key, type} = updatePattern[i];
    if (type === UpdateType.Enter || type === UpdateType.Update) {
      const {textLayout, x0, y0, x1, y1} = nextCells.get(key)!;
      const cellWidth = x1 - x0;
      const cellHeight = y1 - y0;
      const generalClassName = 'react-canvas-tree-map-container';
      const percentageClassName = 'react-canvas-tree-map-container react-canvas-tree-map-percentage';
      if (textLayout.type === TextLayoutType.ShowBoth) {
        const {label, share} = textLayout;

        const heightAvailableForLabel = cellHeight * (1 - heightProportionReservedForShare);

        if (label.showText === true) {
          let paddingTop: string, horizontalPadding: string;
          if (label.useMargin === true) {
            paddingTop = `${labelTopMargin * cellHeight}px`;
            horizontalPadding = `${labelHorizontalMargin * cellWidth}px`;
          } else {
            paddingTop = '0';
            horizontalPadding = '0';
          }

          const labelElem = pool.dequeue();
          applyStyleToDOMNode(labelElem, {
            className: generalClassName,
            textContent: label.textUnsplit,
            top: `${y0}px`,
            left: `${x0}px`,
            width: `${cellWidth}px`,
            height: `${heightAvailableForLabel}px`,
            fontSize: `${label.fontSize}px`,
            paddingTop,
            paddingLeft: horizontalPadding,
            paddingRight: horizontalPadding,
          });
          childrenNodes.push(labelElem);
        }

        if (share.showText === true) {
          const heightAvailableForPercentage = cellHeight * heightProportionReservedForShare;
          const top = y0 + heightAvailableForLabel;

          const shareElem = pool.dequeue();
          applyStyleToDOMNode(shareElem, {
            className: percentageClassName,
            textContent: share.text,
            top: `${top}px`,
            left: `${x0}px`,
            width: `${cellWidth}px`,
            height: `${heightAvailableForPercentage}px`,
            fontSize: `${share.fontSize}px`,
            paddingTop: '',
            paddingLeft: '',
            paddingRight: '',
          });
          childrenNodes.push(shareElem);
        }
      } else if (textLayout.type === TextLayoutType.ShowOnlyShare) {
        const {share} = textLayout;
        if (share.showText === true) {

          const shareElem = pool.dequeue();
          applyStyleToDOMNode(shareElem, {
            className: percentageClassName,
            textContent: share.text,
            top: `${y0}px`,
            left: `${x0}px`,
            width: `${cellWidth}px`,
            height: `${cellHeight}px`,
            fontSize: `${share.fontSize}px`,
            paddingTop: '',
            paddingLeft: '',
            paddingRight: '',
          });
          childrenNodes.push(shareElem);
        }
      }
    }
  }
  const fragment = document.createDocumentFragment();
  const rootNode = document.createElement('div');
  rootNode.className = 'react-canvas-tree-map-masterContainer';

  const childrenNodesLength = childrenNodes.length;
  for (let j = 0; j < childrenNodesLength; j += 1) {
    rootNode.appendChild(childrenNodes[j]);
  }

  fragment.appendChild(rootNode);

  allCurrentlyAttachedDOMNodes = allCurrentlyAttachedDOMNodes.concat(childrenNodes);

  return {
    fragment, rootNode, allCurrentlyAttachedDOMNodes,
  };
};
