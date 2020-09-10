import React from 'react'
import raw from 'raw.macro';
import TreeMap, {
  transformData
} from 'react-canvas-treemap';

const colorMap = [
  { id: '0', color: '#2b005c' },
  { id: '1', color: '#630061' },
  { id: '2', color: '#91005e' },
  { id: '3', color: '#b90056' },
  { id: '4', color: '#d92649' },
  { id: '5', color: '#f05238' },
  { id: '6', color: '#fc7c23' },
  { id: '7', color: '#ffa600' },
  { id: '8', color: 'red' },
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
      bostonData.push({
        id: naics_id.toString(),
        title: industry.name,
        value: num_employ,
        topLevelParentId,
      })
    }
  });

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

enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}

const App = () => {
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
      <TreeMap
        highlighted={undefined}
        cells={transformedData.treeMapCells}
        numCellsTier={NumCellsTier.Small}
        chartContainerWidth={width}
        chartContainerHeight={height}
        onCellClick={id => console.log(id)}
        onMouseOverCell={id => console.log(id)}
        onMouseLeaveChart={() => {}}
      />
    </div>
  );
}

export default App
