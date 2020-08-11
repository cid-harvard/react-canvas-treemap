import React, {useState} from 'react'
import raw from 'raw.macro';
import TreeMap, {transformData} from 'react-canvas-treemap';
import styled from 'styled-components/macro';
// import {CSSPlugin} from 'gsap';

// // Need to do this so that `CSSPlugin` is not dropped by the minifier:
// if (!CSSPlugin) {
//   console.error('CSSPlugin failed to load', CSSPlugin);
// }

const Grid = styled.div`
  display: grid;
  grid-template-columns: 500px 500px;
  grid-gap: 1rem;
  margin-bottom: 2rem;
`;

const destBostonDataRaw = JSON.parse(raw('./data/treemap_dest_boston_all_industry.json'));

let destColorMap: Array<{id: string, color: string}> = [];
destBostonDataRaw.forEach(({topLevelParentId, color}: {topLevelParentId: string, color: string}) => {
  if (!destColorMap.find(({id}) => id === topLevelParentId)) {
    destColorMap.push({id: topLevelParentId, color});
  }
})

const destBostonData = transformData({
  data: destBostonDataRaw,
  width: 500,
  height: 500,
  colorMap: destColorMap,
});


const originBostonDataRaw = JSON.parse(raw('./data/treemap_origin_boston_all_industry.json'));

let originColorMap: Array<{id: string, color: string}> = [];
originBostonDataRaw.forEach(({topLevelParentId, color}: {topLevelParentId: string, color: string}) => {
  if (!originColorMap.find(({id}) => id === topLevelParentId)) {
    originColorMap.push({id: topLevelParentId, color});
  }
})

const originBostonData = transformData({
  data: originBostonDataRaw,
  width: 500,
  height: 500,
  colorMap: destColorMap,
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

  const toggleDirection = () => {
    if (direction === Direction.Dest) {
      setDirection(Direction.Origin);
    } else {
      setDirection(Direction.Dest);
    }
  }

  return (
    <div>
      <div>
        <button onClick={toggleDirection}>
          Toggle Data
        </button>
      </div>
      <Grid>
        <div>
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
          <TreeMap
            highlighted={undefined}
            cells={direction === Direction.Origin ? destBostonData.treeMapCells : originBostonData.treeMapCells}
            numCellsTier={NumCellsTier.Small}
            chartContainerWidth={500}
            chartContainerHeight={500}
            onCellClick={id => console.log(id)}
            onMouseOverCell={id => console.log(id)}
            onMouseLeaveChart={() => {}}
          />
        </div>
      </Grid>
      <Grid>
        <div>
          <TreeMap
            highlighted={undefined}
            cells={direction === Direction.Origin ? destBostonData.treeMapCells : originBostonData.treeMapCells}
            numCellsTier={NumCellsTier.Small}
            chartContainerWidth={500}
            chartContainerHeight={500}
            onCellClick={id => console.log(id)}
            onMouseOverCell={id => console.log(id)}
            onMouseLeaveChart={() => {}}
          />
        </div>
        <div>
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
      </Grid>
    </div>
  );
}

export default App
