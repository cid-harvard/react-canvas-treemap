// Errors out at compile time if a discriminating `switch` doesn't catch all cases
// of an enum and at run time if for some reason an invalid enum value is passed.
// See https://basarat.gitbooks.io/typescript/content/docs/types/discriminated-unions.html
export function failIfValidOrNonExhaustive(_variable: never, message: string): never {
  throw new Error(message);
}

export const millisecondsPerSeconds = 1_000;

import {ColorQuadruplet} from './webglUtils';

export const strokeColor: ColorQuadruplet = [255, 255, 255, 255];
export const halfStrokeWidth = 0.5;

// Empirically measured size of character `W` (suposedly the character that
// takes up the most area) of font "Source Sans Pro" at 16px:
export const measuredCharacterWidth = 12.3;
export const measuredCharacterHeight = 18;
export const referenceFontSize = 16;

export const nonBreakingWhiteSpaceCharacter = '\u00a0';

export const ellipsisCharacter = String.fromCharCode(0x2026);
// Like `lodash`'s `groupBy` but the result is an ES6 `Map`
// instead of an object:
export const groupByMap = <Key, Value>(
  collection: Value[],
  iteratee: (value: Value) => Key): Map<Key, Value[]> => {

  const result: Map<Key, Value[]> = new Map();
  collection.forEach(value => {
    const key = iteratee(value);
    if (!result.has(key)) {
      result.set(key, [] as Value[]);
    }
    result.get(key)!.push(value);
  });
  return result;
};

export const newGetDisplayedProductCode =
    (code: string, productClass: string, level: string) => {

  // Make the space between product class and product code non-breaking:
  return `${code} ${productClass}${level}`.replace(/ /g, nonBreakingWhiteSpaceCharacter);
};

enum HSColor {
  vegetable = '#F5CF23',
  minerals = 'rgb(187, 150, 138)',
  chemicals = 'rgb(197, 123, 217)',
  textiles = 'rgb(125, 218, 161)',
  stone = 'rgb(218, 180, 125)',
  metals = 'rgb(217, 123, 123)',
  machinery = 'rgb(123, 162, 217)',
  electronics = 'rgb(125, 218, 218)',
  transport = 'rgb(141, 123, 216)',
  others = '#2a607c',
  services = 'rgb(178, 61, 109)',
}
export const hsServicesCategory = 10;
export const hsColorsMap: Map<number, string> = new Map([
  [0, HSColor.textiles],
  [1, HSColor.vegetable],
  [2, HSColor.stone],
  [3, HSColor.minerals],
  [4, HSColor.metals],
  [5, HSColor.chemicals],
  [6, HSColor.transport],
  [7, HSColor.machinery],
  [8, HSColor.electronics],
  [9, HSColor.others],
  [hsServicesCategory, HSColor.services],
]);
const generateStringProductId =
  ({productClass, id}: any) => `product-${productClass}-${id}`;

export const newHSColorMap: Map<string, string> = new Map(
  [...(hsColorsMap as any).entries()].map(([id, color]) =>
    ([generateStringProductId({productClass: 'HS', id}), color] as [string, string]
  )),
);
export enum TreeMapColorCriterion {
  Sector,
  Complexity,
  EntryYear,
}

// These types are used for properties shown in a graph detail overlay, like RCA, distance,
// opportunity gain:
export enum DisplayValueStatus {
  // Value is present and display that value:
  Show = 'Present',
  // Value is not applicable and display "N/A":
  ShowNotApplicable = 'NotApplicable',

  ShowNotAvailable = 'ShowNotAvailable',
  // Do not display value:
  DoNotShow = 'NotPresent',
}

export type DisplayValue = {
  status: DisplayValueStatus.Show,
  value: number | string,
} | {
  status: DisplayValueStatus.DoNotShow,
} | {
  status: DisplayValueStatus.ShowNotApplicable,
} | {
  status: DisplayValueStatus.ShowNotAvailable;
};

export interface IDetailOverlayRow {
  label: string;
  value: number | string | DisplayValue;
}

export interface ITooltipDatum {
  id: string;
  title: string;
  tooltipX: number;
  tooltipY: number;
  rows: IDetailOverlayRow[];
}

