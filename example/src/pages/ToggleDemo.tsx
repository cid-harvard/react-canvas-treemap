import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap, {transformData} from 'react-canvas-treemap';
import styled from 'styled-components/macro';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 500px 500px;
  grid-gap: 1rem;
  margin-bottom: 2rem;
`;

const destBostonDataRaw = JSON.parse(raw('../data/treemap_dest_boston_all_industry.json'));

let colorMap: Array<{id: string, color: string}> = [];
destBostonDataRaw.forEach(({topLevelParentId, color}: {topLevelParentId: string, color: string}) => {
  if (!colorMap.find(({id}) => id === topLevelParentId)) {
    colorMap.push({id: topLevelParentId, color});
  }
})

const destBostonData = transformData({
  data: destBostonDataRaw,
  width: 500,
  height: 500,
  colorMap: colorMap,
});


const originBostonDataRaw = JSON.parse(raw('../data/treemap_origin_boston_all_industry.json'));

const originBostonData = transformData({
  data: originBostonDataRaw,
  width: 500,
  height: 500,
  colorMap: colorMap,
});


const employeeBostonDataRaw = JSON.parse(raw('../data/boston_dest_employees.json'));

let cityColorMap: Array<{id: string, color: string}> = [];
employeeBostonDataRaw.forEach(({topLevelParentId, color}: {topLevelParentId: string, color: string}) => {
  if (!cityColorMap.find(({id}) => id === topLevelParentId)) {
    cityColorMap.push({id: topLevelParentId, color});
  }
})

const employeeBostonData = transformData({
  data: employeeBostonDataRaw,
  width: 500,
  height: 500,
  colorMap: cityColorMap,
});

const filteredToUSA = employeeBostonDataRaw.filter(({topLevelParentId}: {topLevelParentId: string}) => topLevelParentId === 'USA');

const filteredBostonData = transformData({
  data: filteredToUSA,
  width: 500,
  height: 500,
  colorMap: cityColorMap,
});


enum NumCellsTier {
  // Use `Small` for all type of tree maps except for product tree maps at
  // 6-digit detail level:
  Small,
  Large,
}


enum Direction {
  Dest,
  Origin,
}

const App = () => {
  const [direction, setDirection] = useState<Direction>(Direction.Dest);
  const [filtered, setFiltered] = useState<boolean>(false);

  const toggleDirection = () => {
    if (direction === Direction.Dest) {
      setDirection(Direction.Origin);
    } else {
      setDirection(Direction.Dest);
    }
  }

  return (
    <div>
      <Grid>
        <div>
          <button onClick={toggleDirection}>
            Toggle Data
          </button>
          <TreeMap
            highlighted={undefined}
            cells={direction === Direction.Dest ? destBostonData.treeMapCells : originBostonData.treeMapCells}
            numCellsTier={NumCellsTier.Small}
            chartContainerWidth={500}
            chartContainerHeight={500}
            onCellClick={id => console.log(id)}
            onMouseOverCell={id => console.log(id)}
            onMouseLeaveChart={() => {}}
          />
        </div>
        <div>
          <button onClick={() => setFiltered(!filtered)}>
            Toggle Filter
          </button>
          <TreeMap
            highlighted={undefined}
            cells={filtered ? filteredBostonData.treeMapCells : employeeBostonData.treeMapCells}
            numCellsTier={NumCellsTier.Small}
            chartContainerWidth={500}
            chartContainerHeight={500}
            onCellClick={id => console.log(id)}
            onMouseOverCell={id => console.log(id)}
            onMouseLeaveChart={() => {}}
          />
        </div>
      </Grid>
    </div>
  );
}

export default App
