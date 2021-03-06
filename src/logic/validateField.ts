import getRadioValue from './getRadioValue';
import isRadioInput from '../utils/isRadioInput';
import { DATE_INPUTS, STRING_INPUTS } from '../constants';
import { Field, Ref } from '../type';
import getValueAndMessage from './getValueAndMessage';
import isCheckBox from '../utils/isCheckBox';

type ValidatePromiseResult =
  | {}
  | void
  | {
      type: string;
      message: string | number | boolean | Date;
    };

export default async (
  {
    ref,
    ref: { type, value, name, checked },
    options,
    required,
    maxLength,
    minLength,
    min,
    max,
    pattern,
    validate,
  }: Field,
  fields: { [key: string]: Field },
): Promise<{
  [key: string]: {
    type: string;
    message: string;
    ref: Ref;
  };
}> => {
  const copy = {};
  const isRadio = isRadioInput(type);

  if (
    required &&
    ((isCheckBox(type) && !checked) ||
      (!isRadio && type !== 'checkbox' && value === '') ||
      (isRadio && !getRadioValue(fields[name].options).isValid))
  ) {
    copy[name] = {
      type: 'required',
      message: typeof required === 'string' ? required : '',
      ref: isRadio && fields[name] ? (fields[name].options || [{ ref: '' }])[0].ref : ref,
    };
    return copy;
  }

  if (min || max) {
    let exceedMax;
    let exceedMin;
    const valueNumber = parseFloat(value);

    const { value: maxValue, message: maxMessage } = getValueAndMessage(max);
    const { value: minValue, message: minMessage } = getValueAndMessage(min);

    if (type === 'number') {
      exceedMax = maxValue && valueNumber > maxValue;
      exceedMin = minValue && valueNumber < minValue;
    } else if (DATE_INPUTS.includes(type)) {
      if (typeof maxValue === 'string') exceedMax = maxValue && new Date(value) > new Date(maxValue);
      if (typeof minValue === 'string') exceedMin = minValue && new Date(value) < new Date(minValue);
    }

    if (exceedMax) {
      copy[name] = {
        ...copy[name],
        type: 'max',
        message: maxMessage,
        ref,
      };
      return copy;
    }

    if (exceedMin) {
      copy[name] = {
        ...copy[name],
        type: 'min',
        message: minMessage,
        ref,
      };
      return copy;
    }
  }

  if ((maxLength || minLength) && STRING_INPUTS.includes(type)) {
    const { value: maxLengthValue, message: maxLengthMessage } = getValueAndMessage(maxLength);
    const { value: minLengthValue, message: minLengthMessage } = getValueAndMessage(minLength);

    const exceedMax = maxLength && value.toString().length > maxLengthValue;
    const exceedMin = minLength && value.toString().length < minLengthValue;

    if (exceedMax) {
      copy[name] = {
        ...copy[name],
        type: 'maxLength',
        message: maxLengthMessage,
        ref,
      };
      return copy;
    }

    if (exceedMin) {
      copy[name] = {
        ...copy[name],
        type: 'minLength',
        message: minLengthMessage,
        ref,
      };
      return copy;
    }
  }

  if (pattern) {
    const { value: patternValue, message: patternMessage } = getValueAndMessage(pattern);
    if (patternValue instanceof RegExp && !patternValue.test(value)) {
      copy[name] = {
        ...copy[name],
        type: 'pattern',
        message: patternMessage,
        ref,
      };
      return copy;
    }
  }

  if (validate) {
    const fieldValue = isRadio ? getRadioValue(options).value : value;

    if (typeof validate === 'function') {
      const result = await validate(fieldValue);
      if (typeof result !== 'boolean' || !result) {
        copy[name] = {
          ...copy[name],
          type: 'validate',
          message: typeof result === 'string' ? result : '',
          ref: isRadio && options ? options[0].ref : ref,
        };
        return copy;
      }
    } else if (typeof validate === 'object') {
      const result = await new Promise(
        (resolve): ValidatePromiseResult => {
          const values = Object.entries(validate);
          values.reduce(async (previous, [key, validate], index): Promise<ValidatePromiseResult> => {
            const lastChild = values.length - 1 === index;

            if (typeof validate === 'function') {
              const result = await validate(fieldValue);

              if (result !== undefined) {
                const temp = {
                  type: key,
                  message: typeof result === 'string' ? result : '',
                  ref: isRadio && options ? options[0].ref : ref,
                };
                return lastChild ? resolve(temp) : temp;
              }
            }

            return lastChild ? resolve(previous) : previous;
          }, {});
        },
      );

      if (result && Object.keys(result).length) {
        copy[name] = {
          ...copy[name],
          ref: isRadio && options ? options[0].ref : ref,
          ...result,
        };
        return copy;
      }
    }
  }

  return copy;
};
