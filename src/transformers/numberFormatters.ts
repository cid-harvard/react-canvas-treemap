import {
  format,
} from 'd3-format';

// Taken from https://stackoverflow.com/a/22885197:
const log10 = Math.log(10);
const getSignificantDigitCount = (n: number) => {
    n = Math.abs(+String(n).replace('.', '')); //remove decimal and make positive
    if (n === 0) {
      return 0;
    }
    while (n !== 0 && n % 10 === 0) {
      n /= 10; //kill the 0s at the end of n
    }

    return Math.floor(Math.log(n) / log10) + 1; //get number of digits
};

// Format monetary sums into nice number with as many significant digits as in
// the input not exceeding 3. Also replace the `G` prefix with `B` because `B`
// makes more sense for money sums. The other prefixes are fine:
export const formatTradeValue = (input: number) => {
  const maxNumSignificantDigits = 3;
  const numSignificantDigitsInInput = getSignificantDigitCount(input);
  const numSignificantDigitsInOutput = (numSignificantDigitsInInput <= maxNumSignificantDigits) ?
                                        numSignificantDigitsInInput :
                                        maxNumSignificantDigits;
  return format(`$.${numSignificantDigitsInOutput}s`)(input).replace('G', 'B');
};

export const formatTradeValueUSD = (input: number) => {
  return 'USD' + ' ' + formatTradeValue(input);
};

export const formatTradeValueFullWord = (input: number) => {
  return 'USD' + ' ' + formatTradeValue(input)
         .replace('k', ' ' + 'thousand')
         .replace('M', ' ' + 'million')
         .replace('B', ' ' + 'billion')
         .replace('T', ' ' + 'trillion')
         .replace('P', ' ' + 'quadrillion');
};

export const formatRCA = format('.3');
export const formatDistance = format('.3');
export const formatPCI = format('.3');
export const formatECI = format('.2f');
export const formatOpportunityGain = format('.3');

// Convert from number `0.10` to  string `10%`:
export const formatPercentage =
  (percentage: number, decimalPlaces: number = 2) => format(`.${decimalPlaces}%`)(percentage);
