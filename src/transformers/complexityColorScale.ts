import { scaleLinear } from 'd3-scale';

export const complexity01 = - 3.2189;
export const complexity02 = - 1.34486;
export const complexity03 = - 0.9396;
export const complexity04 = - 0.5408;
export const complexity05 = - 0.2043;
export const complexity06 = 0.1029;
// complexity07 is the same as complexity06
export const complexity08 = 0.3698;
export const complexity09 = 0.6236;
export const complexity10 = 0.86004;
export const complexity11 = 1.23044;
export const complexity12 = 3.5054;

export const color01 = '#e39f60';
export const color02 = '#e7ad78';
export const color03 = '#ebbc8f';
export const color04 = '#f0caa8';
export const color05 = '#f4d9bf';
export const color06 = '#f8e7d7';
export const color07 = '#c0e4e1';
export const color08 = '#9ad3cf';
export const color09 = '#74c3bd';
export const color10 = '#4db2ab';
export const color11 = '#28a299';
export const color12 = '#029287';

const scale0102 = scaleLinear<string>().domain([complexity01, complexity02]).range([color01, color02]);
const scale0203 = scaleLinear<string>().domain([complexity02, complexity03]).range([color02, color03]);
const scale0304 = scaleLinear<string>().domain([complexity03, complexity04]).range([color03, color04]);
const scale0405 = scaleLinear<string>().domain([complexity04, complexity05]).range([color04, color05]);
const scale0506 = scaleLinear<string>().domain([complexity05, complexity06]).range([color05, color06]);
const scale0708 = scaleLinear<string>().domain([complexity06, complexity08]).range([color07, color08]);
const scale0809 = scaleLinear<string>().domain([complexity08, complexity09]).range([color08, color09]);
const scale0910 = scaleLinear<string>().domain([complexity09, complexity10]).range([color09, color10]);
const scale1011 = scaleLinear<string>().domain([complexity10, complexity11]).range([color10, color11]);
const scale1112 = scaleLinear<string>().domain([complexity11, complexity12]).range([color11, color12]);

const colorScale = (complexity: number): string => {
  if (complexity < complexity01) {
    return color01;
  } else if (complexity < complexity02) {
    return scale0102(complexity);
  } else if (complexity < complexity03) {
    return scale0203(complexity);
  } else if (complexity < complexity04) {
    return scale0304(complexity);
  } else if (complexity < complexity05) {
    return scale0405(complexity);
  } else if (complexity < complexity06) {
    return scale0506(complexity);
  } else if (complexity < complexity08) {
    return scale0708(complexity);
  } else if (complexity < complexity09) {
    return scale0809(complexity);
  } else if (complexity < complexity10) {
    return scale0910(complexity);
  } else if (complexity < complexity11) {
    return scale1011(complexity);
  } else if (complexity < complexity12) {
    return scale1112(complexity);
  } else {
    return color12;
  }
};

export default colorScale;
