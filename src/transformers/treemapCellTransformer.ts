import partition from 'lodash/partition';
import sum from 'lodash/sum';
import {formatPCI, formatPercentage, formatTradeValue } from './numberFormatters';
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
  failIfValidOrNonExhaustive,
  measuredCharacterHeight,
  measuredCharacterWidth,
  newGetDisplayedProductCode,
  newHSColorMap,
  referenceFontSize,
  TreeMapColorCriterion,
  IDetailOverlayRow as IRow,
  ITooltipDatum,
} from '../chart/Utils';
import complexityColorScale from './complexityColorScale';


// Types to be deleted
enum ProductClass {
  HS = 'HS',
  SITC = 'SITC',
}
enum ProductLevel {
  section = 'section',
  twoDigit = 'twoDigit',
  fourDigit = 'fourDigit',
  sixDigit = 'sixDigit',
}
enum ProductType {
  Goods = 'Goods',
  Service = 'Service',
}
enum TradeDirection {
  export = 'export',
  import = 'import',
}
enum TradeFlow {
  Gross = 'Gross',
  Net = 'Net',
}

interface FetchedDatum {
  exportValue: number;
  importValue: number;
  product: {
    id: string,
    shortName: string,
    topLevelParent: {
      id: string,
    }
    type: string,
    pci: number,
    code: string,
  };
}
//////////////////////

interface Inputs {
  fetchResult: FetchedDatum[];
  width: number;
  height: number;
  colorCriterion: TreeMapColorCriterion;
  tradeFlow: TradeFlow;
}

interface Transformed {
  id: string;
  label: string;
  monetaryValue: number;
  topLevelParentId: string;
  type: string;
  percentage: number;
  pci: number;
  rows: IRow[];
}

const treemapCellTransformer = (inputs: Inputs) => {
  const {
    fetchResult, width, height, colorCriterion, tradeFlow,
  } = inputs;
  const withComputedTradeValues = computeGrossNetTradeValues(
    fetchResult, TradeDirection.export, tradeFlow,
  );
  const filteredByMonetaryValue = filterByMonetaryValues(withComputedTradeValues);
  const totalSum = sum(filteredByMonetaryValue.map(({monetaryValue}) => monetaryValue));
  const transformed: Transformed[] = [];
  for (const elem of filteredByMonetaryValue) {
    const {
      monetaryValue,
      product: {
        id, shortName, type,
        topLevelParent: {id: topLevelParentId},
        pci, code,
      },
    } = elem;
    if (pci !== null) {
      const codeInfo: IRow = {
        label: 'Code',
        value: newGetDisplayedProductCode(code, ProductClass.HS, ProductLevel.fourDigit),
      };
      const tradeInfo: IRow = {
        label: 'Value',
        value: formatTradeValue(monetaryValue),
      };
      const percentage = monetaryValue / totalSum;

      let colorCriterionDependentInfo: IRow;
      if (colorCriterion === TreeMapColorCriterion.Sector) {
        colorCriterionDependentInfo = {
          label: 'Share',
          value: formatPercentage(percentage),
        };
      } else if (colorCriterion === TreeMapColorCriterion.Complexity) {
        colorCriterionDependentInfo = {
          label: 'PCI',
          value: formatPCI(pci),
        };
      } else if (colorCriterion === TreeMapColorCriterion.EntryYear) {
        throw new Error('Not implemented yet');
      } else {
        failIfValidOrNonExhaustive(colorCriterion, 'Invalid color criterion ' + colorCriterion);
        colorCriterionDependentInfo = {label: '', value: ''};
      }
      const rows = [codeInfo, tradeInfo, colorCriterionDependentInfo];
      const out: Transformed = {
        id,
        label: shortName,
        monetaryValue,
        topLevelParentId,
        type,
        percentage,
        pci,
        rows,
      };
      transformed.push(out);
    }

  }
  const [goods, services] = partition(transformed, ({type}) => type === ProductType.Goods);
  let withCellLayout: Array<WithRect<Transformed>>;
  if (services.length > 0) {
    const servicesSum = sum(services.map(({monetaryValue}) => monetaryValue));
    const servicesShare = servicesSum / totalSum;
    const xSplitPoint = width * servicesShare;
    const servicesContainer = {
      x0: 0, y0: 0, x1: xSplitPoint, y1: height,
    };
    const goodsContainer = {
      x0: xSplitPoint, y0: 0, x1: width, y1: height,
    };
    const laidOutServices = performLayout(services, servicesContainer);
    const laidOutGoods = performLayout(goods, goodsContainer);
    withCellLayout = [...laidOutServices, ...laidOutGoods];
  } else {
    const goodsContainer = {
      x0: 0, y0: 0, x1: width, y1: height,
    };
    withCellLayout = performLayout(goods, goodsContainer);

  }
  const withTextLayout = withCellLayout.map(elem => {
    let cellValue: string;
    if (colorCriterion === TreeMapColorCriterion.Sector) {
      cellValue = formatPercentage(elem.percentage);
    } else if (colorCriterion === TreeMapColorCriterion.Complexity) {
      cellValue = formatPCI(elem.pci);
    } else if (colorCriterion === TreeMapColorCriterion.EntryYear) {
      throw new Error('Not implemented yet');
    } else {
      failIfValidOrNonExhaustive(colorCriterion, 'Invalid color criterion ' + colorCriterion);
      cellValue = '';
    }
    return addTextLayout({
      datum: elem,
      referenceFontSize, measuredCharacterHeight,
      measuredCharacterWidth, maxCharacterHeightAtMinFontSize,
      cellLabel: elem.label,
      cellValue,
    });
  });

  let treeMapCells: ITreeMapCell[];
  if (colorCriterion === TreeMapColorCriterion.Sector) {
    treeMapCells = withTextLayout.map(({topLevelParentId, monetaryValue, ...rest}) => {
      const color = newHSColorMap.get(topLevelParentId);
      if (color === undefined) {
        throw new Error('Cannot find color for top section ' + topLevelParentId);
      }
      const out: ITreeMapCell = {
        ...rest,
        color,
        value: monetaryValue,
      };
      return out;
    });
  } else if (colorCriterion === TreeMapColorCriterion.Complexity) {
    treeMapCells = withTextLayout.map(({pci, monetaryValue, ...rest}) => {
      const out: ITreeMapCell = {
        ...rest,
        color: complexityColorScale(pci),
        value: monetaryValue,
      };
      return out;
    });
  } else if (colorCriterion === TreeMapColorCriterion.EntryYear) {
    throw new Error('Not implemented yet');
  } else {
    failIfValidOrNonExhaustive(colorCriterion, 'Invalid color criterion' + colorCriterion);
    // The following lines will never be executed:
    treeMapCells = [];
  }

  const tooltipMapPrecursor = withCellLayout.map(elem => {
    const {
      x0, y0, x1, id, rows, label,
    } = elem;
    const out: ITooltipDatum = {
      id,
      title: label,
      tooltipX: (x0 + x1) / 2,
      tooltipY: y0,
      rows,
    };
    return [id, out] as [string, ITooltipDatum];
  });

  const tooltipMap = new Map(tooltipMapPrecursor);

  return {treeMapCells, tooltipMap};
};

export default treemapCellTransformer;

