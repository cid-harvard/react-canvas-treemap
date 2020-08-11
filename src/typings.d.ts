/**
 * Default CSS definition for typescript,
 * will be overridden with file-specific definitions by rollup
 */
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

interface SvgrComponent extends React.StatelessComponent<React.SVGAttributes<SVGElement>> {}

declare module '*.svg' {
  const svgUrl: string;
  const svgComponent: SvgrComponent;
  export default svgUrl;
  export { svgComponent as ReactComponent }
}

declare module 'interval-tree-1d' {
  // Note: find more general way to express the interval type:
  export type Interval<T> = [number, number, T]
  export interface IntervalTree<T>{
    count: number;
    intervals: Interval<T>[];
    insert(interval: Interval<T>): void;
    remove(interval: Interval<T>): void;
    queryPoint(p: number, visitor: (interval: Interval<T>) => undefined): void;
    queryInterval(low: number, hight: number, visitor: (interval: Interval<T>) => undefined): void;
  }
  function createIntervalTree<T>(intervals: Interval<T>[]): IntervalTree<T>;
  export default createIntervalTree;
}

declare module 'gsap/CSSPlugin';

declare module 'gsap/TweenLite' {
  import {TweenLite} from 'gsap';
  const output: typeof TweenLite;
  export default output;
}

declare module 'gsap/TimelineLite' {
  import {TimelineLite} from 'gsap';
  const output: typeof TimelineLite;
  export default output;
}
