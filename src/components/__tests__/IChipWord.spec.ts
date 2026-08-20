import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import IChipWord from '@/components/IChipWord.vue';

describe('IChipWord', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('shows the translation and closes the tooltip after clickout', async () => {
    wrapper = mount(IChipWord, {
      attachTo: document.body,
      global: {
        plugins: [createVuetify()],
      },
      props: {
        word: 'apple',
        translation: 'яблоко',
        language: 'en',
        color: 'red',
      },
    });

    const chip = wrapper.get('.v-chip');
    const tooltip = wrapper.findComponent({ name: 'VTooltip' });

    expect(chip.text()).toBe('apple');
    expect(chip.attributes('lang')).toBe('en');
    expect(chip.classes()).toContain('text-red');

    tooltip.vm.$emit('update:modelValue', true);
    await nextTick();

    expect(document.body.textContent).toContain('яблоко');
    expect(tooltip.props('modelValue')).toBe(true);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();

    expect(tooltip.props('modelValue')).toBe(false);
  });
});
