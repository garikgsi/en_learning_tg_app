import type {Directive} from 'vue';

type OtpAutocompleteState = {
  observer: MutationObserver
  fieldNamePrefix: string
}

const states = new WeakMap<HTMLElement, OtpAutocompleteState>();
let otpInputSequence = 0;

const setAttribute = (
  field: HTMLInputElement,
  name: string,
  value: string,
): void => {
  if (field.getAttribute(name) !== value) {
    field.setAttribute(name, value);
  }
}

const disableAutocomplete = (
  element: HTMLElement,
  fieldNamePrefix: string,
): void => {
  element
    .querySelectorAll<HTMLInputElement>('.v-otp-input__field')
    .forEach((field, index) => {
      if (field.autocomplete !== 'off') {
        field.autocomplete = 'off';
      }

      setAttribute(field, 'name', `${fieldNamePrefix}-${index}`);
      setAttribute(field, 'aria-autocomplete', 'none');
      setAttribute(field, 'autocorrect', 'off');
      setAttribute(field, 'data-1p-ignore', 'true');
      setAttribute(field, 'data-bwignore', 'true');
      setAttribute(field, 'data-form-type', 'other');
      setAttribute(field, 'data-lpignore', 'true');
      setAttribute(field, 'spellcheck', 'false');
    });
}

export const vDisableOtpAutocomplete: Directive<HTMLElement> = {
  mounted(element) {
    const fieldNamePrefix = `manual-otp-${Date.now()}-${otpInputSequence++}`;
    disableAutocomplete(element, fieldNamePrefix);

    const observer = new MutationObserver(() => {
      disableAutocomplete(element, fieldNamePrefix);
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: [
        'aria-autocomplete',
        'autocomplete',
        'autocorrect',
        'data-1p-ignore',
        'data-bwignore',
        'data-form-type',
        'data-lpignore',
        'name',
        'spellcheck',
      ],
      childList: true,
      subtree: true,
    });
    states.set(element, {
      observer,
      fieldNamePrefix,
    });
  },
  updated(element) {
    const state = states.get(element);

    if (state) {
      disableAutocomplete(element, state.fieldNamePrefix);
    }
  },
  unmounted(element) {
    states.get(element)?.observer.disconnect();
    states.delete(element);
  },
};
