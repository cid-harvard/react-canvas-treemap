import sortBy from 'lodash/sortBy';
import sum from 'lodash/sum';
import squarify, {
  Input,
  IRect,
} from 'squarify';
import {
  groupByMap,
} from './Utils';

export type WithRect<T> = T & {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};
interface IWithTopLevelParentId {
  monetaryValue: number;
  // id: string
  // shortName: string
  topLevelParentId: string;
}

const performLayout = <T extends IWithTopLevelParentId>(
    list: T[], container: IRect,
  ): Array<WithRect<T>> => {

  type AugmentedElement = T & {value: number, children: undefined};

  const groupedBySection = groupByMap(list, ({topLevelParentId}) => topLevelParentId);
  const result: Array<Input<T>> = [];
  for (const [sectionId, elemsInSection] of (groupedBySection as any)) {
    const sortedElemsInSection = sortBy(elemsInSection, 'monetaryValue').reverse();
    const elemsWithValue: AugmentedElement[] = sortedElemsInSection.map(elem => ({
      ...elem,
      value: elem.monetaryValue,
      children: undefined,
    }));
    const sectionSum = sum(sortedElemsInSection.map(({monetaryValue}) => monetaryValue));
    const firstElem = elemsWithValue[0];
    const sectionResult: Input<T> = {
      // Spread in one element to satisfy the type checker:
      ...firstElem,

      value: sectionSum,
      children: elemsWithValue,
      id: sectionId,
    };
    result.push(sectionResult);
  }
  const sorted = sortBy(result, 'value').reverse();

  const rawLayoutOutput = squarify<T>(sorted, container);
  const cleanedOutput = rawLayoutOutput.map(elem => {
    const {
      x0, y0, x1, y1, normalizedValue, value, children, ...rest
    } = elem;
    const out = {
      x0, y0, x1, y1,
      ...rest,
    } as unknown as WithRect<T>;
    return out;
  });
  return cleanedOutput;
};

export default performLayout;
