import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap, {
  transformData
} from 'react-canvas-treemap';

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

interface NaicsDatum {
  naics_id: number,
  code: string,
  name: string,
  level: number,
  parent_id: number | null,
  parent_code: string | null,
  code_hierarchy: string,
  naics_id_hierarchy: string,
}

const naicsData: NaicsDatum[] = JSON.parse(raw('../data/naics_2017.json'));

interface RawDatum {
  id: string,
  title: string,
  value: number,
  topLevelParentId: string,
}

let bostonTotal = 0;
const bostonData: RawDatum[] = [];
JSON.parse(raw('../data/boston-3digit-shares.json'))
  .forEach(({naics_id, num_employ}: {naics_id: number, num_employ: number}) => {
    const industry = naicsData.find(d => d.naics_id === naics_id);
    let topLevelParentId: string = naics_id.toString();
    let current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id === naics_id);
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
    if (industry) {
      bostonTotal += num_employ;
      bostonData.push({
        id: naics_id.toString(),
        title: industry.name,
        value: num_employ,
        topLevelParentId,
      })
    }
  });

let newYorkTotal = 0;
const newYorkData: RawDatum[] = [];
JSON.parse(raw('../data/newyork-3digit-shares.json'))
  .forEach(({naics_id, num_employ}: {naics_id: number, num_employ: number}) => {
    const industry = naicsData.find(d => d.naics_id === naics_id);
    let topLevelParentId: string = naics_id.toString();
    let current: NaicsDatum | undefined = naicsData.find(datum => datum.naics_id === naics_id);
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
    if (industry) {
      newYorkTotal += num_employ;
      newYorkData.push({
        id: naics_id.toString(),
        title: industry.name,
        value: num_employ,
        topLevelParentId,
      })
    }
  });

const width = 800;
const height = 600;

const transformedData = transformData({
  data: bostonData,
  comparisonData: newYorkData,
  width,
  height,
  colorMap,
});

const transformedPercentData = transformData({
  data: bostonData.map(d => ({...d, value: d.value / bostonTotal})),
  comparisonData: newYorkData.map(d => ({...d, value: d.value / newYorkTotal})),
  width,
  height,
  colorMap,
});

enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

const App = () => {
  const [filtered, setFiltered] = useState<boolean>(false);
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column'}}>
      <div style={{marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <h4 style={{marginRight: '1rem'}}>Comparison of {filtered ? 'share percentages' : 'absolute values'}</h4>
        <button onClick={() => setFiltered(!filtered)}>
          {filtered ? 'Switch to absolute values' : 'Switch to share percentages'}
        </button>
      </div>
      <TreeMap
        highlighted={undefined}
        cells={!filtered ? transformedData.treeMapCells : transformedPercentData.treeMapCells}
        numCellsTier={NumCellsTier.Small}
        chartContainerWidth={width}
        chartContainerHeight={height}
        onCellClick={id => console.log(id)}
        onMouseOverCell={id => console.log(id)}
        onMouseLeaveChart={() => {}}
        comparisonTreeMap={true}
      />
    </div>
  );
}

export default App
