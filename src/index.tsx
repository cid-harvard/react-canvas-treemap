import * as React from 'react'
import Chart, {IProps} from './chart/chart';
import treemapCellTransformer, {Inputs, Output} from './transformers/treemapCellTransformer';

const transformData: (inputs: Inputs) => Output = treemapCellTransformer;
export {
  transformData, Inputs, Output,
}

export default (props: IProps) => {
  return (
    <Chart {...props} />
  );
}
