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
        wordId: 42,
        translation: 'яблоко',
        transcription: '/ˈæp.əl/',
        language: 'en',
        color: 'red',
      },
    });

    const chip = wrapper.get('.v-chip');
    const tooltip = wrapper.findComponent({ name: 'VTooltip' });

    expect(chip.text()).toBe('apple');
    expect(chip.attributes('lang')).toBe('en');
    expect(chip.classes()).toContain('text-red');

    await chip.trigger('click');
    expect(wrapper.emitted('play')).toEqual([[42]]);

    tooltip.vm.$emit('update:modelValue', true);
    await nextTick();

    expect(document.body.textContent).toContain('яблоко');
    expect(document.body.textContent).toContain('/ˈæp.əl/');
    expect(tooltip.props('modelValue')).toBe(true);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();

    expect(tooltip.props('modelValue')).toBe(false);
  });

  it('keeps the singular word on the chip and shows plural pairs in the tooltip', async () => {
    wrapper = mount(IChipWord, {
      attachTo: document.body,
      global: {
        plugins: [createVuetify()],
      },
      props: {
        word: 'louse',
        wordId: 42,
        translation: 'вошь',
        plural: {
          id: 7,
          word: 'lice',
          translation: 'вши',
        },
        language: 'en',
        color: 'green',
      },
    });

    const chip = wrapper.get('.v-chip');
    const tooltip = wrapper.findComponent({name: 'VTooltip'});

    expect(chip.text()).toBe('louse');
    await chip.trigger('click');
    expect(wrapper.emitted('play')).toEqual([[42, 7]]);

    tooltip.vm.$emit('update:modelValue', true);
    await nextTick();

    expect(document.body.textContent).toContain('вошь — вши');
    expect(document.body.textContent).toContain('louse — lice');
  });

  it('shows an audio loader until pronunciation is ready', async () => {
    wrapper = mount(IChipWord, {
      attachTo: document.body,
      global: {
        plugins: [createVuetify()],
      },
      props: {
        word: 'apple',
        wordId: 42,
        translation: 'яблоко',
        transcription: '/ˈæp.əl/',
        language: 'en',
        color: 'green',
        audioLoading: true,
      },
    });

    const tooltip = wrapper.findComponent({name: 'VTooltip'});
    tooltip.vm.$emit('update:modelValue', true);
    await nextTick();

    const loader = document.body.querySelector('[aria-label="Загрузка произношения"]');
    expect(loader).not.toBeNull();
    expect(loader?.classList).toContain('text-secondary');
    expect(loader?.querySelector('.v-icon')?.classList).toContain('text-secondary');

    await wrapper.setProps({audioLoading: false});
    await nextTick();

    expect(document.body.querySelector('.v-progress-circular')).toBeNull();
    expect(
      document.body.querySelector('[aria-label="Произношение готово"]')?.classList,
    ).toContain('text-primary');
  });
});
