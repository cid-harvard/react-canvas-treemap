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

export const measuredCharacterHeight = 18;
export const referenceFontSize = 16;

