import { useRef, useState, useEffect } from 'react';
import getFieldsValues from './logic/getFieldsValues';
import validateField from './logic/validateField';
import findRemovedFieldAndRemoveListener from './logic/findRemovedFieldAndRemoveListener';
import getFieldValue from './logic/getFieldValue';
import attachEventListeners from './logic/attachEventListeners';
import validateWithSchema from './logic/validateWithSchema';
import combineFieldValues from './logic/combineFieldValues';
import shouldUpdateWithError from './logic/shouldUpdateWithError';
import warnMissingRef from './utils/warnMissingRef';
import modeChecker from './utils/validationModeChecker';
import onDomRemove from './utils/onDomRemove';
import isRadioInput from './utils/isRadioInput';
import isEmptyObject from './utils/isEmptyObject';
import {
  Props,
  Field,
  ErrorMessages,
  Ref,
  SubmitPromiseResult,
  FieldsObject,
  VoidFunction,
  UseFormFunctions,
  RegisterFunction,
  FieldValue,
  RegisterInput,
} from './type';

export default function useForm(
  { mode, validationSchema }: Props = {
    mode: 'onSubmit',
  },
): UseFormFunctions {
  const fieldsRef = useRef<FieldsObject>({});
  const errorsRef = useRef<ErrorMessages>({});
  const submitCountRef = useRef<number>(0);
  const touchedFieldsRef = useRef<string[]>([]);
  const watchFieldsRef = useRef<{ [key: string]: boolean }>({});
  const isWatchAllRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isSubmittedRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const reRenderForm = useState({})[1];

  async function validateAndStateUpdate({ target: { name }, type }: Ref): Promise<void> {
    const fields = fieldsRef.current;
    const errors = errorsRef.current;
    const ref = fields[name];
    const { isOnChange, isOnSubmit, isOnBlur } = modeChecker(mode);
    const onSubmitModeNotSubmitted = !isSubmittedRef.current && (isOnSubmit || !mode);
    const isWatchAll = isWatchAllRef.current;
    const shouldUpdateWatchMode = isWatchAll || watchFieldsRef.current[name];
    const shouldUpdateValidateMode = isOnChange || (isOnBlur && type === 'blur');
    let shouldUpdateState = isWatchAll;

    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      shouldUpdateState = true;
    }

    if (!touchedFieldsRef.current.includes(name)) {
      touchedFieldsRef.current.push(name);
      shouldUpdateState = true;
    }

    if (onSubmitModeNotSubmitted && shouldUpdateWatchMode) return reRenderForm({});

    if (validationSchema) {
      const result = getFieldsValues(fields);
      const error = (await validateWithSchema(validationSchema, result)) || {};
      const shouldUpdate = ((!error[name] && errors[name]) || error[name]) && shouldUpdateValidateMode;

      if (shouldUpdate || shouldUpdateWatchMode) {
        const errorsCopy = { ...errors, ...{ [name]: error[name] } };
        if (!error[name]) delete errorsCopy[name];

        errorsRef.current = errorsCopy;
        return reRenderForm({});
      }
    } else {
      const error = await validateField(ref, fields);
      const shouldUpdate = shouldUpdateWithError({
        errors,
        error,
        onSubmitModeNotSubmitted,
        isOnBlur,
        name,
        type,
      });

      if (shouldUpdate || shouldUpdateValidateMode || shouldUpdateWatchMode) {
        const errorsCopy = { ...errors, ...error };
        if (!error[name]) delete errorsCopy[name];

        errorsRef.current = errorsCopy;
        return reRenderForm({});
      }
    }

    if (shouldUpdateState) reRenderForm({});
  }

  const removeEventListener: Function = findRemovedFieldAndRemoveListener.bind(
    null,
    fieldsRef.current,
    validateAndStateUpdate,
  );

  function registerIntoAllFields(elementRef, data = { required: false, validate: undefined }): void {
    if (elementRef && !elementRef.name) return warnMissingRef(elementRef);

    const { name, type, value } = elementRef;
    const { required, validate } = data;
    const inputData = {
      ...data,
      ref: elementRef,
    };
    const fields = fieldsRef.current;
    const isRadio = isRadioInput(type);
    const field = fields[name];
    const existRadioOptionIndex =
      isRadio && field && Array.isArray(field.options)
        ? field.options.findIndex(({ ref }): boolean => value === ref.value)
        : -1;

    if ((!isRadio && field) || (isRadio && existRadioOptionIndex > -1)) return;

    if (isRadio) {
      if (!field) fields[name] = { options: [], required, validate, ref: { type: 'radio', name } };
      if (validate) fields[name].validate = validate;

      (fields[name].options || []).push({
        ...inputData,
        mutationWatcher: onDomRemove(elementRef, (): Function => removeEventListener(inputData, true)),
      });
    } else {
      fields[name] = {
        ...inputData,
        mutationWatcher: onDomRemove(elementRef, (): Function => removeEventListener(inputData, true)),
      };
    }

    attachEventListeners({
      field: isRadio ? (fields[name].options || [])[(fields[name].options || []).length - 1] : fields[name],
      isRadio,
      validateAndStateUpdate,
    });
  }

  function watch(
    filedNames?: string | string[] | undefined,
    defaultValue?: string | string[] | undefined,
  ): FieldValue | FieldValue[] | undefined {
    const watchFields = watchFieldsRef.current;

    if (typeof filedNames === 'string') {
      watchFields[filedNames] = true;
    } else if (Array.isArray(filedNames)) {
      filedNames.forEach(
        (name): void => {
          watchFields[name] = true;
        },
      );
    } else {
      isWatchAllRef.current = true;
      watchFieldsRef.current = {};
    }

    const values = getFieldsValues(fieldsRef.current, filedNames);
    const result = values === undefined || isEmptyObject(values) ? undefined : values;
    return result === undefined ? defaultValue : result;
  }

  function register(data: Ref | RegisterInput): RegisterFunction | undefined {
    if (!data) return;
    if (data.type) {
      if (!data.name) {
        warnMissingRef(data);
        return;
      }
      registerIntoAllFields(data);
    }

    return (ref): void => ref && registerIntoAllFields(ref, data);
  }

  const handleSubmit = (callback: (Object, e) => void): Function => async (e): Promise<void> => {
    if (e) {
      e.preventDefault();
      e.persist();
    }
    let fieldErrors;
    let fieldValues;
    const fields = fieldsRef.current;
    const currentFieldValues = Object.values(fields);
    isSubmittedRef.current = true;
    isSubmittingRef.current = true;
    reRenderForm({});
    submitCountRef.current += 1;

    if (validationSchema) {
      fieldValues = getFieldsValues(fields);
      fieldErrors = await validateWithSchema(validationSchema, fieldValues);

      if (fieldErrors === undefined) {
        isSubmittingRef.current = false;
        reRenderForm({});
        return callback(combineFieldValues(fieldValues), e);
      }
    } else {
      const result: SubmitPromiseResult = await currentFieldValues.reduce(
        async (previous: Promise<SubmitPromiseResult>, field: Field): Promise<SubmitPromiseResult> => {
          const resolvedPrevious = await previous;
          const {
            ref,
            ref: { name },
          } = field;

          if (!fields[name]) return Promise.resolve(resolvedPrevious);

          const fieldError = await validateField(field, fields);
          const hasError = fieldError && fieldError[name];

          if (!hasError) {
            resolvedPrevious.values[name] = getFieldValue(fields, ref);
            return Promise.resolve(resolvedPrevious);
          }

          resolvedPrevious.errors = { ...(resolvedPrevious.errors || {}), ...fieldError };
          return Promise.resolve(resolvedPrevious);
        },
        Promise.resolve({
          errors: {},
          values: {},
        }),
      );

      fieldErrors = result.errors;
      fieldValues = result.values;
    }

    isSubmittingRef.current = false;

    if (!isEmptyObject(fieldErrors)) {
      errorsRef.current = fieldErrors;
    } else {
      callback(combineFieldValues(fieldValues), e);
    }

    reRenderForm({});
  };

  const unSubscribe = (): void => {
    fieldsRef.current &&
      Object.values(fieldsRef.current).forEach(
        (field: Field): void => {
          const { ref, options } = field;
          isRadioInput(ref.type) && Array.isArray(options)
            ? options.forEach((fieldRef): void => removeEventListener(fieldRef, true))
            : removeEventListener(field, true);
        },
      );
    fieldsRef.current = {};
    watchFieldsRef.current = {};
    errorsRef.current = {};
    isWatchAllRef.current = false;
    isSubmittedRef.current = false;
    isDirtyRef.current = false;
    touchedFieldsRef.current = [];
  };

  useEffect((): VoidFunction => unSubscribe, [mode]);

  return {
    register,
    handleSubmit,
    watch,
    unSubscribe,
    errors: errorsRef.current,
    formState: {
      dirty: isDirtyRef.current,
      isSubmitted: isSubmittedRef.current,
      submitCount: submitCountRef.current,
      touched: touchedFieldsRef.current,
      isSubmitting: isSubmittingRef.current,
    },
  };
}
