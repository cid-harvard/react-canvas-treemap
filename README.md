# react-canvas-treemap

## by the Growth Lab at Harvard's Center for International Development

Canvas based Treemap data visualization using React.

> This package is part of Harvard Growth Lab’s portfolio of software packages, digital products and interactive data visualizations. To browse our entire portfolio, please visit The Viz Hub at [growthlab.app](https://growthlab.app/). To learn more about our research, please visit [Harvard Growth Lab’s](https://growthlab.cid.harvard.edu/) home page.

[![NPM](https://img.shields.io/npm/v/react-canvas-treemap.svg)](https://www.npmjs.com/package/react-canvas-treemap) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

### [View live examples ↗](https://cid-harvard.github.io/react-canvas-treemap/)

## Install

```bash
npm install --save react-canvas-treemap
```

## Usage

```tsx
import React from 'react'
import TreeMap, {transformData} from 'react-canvas-treemap';

const App = () => {

  ...
  const data = transformData({
    data: fetchedData,
    width: 500,
    height: 500,
    colorMap: colorMap,
  });

  return (
    <TreeMap
      highlighted={undefined}
      cells={data.treeMapCells}
      numCellsTier={0}
      chartContainerWidth={500}
      chartContainerHeight={500}
      onCellClick={id => console.log(id)}
      onMouseOverCell={id => console.log(id)}
      onMouseLeaveChart={() => {}}
    />
  )
}

export default App

```
The TreeMap component takes the following props:

- **highlighted**: `string | undefined`
- **cells**: `ITreeMapCell[]`
- **comparisonTreeMap** *(optional)*: `boolean`
- **numCellsTier**: `NumCellsTier`
- **chartContainerWidth**: `number `
- **chartContainerHeight**: `number`
- **onCellClick**: `(id: string) => void`
- **onMouseOverCell**: `(id: string) => void`
- **onMouseLeaveChart**: `() => void`

## License

MIT © [The President and Fellows of Harvard College](https://www.harvard.edu/)

> :warning: **License**: While this package has a MIT license, it uses [Greensock](https://greensock.com/), which is not an Open-Source software. All of the Greensock Code used here falls within their "No Charge" License. If you intend to use this package, make sure to familiarize yourself with the [Greensock "No Charge" License](https://greensock.com/standard-license/).
