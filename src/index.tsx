import * as React from 'react'
import Chart, {IProps} from './chart/chart';
import treemapCellTransformer from './transformers/treemapCellTransformer';

export const transformData = treemapCellTransformer;

export default (props: IProps) => {
  return (
    <Chart {...props} />
  );
}
