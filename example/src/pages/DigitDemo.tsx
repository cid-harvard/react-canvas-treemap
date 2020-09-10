import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap, {transformData} from 'react-canvas-treemap';
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

interface RawDatum {
  id: number,
  city_id: number,
  year: number,
  naics_id: number,
  num_employ: number,
  num_company: number,
  level: number,
}

const rawData: RawDatum[][]  = [
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_1.json')),
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_2.json')),
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_3.json')),
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_4.json')),
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_5.json')),
  JSON.parse(raw('../data/boston_naics_sample/boston_sample_naics_6.json')),
]

interface PreparedDatum {
  id: string,
  title: string,
  value: number,
  topLevelParentId: string,
}

const data: PreparedDatum[][] = rawData.map(d => d.map(({naics_id, num_company}) => {
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

  return {
    id: naics_id.toString(),
    title,
    value: num_company,
    topLevelParentId,
  }
}));

const width = 800;
const height = 600;

const transformedData = data.map(d => transformData({
  data: d,
  width,
  height,
  colorMap: colorMap,
}))

enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

const App = () => {
  const [digit, setDigit] = useState<number>(0);

  const tooltipContent = (id: string) => {
    const current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id.toString() === id);
    if (current) {
      return current.name;
    } else {
      return id;
    }
  }

  return (
    <div>
      <Nav>
        <Button
          onClick={() => setDigit(0)}
        >
          1-digit
        </Button>
        <Button
          onClick={() => setDigit(1)}
        >
          2-digit
        </Button>
        <Button
          onClick={() => setDigit(2)}
        >
          3-digit
        </Button>
        <Button
          onClick={() => setDigit(3)}
        >
          4-digit
        </Button>
        <Button
          onClick={() => setDigit(4)}
        >
          5-digit
        </Button>
        <Button
          onClick={() => setDigit(5)}
        >
          6-digit
        </Button>
      </Nav>
      <h3>{digit + 1}-digit</h3>
      <Container>
        <TreeMap
          highlighted={undefined}
          cells={transformedData[digit].treeMapCells}
          numCellsTier={NumCellsTier.Small}
          chartContainerWidth={width}
          chartContainerHeight={height}
          onCellClick={id => alert('Clicked: ' + tooltipContent(id))}
          onMouseOverCell={id => console.log('Hovered on: ' + tooltipContent(id))}
          onMouseLeaveChart={() => {}}
        />
      </Container>
    </div>
  );
}

export default App
