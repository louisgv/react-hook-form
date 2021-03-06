import removeAllEventListeners from './removeAllEventListeners';
import isRadioInput from '../utils/isRadioInput';
import { Field, FieldsObject } from '../type';

export default function findRemovedFieldAndRemoveListener(
  fields: { [key: string]: Field },
  validateWithStateUpdate: Function,
  { ref, mutationWatcher, options }: Field,
  forceDelete: boolean = false,
): FieldsObject | undefined {
  if (!ref) return;

  const { name, type } = ref;
  if (isRadioInput(type) && options) {
    const optionsCopy = fields[name].options;
    options.forEach(
      ({ ref }, index): void => {
        if (!document.body.contains(ref) && fields[name] && optionsCopy && optionsCopy[index]) {
          removeAllEventListeners(optionsCopy[index], validateWithStateUpdate);
          (optionsCopy[index].mutationWatcher || { disconnect: (): void => {} }).disconnect();
          optionsCopy.splice(index, 1);
        }
      },
    );

    if (Array.isArray(optionsCopy) && !optionsCopy.length) {
      delete fields[name];
      return fields;
    }
  } else if (!document.body.contains(ref) || forceDelete) {
    removeAllEventListeners(ref, validateWithStateUpdate);
    if (mutationWatcher) mutationWatcher.disconnect();
    delete fields[name];
    return fields;
  }

  return fields;
}
