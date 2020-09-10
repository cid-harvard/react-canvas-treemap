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
import mergeComparisonData from './mergeComparisonData';

export interface Datum {
  id: string;
  value: number;
  title: string;
  topLevelParentId: string;
}

export interface ComparisonDatum extends Datum {
  primaryValue: number;
  secondaryValue: number;
}

interface ColorMap {
  id: string;
  color: string;
}

export interface Inputs {
  data: Datum[];
  comparisonData?: Datum[];
  width: number;
  height: number;
  colorMap: ColorMap[];
}

export interface Output {
  treeMapCells: ITreeMapCell[];
}

export interface Transformed {
  id: string;
  label: string;
  monetaryValue: number;
  topLevelParentId: string;
  percentage: number;
}

const treemapCellTransformer = (inputs: Inputs): Output => {
  const {
    width, height, colorMap,
  } = inputs;
  let data: (Datum[]) | (ComparisonDatum[]);
  let createComparisionCells: ((layoutCell: ITreeMapCell) => [ITreeMapCell, ITreeMapCell, ITreeMapCell]) | undefined;
  if (inputs.comparisonData !== undefined) {
    const merged = mergeComparisonData(inputs.data, inputs.comparisonData);
    data = merged.data;
    createComparisionCells = merged.createComparisionCells;
  } else {
    data = inputs.data;
    createComparisionCells = undefined;
  }
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

  let treeMapCells: ITreeMapCell[] = [];
  withTextLayout.forEach(({topLevelParentId, monetaryValue, ...rest}) => {
    const tagetColor = colorMap.find(c => c.id === topLevelParentId);
    if (tagetColor === undefined) {
      throw new Error('Cannot find color for top section ' + topLevelParentId);
    }
    const out: ITreeMapCell = {
      ...rest,
      color: tagetColor.color,
      value: monetaryValue,
    };
    if (inputs.comparisonData !== undefined && createComparisionCells !== undefined) {
      const mergedCells = createComparisionCells(out)
      mergedCells.forEach(cell => treeMapCells.push(cell));
    } else {
      treeMapCells.push(out);
    }
  });

  return {treeMapCells};
};

export default treemapCellTransformer;

