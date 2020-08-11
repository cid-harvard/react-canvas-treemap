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
