import {
  Datum,
  ComparisonDatum,
} from './treemapCellTransformer';
import {
  ITreeMapCell,
  TextLayoutType,
  TextLayout,
} from '../chart/otherTypes';
import {lighten} from 'polished';

type TextCell = ITreeMapCell;
type PrimaryCell = ITreeMapCell;
type SecondaryCell = ITreeMapCell;
type BorderBottomCell = ITreeMapCell;
type BorderRightCell = ITreeMapCell;

export type ComparisonTreeMapCells = [
  TextCell,
  PrimaryCell,
  SecondaryCell,
  BorderBottomCell,
  BorderRightCell,
]

interface Output {
  data: ComparisonDatum[];
  createComparisionCells: (layoutCell: ITreeMapCell) => ComparisonTreeMapCells;
}

export default (primaryData: Datum[], secondaryData: Datum[]): Output => {
  // merge all data points from dataset 2 into dataset 1
  const data = primaryData.map(d1 => {
    const d2 = secondaryData.find(({id}) => id === d1.id);
    const secondaryValue = d2 && d2.value ? d2.value : 0;
    return {...d1, value: d1.value + secondaryValue, primaryValue: d1.value, secondaryValue};
  })
  // Add any datapoints that only exist in dataset 2
  secondaryData.filter(({id}) => !primaryData.find(d => d.id === id))
               .forEach(d => data.push({...d, primaryValue: 0, secondaryValue: d.value}));

  const createComparisionCells = (layoutCell: ITreeMapCell): ComparisonTreeMapCells => {
    const targetDatum = data.find(({id}) => id === layoutCell.id);
    if (!targetDatum) {
      console.error({'Invalid cell': layoutCell});
      throw new Error('Invalid layoutCell id ' + layoutCell.id + 'at mergeComparisonData');
    }
    let textLayout: TextLayout;
    if (layoutCell.textLayout.type === TextLayoutType.ShowBoth) {
      textLayout = {
        type: TextLayoutType.ShowBoth,
        label: {...layoutCell.textLayout.label},
        share: {showText: false},
      }
    } else {
      textLayout = { type: TextLayoutType.ShowNone };
    }
    const textCell: TextCell = {
      ...layoutCell,
      id: 'text-cell-' + layoutCell.id,
      textLayout,
      color: 'transparent',
    }
    const primaryCell: PrimaryCell = {
      ...layoutCell,
      id: 'primary-cell-' + layoutCell.id,
      x1: layoutCell.x1 - ((layoutCell.x1 - layoutCell.x0) * (targetDatum.secondaryValue / targetDatum.value)),
      textLayout: { type: TextLayoutType.ShowNone },
      comparison: true,
    }
    const secondaryCell: SecondaryCell = {
      ...layoutCell,
      id: 'secondary-cell-' + layoutCell.id,
      x0: primaryCell.x1,
      color: lighten(0.1, layoutCell.color),
      textLayout: { type: TextLayoutType.ShowNone },
      comparison: true,
    }
    const borderBottom: BorderBottomCell = {
      ...layoutCell,
      id: 'border-bottom-' + layoutCell.id,
      y0: layoutCell.y1 - 0.5,
      color: 'white',
      comparison: true,
      textLayout: { type: TextLayoutType.ShowNone },
    }
    const borderRight: BorderRightCell = {
      ...layoutCell,
      id: 'border-right-' + layoutCell.id,
      x0: layoutCell.x1 - 0.5,
      color: 'white',
      comparison: true,
      textLayout: { type: TextLayoutType.ShowNone },
    }
    return [textCell, primaryCell, secondaryCell, borderBottom, borderRight];
  }
  return {data, createComparisionCells};
}

