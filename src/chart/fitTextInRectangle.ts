import initial from 'lodash/initial';
import last from 'lodash/last';
import sum from 'lodash/sum';
import {
  ellipsisCharacter as ellipsis,
} from './Utils';

const wordSeparator = ' ';

interface IFontMeasurement {
  maxCharacterWidth: number;
  maxCharacterHeight: number;
}

interface IRectangle {
  width: number;
  height: number;
}

interface IWord {
  text: string;
  width: number;
}

type ILayoutAttemptResult = {
  success: boolean,
  // Each element in the array represents a row. Each row is in turn an array of
  // words.
  lines: ILine[];
};

interface ILine {
  text: string;
  words: IWord[];
}

const attemptFitTextInsideRectangle = (input: {
    text: string,
    referenceMeasurement: IFontMeasurement,
    referenceFontSize: number,
    rectangle: IRectangle,
    fontSizeToTry: number;
  }): ILayoutAttemptResult => {

  const {
    text, referenceMeasurement, referenceFontSize, rectangle, fontSizeToTry,
  } = input;

  // Scale up/down the measured width/height according to the `fontSizeToTry`:
  const maxCharacterHeight = fontSizeToTry / referenceFontSize * referenceMeasurement.maxCharacterHeight;
  const maxCharacterWidth = fontSizeToTry / referenceFontSize * referenceMeasurement.maxCharacterWidth;

  const {width, height} = rectangle;
  const maxLineNumber = Math.floor(height / maxCharacterHeight);
  const words: IWord[] = text.split(wordSeparator).map(word => ({
    text: word,
    width: word.length * maxCharacterWidth,
  }));
  const [firstWord, ...remainingWords] = words;

  const isEveryWordShorterThanRectangle = words.every(word => word.width < width);

  // If at least one word is longer than the rectangle's width or the
  // rectangle's height is shorter than the height of a single lint of text, the
  // text is too big to fit.
  if (!isEveryWordShorterThanRectangle || maxCharacterHeight > height) {

    return {
      success: false,
      lines: [],
    };

  } else {
    const fitResult: IWord[][] = [ [firstWord] ];

    let lineNumber = 1;
    // Because (the area of the first word) < (total rectangle area), we know
    // the first word will fit:
    let lineLengthLeft = width - firstWord.width;

    // Keep doing this as long as there are still words remaining and we haven't
    // run out of space in the rectangle:
    while (remainingWords.length) {

      const wordToFit = remainingWords.shift()!;
      if (wordToFit.width < lineLengthLeft) {
        // If there's enough space left on the current line for the word then add
        // it to the line:{
        const [lastFitResult] = fitResult.slice(-1);
        lastFitResult.push(wordToFit);
        // Need to also subtract the width by the amount taken by the space
        // separating the words:
        lineLengthLeft = lineLengthLeft - wordToFit.width - maxCharacterWidth;
      } else {
       // Else, start a new line if possible
        lineNumber = lineNumber + 1;
        fitResult.push([]);
        // Return the attempted word to the pool of remaining words to fit:
        remainingWords.unshift(wordToFit!);
        lineLengthLeft = width;
      }
    }

    const lines: ILine[] = fitResult.map(wordsInLine => {
      const wordsBeforeLast = initial(wordsInLine);
      const lastWord = last(wordsInLine)!;
      const newWordsBeforeLast = wordsBeforeLast.map(word => ({
        text: word.text + wordSeparator,
        width: word.width + maxCharacterWidth,
      }));
      const newWords = [...newWordsBeforeLast, lastWord];
      const newText = newWords.map(word => word.text).join('');
      return {
        text: newText,
        words: newWords,
      };
    });
    const isSuccessful = (lines.length <= maxLineNumber);

    return {
      success: isSuccessful,
      lines,
    };
  }
};

interface IFontSizeDetermination {
  fontSize: number;
  lines: ILine[];
}

export const determineFontSizeToFit = (
  input: {
    text: string,
    referenceMeasurement: IFontMeasurement,
    referenceFontSize: number,
    rectangle: IRectangle,
  }): IFontSizeDetermination => {

  const {text, referenceFontSize, referenceMeasurement, rectangle} = input;
  const {maxCharacterHeight, maxCharacterWidth} = referenceMeasurement;
  const {width, height} = rectangle;
  const totalTextArea = text.length * maxCharacterHeight * maxCharacterWidth;
  const totalRectangleArea = width * height;

  // This is the font size for which the total text area = rectangle's area.
  // This is the max font size the text can possibly have:
  const maxFontSize = (Math.sqrt((totalRectangleArea / totalTextArea) * Math.pow(16, 2)));

  // Use bisection to figure out the optimize font size. Stop when the two bounds
  // converge to within 0.01:
  let upperBound = maxFontSize;
  let lowerBound = 0;
  let sizeToTry: number | undefined;
  let layoutResult: ILine[] | undefined;
  while (Math.abs(upperBound - lowerBound) > 0.01) {
    sizeToTry = (upperBound + lowerBound) / 2;
    // TODO: memoize this function call:
    const layoutAttempt = attemptFitTextInsideRectangle({
      text, referenceMeasurement, referenceFontSize, rectangle,
      fontSizeToTry: sizeToTry,
    });
    let newUpperBound: number, newLowerBound: number;
    if (layoutAttempt.success) {
      layoutResult = layoutAttempt.lines;
      newUpperBound = upperBound;
      newLowerBound = sizeToTry;
    } else {
      newUpperBound = sizeToTry;
      newLowerBound = lowerBound;
    }
    upperBound = newUpperBound;
    lowerBound = newLowerBound;
  }

  return {
    fontSize: sizeToTry!,
    lines: layoutResult!,
  };
};

export const truncateTextInRectangle = (input: {
    text: string,
    referenceMeasurement: IFontMeasurement,
    referenceFontSize: number,
    rectangle: IRectangle,
    fontSizeToTry: number;
  }): ILine[] => {

  const {
    fontSizeToTry, referenceFontSize,
    referenceMeasurement,
    rectangle: {height, width},
  } = input;
  const maxCharacterHeight = fontSizeToTry / referenceFontSize * referenceMeasurement.maxCharacterHeight;
  const maxCharacterWidth = fontSizeToTry / referenceFontSize * referenceMeasurement.maxCharacterWidth;

  const isEveryWordShorterThanRectangle = input.text.split(wordSeparator).every(
    word => word.length * maxCharacterWidth < width,
  );

  let result: ILine[];
  if (isEveryWordShorterThanRectangle === false) {
    // If at least one word is longer the rectangle, the layout algorithm won't be able to fit the text in.
    // In that case, just trim the first word
    const firstWord = input.text.split(wordSeparator)[0];
    const maxCharacterCountToFitWidth = Math.floor(width / maxCharacterWidth);
    const trimmedFirstWord = `${firstWord.slice(0, maxCharacterCountToFitWidth)}${ellipsis}`;
    result = [{
      text: trimmedFirstWord,
      words: [{
        text: trimmedFirstWord,
        width: maxCharacterCountToFitWidth * maxCharacterWidth,
      }],
    }];

  } else {
    const maxNumOfLines = Math.floor(height / maxCharacterHeight);
    const {lines} = attemptFitTextInsideRectangle(input);

    if (lines.length > 0) {
      // Only keep the lines that fit vertically within the rectangle:
      const retainedLines = lines.slice(0, maxNumOfLines);
      const linesBeforeLast = initial(retainedLines);
      const lastLine = last(retainedLines)!;

      // Add ellipsis to the end of the last line:
      const totalLengthOfLastLine = sum(lastLine.words.map(word => word.width));
      let newLastLine: ILine;
      if (totalLengthOfLastLine < width - maxCharacterWidth) {
        // If there's enough leftover space on the last line for the ellipsis, simply append
        // the ellipsis after the last character:
        const {words} = lastLine;
        const wordsOtherThanLast = initial(words);
        const lastWord = last(words)!;
        const newLastWord = {
          text: lastWord.text + ellipsis,
          width: lastWord.width + maxCharacterWidth,
        };
        newLastLine = {
          text: lastLine.text + ellipsis,
          words: [...wordsOtherThanLast, newLastWord],
        };
      } else {
        // Otherwise, relace the last character with the ellipsis:
        const {words} = lastLine;
        const wordsBeforeLast = initial(words);
        const lastWord = last(words)!;
        const newLastWord = {
          text: lastWord.text.replace(/.$/, ellipsis),
          width: lastWord.width,
        };
        newLastLine = {
          text: lastLine.text.replace(/.$/, ellipsis),
          words: [...wordsBeforeLast, newLastWord],
        };
      }

      result = [...linesBeforeLast, newLastLine];
    } else {
      result = [];
    }

  }

  return result;
};
