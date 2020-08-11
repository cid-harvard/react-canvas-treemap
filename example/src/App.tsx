import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap from 'react-canvas-treemap';

const colombiaData = JSON.parse(raw('./data/colombia_exports_transformed_data.json'));
const czechiaData = JSON.parse(raw('./data/czechia_exports_transformed_data.json'));

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
type ShareLayout  = {
  showText: false,
} | {
  showText: true;
  fontSize: number;
  text: string;
};

type LabelLayout = {
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
enum TextLayoutType {
  ShowBoth = 'ShowBoth',
  ShowOnlyShare = 'ShowOnlyShare',
  ShowNone = 'ShowNone',
}
// 3 types of tree map cell labels. If there's enough space, we show both the
// label and percentage. If there's not enough space for a label for enough for
// a percentage, we show only the percentage. Otherwise, show nothing:
type TextLayout = {
  type: TextLayoutType.ShowBoth;
  label: LabelLayout;
  share: ShareLayout;
} | {
  type: TextLayoutType.ShowOnlyShare;
  share: ShareLayout;
} | {
  type: TextLayoutType.ShowNone,
};


enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

// interface Input {
//   highlighted: string | undefined;
//   cells: ITreeMapCell[];

//   numCellsTier: NumCellsTier;

//   chartContainerWidth: number ;
//   chartContainerHeight: number;

//   onCellClick: (id: string) => void;
//   onMouseOverCell: (id: string) => void;
//   onMouseLeaveChart: () => void;
// }

enum Country {
  Colombia,
  Czechia,
}

const App = () => {
  const [country, setCountry] = useState<Country>(Country.Colombia);

  const toggleCountry = () => {
    if (country === Country.Colombia) {
      setCountry(Country.Czechia);
    } else {
      setCountry(Country.Colombia);
    }
  }

  return (
    <div>
      <div>
        <button onClick={toggleCountry}>
          Toggle Data
        </button>
      </div>
      <div>
        <TreeMap
          highlighted={undefined}
          cells={country === Country.Colombia ? colombiaData : czechiaData}
          numCellsTier={NumCellsTier.Small}
          chartContainerWidth={797}
          chartContainerHeight={745}
          onCellClick={id => console.log(id)}
          onMouseOverCell={id => console.log(id)}
          onMouseLeaveChart={() => {}}
        />
      </div>
      <br />
      <br />
      <br />
      <br />
      <div>
        <TreeMap
          highlighted={undefined}
          cells={country !== Country.Colombia ? colombiaData : czechiaData}
          numCellsTier={NumCellsTier.Small}
          chartContainerWidth={797}
          chartContainerHeight={745}
          onCellClick={id => console.log(id)}
          onMouseOverCell={id => console.log(id)}
          onMouseLeaveChart={() => {}}
        />
      </div>
    </div>
  );
}

export default App
