import {
  format,
} from 'd3-format';

export const formatPercentage =
  (percentage: number, decimalPlaces: number = 2) => format(`.${decimalPlaces}%`)(percentage);
