import {flushPromises, mount} from '@vue/test-utils';
import {defineComponent, h, nextTick, ref} from 'vue';
import {describe, expect, it} from 'vitest';
import {createVuetify} from 'vuetify';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
import IWord from '@/components/IWord.vue';

const mountWithVuetify = (
  component: Parameters<typeof mount>[0],
  props: Record<string, unknown> = {},
) => {
  return mount(component, {
    props,
    attachTo: document.body,
    global: {
      plugins: [createVuetify()],
    },
  });
};

const expectAutocompleteDisabled = (element: Element): void => {
  const fields = element.querySelectorAll<HTMLInputElement>(
    '.v-otp-input__field',
  );

  expect(fields.length).toBeGreaterThan(0);
  fields.forEach((field, index) => {
    expect(field.autocomplete).toBe('off');
    expect(field.name).toMatch(new RegExp(`^manual-otp-.+-${index}$`));
    expect(field.getAttribute('aria-autocomplete')).toBe('none');
    expect(field.getAttribute('data-form-type')).toBe('other');
    expect(field.getAttribute('data-1p-ignore')).toBe('true');
    expect(field.getAttribute('data-lpignore')).toBe('true');
    expect(field.getAttribute('data-bwignore')).toBe('true');
    expect(field.getAttribute('spellcheck')).toBe('false');
  });
};

describe('OTP autocomplete', () => {
  it('stays disabled in the word input after a rerender', async () => {
    const wrapper = mountWithVuetify(IWord, {
      modelValue: '',
      word: 'кот',
      translate: 'cat',
      lang: 'en',
    });

    await flushPromises();
    expectAutocompleteDisabled(wrapper.element);

    await wrapper.setProps({modelValue: 'c'});
    await nextTick();
    await flushPromises();
    expectAutocompleteDisabled(wrapper.element);
    wrapper.unmount();
  });

  it('is disabled in the PIN input', async () => {
    const wrapper = mountWithVuetify(IPinCodeInput);

    await flushPromises();
    expectAutocompleteDisabled(wrapper.element);

    const fields = wrapper.findAll<HTMLInputElement>(
      '.v-otp-input__field',
    );

    fields.forEach(field => {
      expect(field.element.inputMode).toBe('numeric');
      expect(field.attributes('pattern')).toBe('[0-9]*');
    });

    await fields[0].trigger('focus');
    await fields[0].setValue('1');
    await nextTick();
    await flushPromises();

    wrapper.findAll<HTMLInputElement>('.v-otp-input__field')
      .forEach(field => {
        expect(field.element.inputMode).toBe('numeric');
      });
    wrapper.unmount();
  });
});

describe('IWord keyboard layout normalization', () => {
  it('converts Russian-layout keystrokes to the expected English letters', async () => {
    const TestHost = defineComponent({
      setup() {
        const answer = ref('');

        return () => h('div', [
          h(IWord, {
            modelValue: answer.value,
            word: 'кот',
            translate: 'cat',
            lang: 'en',
            'onUpdate:modelValue': value => {
              answer.value = value;
            },
          }),
          h('span', {class: 'normalized-answer'}, answer.value),
        ]);
      },
    });
    const wrapper = mountWithVuetify(TestHost);

    await flushPromises();

    for (const [index, letter] of ['с', 'ф', 'е'].entries()) {
      const field = wrapper.findAll<HTMLInputElement>(
        '.v-otp-input__field',
      )[index];

      await field.trigger('focus');
      await field.setValue(letter);
      await flushPromises();
    }

    expect(wrapper.find('.normalized-answer').text()).toBe('CAT');
    expect(
      wrapper.findAll<HTMLInputElement>('.v-otp-input__field')
        .map(field => field.element.value)
        .join(''),
    ).toBe('CAT');
    wrapper.unmount();
  });

  it('keeps a Russian hyphen as an automatic separator', async () => {
    const TestHost = defineComponent({
      setup() {
        const answer = ref('');

        return () => h('div', [
          h(IWord, {
            modelValue: answer.value,
            word: 'coke',
            translate: 'кока-кола',
            lang: 'ru',
            'onUpdate:modelValue': value => {
              answer.value = value;
            },
          }),
          h('span', {class: 'normalized-answer'}, answer.value),
        ]);
      },
    });
    const wrapper = mountWithVuetify(TestHost);

    await flushPromises();

    const fields = wrapper.findAll<HTMLInputElement>(
      '.v-otp-input__field',
    );

    expect(fields).toHaveLength(8);
    expect(wrapper.get('[aria-label="Дефис"]').text()).toBe('-');

    for (const [index, letter] of Array.from('кокакола').entries()) {
      await fields[index].trigger('focus');
      await fields[index].setValue(letter);
      await flushPromises();
    }

    expect(wrapper.find('.normalized-answer').text()).toBe('КОКА-КОЛА');
    wrapper.unmount();
  });
});
