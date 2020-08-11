import {
  useEffect,
  useRef,
} from 'react';

export interface PropsChangeHandlerInput<PropsChangeHandlerExtraInputs, Props> {
  prevValue: Props | undefined;
  nextValue: Props;
  extraInputs: PropsChangeHandlerExtraInputs;
  done: () => void;
}

interface IInput<PropsChangeHandlerExtraInputs, Props> {
  getExtraInputToPropsChangeHandler: () => PropsChangeHandlerExtraInputs;
  value: Props;
  performPropsChange: (input: PropsChangeHandlerInput<PropsChangeHandlerExtraInputs, Props>) => void;
}

export default <PropsChangeHandlerExtraInputs, Props>(
    input: IInput<PropsChangeHandlerExtraInputs, Props>) => {

  const {
    value, getExtraInputToPropsChangeHandler,
    performPropsChange,
  } = input;
  const nextValueRef = useRef<Props | undefined>(undefined);
  const prevValueRef = useRef<Props | undefined>(undefined);
  const isTransitionInProgressRef = useRef<boolean>(false);

  const onPropsChangeComplete = () => {
    isTransitionInProgressRef.current = false;
    performNextValueChange();
  };

  const performNextValueChange = () => {
    const {current: nextValue} = nextValueRef;
    const {current: prevValue} = prevValueRef;
    if (nextValue !== undefined && isTransitionInProgressRef.current === false) {
      prevValueRef.current = nextValue;
      nextValueRef.current = undefined;
      if (prevValue === undefined) {
        isTransitionInProgressRef.current = true;
        const extraInputs = getExtraInputToPropsChangeHandler();
        performPropsChange({
          prevValue, nextValue,
          extraInputs, done: onPropsChangeComplete,
        });
      } else {
        if (nextValue !== prevValue) {
          isTransitionInProgressRef.current = true;
          const extraInputs = getExtraInputToPropsChangeHandler();
          performPropsChange({
            prevValue, nextValue,
            extraInputs, done: onPropsChangeComplete,
          });
        }
      }
    }
  };

  useEffect(() => {
    nextValueRef.current = value;
    performNextValueChange();
  }, [value]);

  return {
    isTransitionInProgress: () => isTransitionInProgressRef.current,
  };
};
