import {
  measuredCharacterHeight,
  referenceFontSize,
} from './Utils';

interface IWithExportImport {
  value: number | null;
}

type ComputedDatum<T extends IWithExportImport> = Omit<T, 'value'> & {monetaryValue: number};

export const computeGrossNetTradeValues = <T extends IWithExportImport>(
    input: T[]
  ): Array<ComputedDatum<T>> => {

  let result: Array<ComputedDatum<T>> = input.map(
    ({value, ...rest}) => {
      const monetaryValue = value ? value : 0;
      return {monetaryValue, ...rest};
    },
  );
  return result;
};

interface IWithMonetaryValue {
  monetaryValue: number;
}
export const filterByMonetaryValues =
  <T extends IWithMonetaryValue>(data: T[]): T[] =>
    data.filter(({monetaryValue}) => monetaryValue > 0);

interface IWithCategory {
  topLevelParentId: string;
}
export const filterBySelectedCategories =
    <T extends IWithCategory>(data: T[], selectedCategories: string[]): T[] => {

  const asSet = new Set(selectedCategories);
  return data.filter(({topLevelParentId}) => asSet.has(topLevelParentId));
};

//#region Constants
// The font size should never get smaller than this:
export const minNodeNameFontSize = 8;
export const labelHorizontalMargin = 0.05; // in percentage points i.e. the number '5' means '5%'
export const labelTopMargin = 0.05; // in percentage points
export const heightProportionReservedForShare = 0.2; // in percentage points

export const maxCharacterHeightAtMinFontSize = measuredCharacterHeight / referenceFontSize * minNodeNameFontSize;
//#endregion
