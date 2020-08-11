import {
  LabelLayout,
  ShareLayout,
  TextLayout,
  TextLayoutType,
} from './otherTypes';
import {
  heightProportionReservedForShare,
  labelHorizontalMargin,
  labelTopMargin,
  minNodeNameFontSize,
} from './transformUtils';
import {
  determineFontSizeToFit,
  truncateTextInRectangle,
} from './fitTextInRectangle';

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

type WithTextLayout<T> = T & {
  textLayout: TextLayout;
};

const addTextLayout = <T extends Rect>(input: {
    datum: T,
    referenceFontSize: number,
    measuredCharacterHeight: number,
    measuredCharacterWidth: number,
    maxCharacterHeightAtMinFontSize: number,
    cellLabel: string,
    cellValue: string,
  }) => {
  const {
    datum, referenceFontSize, measuredCharacterHeight, measuredCharacterWidth,
    maxCharacterHeightAtMinFontSize, cellLabel, cellValue,
  } = input;
  const {x0, y0, x1, y1} = datum;
  const fullWidth = x1 - x0;
  const fullHeight = y1 - y0;

  const widthMinusMargin = fullWidth * (1 - 2 * labelHorizontalMargin);
  const fullAvailableHeightForLabel = fullHeight * (1 - heightProportionReservedForShare);
  const heightMinusMargin = fullAvailableHeightForLabel * (1 - labelTopMargin);

  // First try to fit text with margin:
  const labelLayoutWithMargin = determineFontSizeToFit({
    text: cellLabel,
    referenceFontSize,
    referenceMeasurement: {
      maxCharacterHeight: measuredCharacterHeight,
      maxCharacterWidth: measuredCharacterWidth,
    },
    rectangle: {width: widthMinusMargin, height: heightMinusMargin},
  });

  //#region Label layout
  let labelLayout: LabelLayout;
  if (labelLayoutWithMargin.fontSize > minNodeNameFontSize) {
    const textSplitIntoLines = labelLayoutWithMargin.lines.map(line => line.text);
    labelLayout = {
      showText: true,
      fontSize: labelLayoutWithMargin.fontSize,
      textSplitIntoLines,
      textUnsplit: textSplitIntoLines.join(' '),
      useMargin: true,
    };
  } else {
    // If text doesn't fit when margin is present, try again without margin:
    const layoutResultWithoutMargin = determineFontSizeToFit({
      text: cellLabel,
      referenceFontSize,
      referenceMeasurement: {
        maxCharacterHeight: measuredCharacterHeight,
        maxCharacterWidth: measuredCharacterWidth,
      },
      rectangle: {width: fullWidth, height: fullAvailableHeightForLabel},
    });
    if (layoutResultWithoutMargin.fontSize > minNodeNameFontSize) {
      const textSplitIntoLines = layoutResultWithoutMargin.lines.map(line => line.text);
      labelLayout = {
        showText: true,
        fontSize: layoutResultWithoutMargin.fontSize,
        textSplitIntoLines,
        textUnsplit: textSplitIntoLines.join(' '),
        useMargin: false,
      };
    } else {
      // When removing margin still doesn't fit the text, truncate the text if
      // the height can accommodate at least three lines of text:
      if (fullAvailableHeightForLabel > 3 * maxCharacterHeightAtMinFontSize) {
        const truncatedLines = truncateTextInRectangle({
          text: cellLabel,
          referenceFontSize,
          referenceMeasurement: {
            maxCharacterHeight: measuredCharacterHeight,
            maxCharacterWidth: measuredCharacterWidth,
          },
          rectangle: {width: fullWidth, height: fullAvailableHeightForLabel},
          fontSizeToTry: minNodeNameFontSize,
        });
        if (truncatedLines.length > 0) {
          const textSplitIntoLines = truncatedLines.map(line => line.text);
          labelLayout = {
            showText: true,
            fontSize: minNodeNameFontSize,
            textSplitIntoLines,
            textUnsplit: textSplitIntoLines.join(' '),
            useMargin: false,
          };
        } else {
          labelLayout = {showText: false};
        }
      } else {
        labelLayout = {showText: false};
      }
    }
  }
  //#endregion

  //#region Percentage layout:
  const heightAvailableForPercentage = fullHeight * heightProportionReservedForShare;
  let textLayout: TextLayout, shareLayout: ShareLayout;
  if (labelLayout.showText === true) {
    // If layout for label is succesful, only use the space that's reserved for
    // the percentage:
    const layoutResultPartialCell = determineFontSizeToFit({
      text: cellValue,
      referenceFontSize,
      referenceMeasurement: {
        maxCharacterHeight: measuredCharacterHeight,
        maxCharacterWidth: measuredCharacterWidth,
      },
      rectangle: {width: fullWidth, height: heightAvailableForPercentage},
    });

    // Make sure that the percentage doesn't extend more than one line:
    if (layoutResultPartialCell.fontSize > minNodeNameFontSize &&
        layoutResultPartialCell.lines.length <= 1) {

      shareLayout = {
        showText: true,
        fontSize: layoutResultPartialCell.fontSize,
        text: cellValue,
      };
      textLayout = {
        type: TextLayoutType.ShowBoth,
        share: shareLayout,
        label: labelLayout,
      };
    } else {
      shareLayout = {
        showText: false,
      };
      textLayout = {
        type: TextLayoutType.ShowNone,
      };
    }
  } else {
    // If label text is not shown, let the percentage take up the entire space:
    const layoutResultFullCell = determineFontSizeToFit({
      text: cellValue,
      referenceFontSize,
      referenceMeasurement: {
        maxCharacterHeight: measuredCharacterHeight,
        maxCharacterWidth: measuredCharacterWidth,
      },
      rectangle: {width: fullWidth, height: fullHeight},
    });

    if (layoutResultFullCell.fontSize > minNodeNameFontSize &&
        layoutResultFullCell.lines.length <= 1) {

      shareLayout = {
        showText: true,
        fontSize: layoutResultFullCell.fontSize,
        text: cellValue,
      };
      textLayout = {
        type: TextLayoutType.ShowOnlyShare,
        share: shareLayout,
      };
    } else {
      textLayout = {
        type: TextLayoutType.ShowNone,
      };
    }
  }

  //#endregion

  const result: WithTextLayout<T> = {
    ...datum,
    textLayout,
  };

  return result;
};

export default addTextLayout;
