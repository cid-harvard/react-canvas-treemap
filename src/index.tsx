import * as React from 'react'
import Chart, {IProps} from './chart/chart';
import treemapCellTransformer, {Inputs, Output} from './transformers/treemapCellTransformer';

export const transformData: (inputs: Inputs) => Output = treemapCellTransformer;

export default (props: IProps) => {
  return (
    <Chart {...props} />
  );
}
