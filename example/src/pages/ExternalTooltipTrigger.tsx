import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap, {transformData, Output as TransformedData} from 'react-canvas-treemap';
import styled from 'styled-components/macro';

const Container = styled.div`
  width: 500px;
  height: 500px;
  margin-bottom: 2rem;
`;

const Nav = styled.nav`
  display: flex;
`;

const Button = styled.button`
  margin-right: 1rem;
  cursor: pointer;
`;

const MockTooltip = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  background-color: rgba(0, 0, 0, 0.5);
  outline: 1px solid salmon;
  z-index: 1000;
  transform: translate(-50%, 0);
`;

interface NaicsDatum {
  code: string;
  code_hierarchy: string;
  level: number;
  naics_id: number;
  naics_id_hierarchy: string;
  name: string;
  parent_code: null | string;
  parent_id: null | number;
}

const naicsData: NaicsDatum[] = JSON.parse(raw('../data/naics_2017.json'));

const colorMap = [
  { id: '0', color: '#A973BE' },
  { id: '1', color: '#F1866C' },
  { id: '2', color: '#FFC135' },
  { id: '3', color: '#93CFD0' },
  { id: '4', color: '#488098' },
  { id: '5', color: '#77C898' },
  { id: '6', color: '#6A6AAD' },
  { id: '7', color: '#D35162' },
  { id: '8', color: '#F28188' },
]

const width = 800;
const height = 600;

interface PreparedDatum {
  id: string,
  title: string,
  value: number,
  topLevelParentId: string,
}

////////////////////////////////
// interface RawDatum {
//   id: number,
//   city_id: number,
//   year: number,
//   naics_id: number,
//   num_employ: number,
//   num_company: number,
//   level: number,
// }
// const rawData: RawDatum[][]  = [
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_1.json')),
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_2.json')),
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_3.json')),
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_4.json')),
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_5.json')),
//   JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_6.json')),
// ]

// const data: PreparedDatum[][] = rawData.map(d => d.map(({naics_id, num_company}) => {
//   let topLevelParentId: string = naics_id.toString();
//   let current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id === naics_id);
//   const title = current && current.name ? current.name : 'Unknown';
//   while(current && current.parent_id !== null) {
//     // eslint-disable-next-line
//     current = naicsData.find(datum => datum.naics_id === (current as NaicsDatum).parent_id);
//     if (current && current.parent_id !== null) {
//       topLevelParentId = current.parent_id.toString();
//     } else if (current && current.naics_id !== null) {
//       topLevelParentId = current.naics_id.toString();
//      }
//   }
//   if (parseInt(topLevelParentId, 10) > 8) {
//     console.error(current);
//     throw new Error('Parent out of range')
//   }

//   return {
//     id: naics_id.toString(),
//     title,
//     value: num_company,
//     topLevelParentId,
//   }
// }));

// const transformedData: TransformedData[] = data.map(d => transformData({
//   data: d,
//   width,
//   height,
//   colorMap: colorMap,
// }))
//////////////////////////////////////


interface RawDatum {
  city_id: 945 | 1022,
  name: "New York" | "Boston",
  naics_id: number,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  year: 2019 | 2020,
  num_company: number,
  num_employ: number,
}

const rawData: RawDatum[] = JSON.parse(raw('../data/bos_nyc_extract.json'));

interface DataMap {
  [key: number]: PreparedDatum[]
}

const bosData: DataMap = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
}
const nyData: DataMap = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
}
let bostonTotal = 0;
let newYorkTotal = 0;
rawData.forEach(({naics_id, num_company, level, city_id, year}) => {
  if (year === 2020) {
    let topLevelParentId: string = naics_id.toString();
    let current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id === naics_id);
    const title = current && current.name ? current.name : 'Unknown';
    while(current && current.parent_id !== null) {
      // eslint-disable-next-line
      current = naicsData.find(datum => datum.naics_id === (current as NaicsDatum).parent_id);
      if (current && current.parent_id !== null) {
        topLevelParentId = current.parent_id.toString();
      } else if (current && current.naics_id !== null) {
        topLevelParentId = current.naics_id.toString();
      }
    }
    if (parseInt(topLevelParentId, 10) > 8) {
      console.error(current);
      throw new Error('Parent out of range')
    }
    if (city_id === 1022) {
      bosData[level].push({
        id: naics_id.toString() + level,
        title,
        value: num_company,
        topLevelParentId,
      })
      bostonTotal += num_company;
    } else {
      nyData[level].push({
        id: naics_id.toString() + level,
        title,
        value: num_company,
        topLevelParentId,
      })
      newYorkTotal += num_company;
    }
  }
});

const transformedBosData: TransformedData[] = [];
const transformedNyData: TransformedData[] = [];
const comparisonData: TransformedData[] = [];

for (let d in bosData) {
  transformedBosData.push(transformData({
    data: bosData[d],
    width,
    height,
    colorMap: colorMap,
  }))
  transformedNyData.push(transformData({
    data: nyData[d],
    width,
    height,
    colorMap: colorMap,
  }))
  comparisonData.push(transformData({
      // eslint-disable-next-line
    data: bosData[d].map(d => ({...d, value: d.value / bostonTotal})),
      // eslint-disable-next-line
    comparisonData: nyData[d].map(d => ({...d, value: d.value / newYorkTotal})),
    width,
    height,
    colorMap: colorMap,
  }))
}

//////////////////////////////////////

enum City {
  Boston = 'Boston',
  NewYork = 'New York',
  Comparison = 'Comparison',
}


enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

const App = () => {
  const [city, setCity] = useState<City>(City.Boston);
  const [digit, setDigit] = useState<number>(0);
  const [clicked, setClicked] = useState<string | null>(null)

  const tooltipContent = (id: string) => {
    const current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id.toString() === id);
    if (current) {
      return current.name;
    } else {
      return id;
    }
  }

  let dataset: TransformedData[] = [] 
  if (city === City.Boston) {
    dataset = transformedBosData;
  } else if (city === City.NewYork) {
    dataset = transformedNyData;
  } else {
    dataset = comparisonData;
  }

  const highlighted = dataset[digit].treeMapCells.find(d => d.id === clicked);
  const tooltipCoords: React.CSSProperties | undefined = highlighted ? {
    left: highlighted.x0 + ((highlighted.x1 - highlighted.x0) / 2),
    top: highlighted.y0,
  } : undefined;

  return (
    <div>
      <Nav>
        <Button
          onClick={() => setCity(City.Boston)}
          disabled={city === City.Boston}
        >
          Boston
        </Button>
        <Button
          onClick={() => setCity(City.NewYork)}
          disabled={city === City.NewYork}
        >
          New York
        </Button>
        <Button
          onClick={() => setCity(City.Comparison)}
          disabled={digit > 3 || city === City.Comparison}
        >
          Comparison
        </Button>
      </Nav>
      <Nav>
        <Button
          onClick={() => setDigit(0)}
          disabled={digit === 0}
        >
          1-digit
        </Button>
        <Button
          onClick={() => setDigit(1)}
          disabled={digit === 1}
        >
          2-digit
        </Button>
        <Button
          onClick={() => setDigit(2)}
          disabled={digit === 2}
        >
          3-digit
        </Button>
        <Button
          onClick={() => setDigit(3)}
          disabled={digit === 3}
        >
          4-digit
        </Button>
        <Button
          onClick={() => setDigit(4)}
          disabled={city === City.Comparison || digit === 4}
        >
          5-digit
        </Button>
        <Button
          onClick={() => setDigit(5)}
          disabled={city === City.Comparison || digit === 5}
        >
          6-digit
        </Button>
      </Nav>
      <h3>{city}: {digit + 1}-digit</h3>
      <Container>
        <TreeMap
          highlighted={'11'}
          cells={dataset[digit].treeMapCells}
          numCellsTier={NumCellsTier.Small}
          chartContainerWidth={width}
          chartContainerHeight={height}
          onCellClick={setClicked}
          onMouseOverCell={id => console.log('Hovered on: ' + tooltipContent(id))}
          onMouseLeaveChart={() => {}}
          comparisonTreeMap={city === City.Comparison ? true : false}
        />
        <MockTooltip
          style={tooltipCoords}
        />
      </Container>
    </div>
  );
}

export default App
