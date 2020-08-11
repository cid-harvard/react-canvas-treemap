import {
  useEffect,
  useRef,
} from 'react';

// This ref always tracks the value of `value`:
export default <T>(value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
};
