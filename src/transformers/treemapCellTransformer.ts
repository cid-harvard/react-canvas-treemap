import sum from 'lodash/sum';
import {formatPercentage } from './numberFormatters';
import addTextLayout from '../chart/addTextLayout';
import {
  ITreeMapCell,
} from '../chart/otherTypes';
import performLayout, { WithRect } from '../chart/performLayout';
import {
  computeGrossNetTradeValues,
  filterByMonetaryValues,
  maxCharacterHeightAtMinFontSize,
} from '../chart/transformUtils';
import {
  measuredCharacterHeight,
  measuredCharacterWidth,
  referenceFontSize,
} from '../chart/Utils';

interface Datum {
  id: string;
  value: number;
  title: string;
  topLevelParentId: string;
}
interface ColorMap {
  id: string;
  color: string;
}

export interface Inputs {
  data: Datum[];
  width: number;
  height: number;
  colorMap: ColorMap[];
}

export interface Output {
  treeMapCells: ITreeMapCell[];
}

interface Transformed {
  id: string;
  label: string;
  monetaryValue: number;
  topLevelParentId: string;
  percentage: number;
}

const treemapCellTransformer = (inputs: Inputs): Output => {
  const {
    data, width, height, colorMap,
  } = inputs;
  const withComputedTradeValues = computeGrossNetTradeValues(data);
  const filteredByMonetaryValue = filterByMonetaryValues(withComputedTradeValues);
  const totalSum = sum(filteredByMonetaryValue.map(({monetaryValue}) => monetaryValue));
  const transformed: Transformed[] = [];
  for (const elem of filteredByMonetaryValue) {
    const {
      monetaryValue, topLevelParentId, id, title,
    } = elem;
    const percentage = monetaryValue / totalSum;

    const out: Transformed = {
      id,
      label: title,
      monetaryValue,
      topLevelParentId,
      percentage,
    };
    transformed.push(out);

  }
  const container = {
    x0: 0, y0: 0, x1: width, y1: height,
  };
  const withCellLayout: Array<WithRect<Transformed>> = performLayout(transformed, container);
  const withTextLayout = withCellLayout.map(elem => {
    const cellValue: string = formatPercentage(elem.percentage);
    return addTextLayout({
      datum: elem,
      referenceFontSize, measuredCharacterHeight,
      measuredCharacterWidth, maxCharacterHeightAtMinFontSize,
      cellLabel: elem.label,
      cellValue,
    });
  });

  let treeMapCells: ITreeMapCell[] = withTextLayout.map(({topLevelParentId, monetaryValue, ...rest}) => {
    const tagetColor = colorMap.find(c => c.id === topLevelParentId);
    if (tagetColor === undefined) {
      throw new Error('Cannot find color for top section ' + topLevelParentId);
    }
    const out: ITreeMapCell = {
      ...rest,
      color: tagetColor.color,
      value: monetaryValue,
    };
    return out;
  });

  return {treeMapCells};
};

export default treemapCellTransformer;

