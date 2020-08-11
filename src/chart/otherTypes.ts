export interface ITreeMapCell {
  // Key used to manage transition animations between different tree maps. No
  // two cells across all possible different tree maps should have the same
  // `uniqueKey`:
  id: string;
  // Monetary value of a cell:
  value: number;

  color: string;

  x0: number;
  y0: number;
  x1: number;
  y1: number;

  // info about where and how cell label should be displayed:
  textLayout: TextLayout;
}

// Layout for percentage numbers in each cell:
export type ShareLayout  = {
  showText: false,
} | {
  showText: true;
  fontSize: number;
  text: string;
};

export type LabelLayout = {
  showText: false,
} | {
  showText: true,
  fontSize: number;
  useMargin: boolean;
  // `textSplitIntoLines` are broken into separate lines for use in SVG which
  // does not support text wrapping. `textUnsplit` is used in DOM:
  textSplitIntoLines: string[]
  textUnsplit: string;
};
// (for smaller cells) 3) no label at all (cells that are too small).
export enum TextLayoutType {
  ShowBoth = 'ShowBoth',
  ShowOnlyShare = 'ShowOnlyShare',
  ShowNone = 'ShowNone',
}
// 3 types of tree map cell labels. If there's enough space, we show both the
// label and percentage. If there's not enough space for a label for enough for
// a percentage, we show only the percentage. Otherwise, show nothing:
export type TextLayout = {
  type: TextLayoutType.ShowBoth;
  label: LabelLayout;
  share: ShareLayout;
} | {
  type: TextLayoutType.ShowOnlyShare;
  share: ShareLayout;
} | {
  type: TextLayoutType.ShowNone,
};
