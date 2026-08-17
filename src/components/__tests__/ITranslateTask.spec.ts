import {flushPromises, mount} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import {defineComponent, h, nextTick} from 'vue';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createVuetify} from 'vuetify';
import ITranslateTask from '@/components/ITranslateTask.vue';
import {useTranslateStore} from '@/stores/translateStore';
import type {TranslationWord} from '@/types/translation';

const IWordStub = defineComponent({
  name: 'IWord',
  props: {
    modelValue: String,
    word: String,
    translate: String,
    lang: String,
    disabled: Boolean,
    readonly: Boolean,
  },
  emits: ['finish', 'mistake', 'update:model-value'],
  setup(_props, {expose, slots}) {
    expose({
      focus: vi.fn(),
      reset: vi.fn(),
    });

    return () => h('div', {class: 'i-word-stub'}, slots.header?.());
  },
});

const word: TranslationWord = {
  id: 91,
  exerciseId: 7,
  exerciseItemId: 91,
  wordId: 11,
  word: 'кот',
  translate: 'cat',
  checkWord: 'cat',
  otherCheckWords: [],
};

const mountTask = async () => {
  const wrapper = mount(ITranslateTask, {
    global: {
      plugins: [createVuetify()],
      stubs: {
        IWord: IWordStub,
      },
    },
  });

  await nextTick();
  const englishButton = wrapper
    .findAllComponents({name: 'VBtn'})
    .find(button => button.text().includes('English'));

  expect(englishButton).toBeDefined();
  await englishButton!.trigger('click');
  await flushPromises();
  await nextTick();
  await nextTick();

  return wrapper;
};

const finishCurrentWord = async (
  wrapper: Awaited<ReturnType<typeof mountTask>>,
  emitTwice = false,
) => {
  const input = wrapper.findComponent(IWordStub);
  expect(input.props('disabled')).toBe(false);
  input.vm.$emit('finish', {isOk: true, answer: input.props('translate')});

  if (emitTwice) {
    input.vm.$emit('finish', {isOk: true, answer: input.props('translate')});
  }

  await vi.advanceTimersByTimeAsync(1100);
  await flushPromises();
};

const continueWithRussian = async (
  wrapper: Awaited<ReturnType<typeof mountTask>>,
) => {
  expect(wrapper.findComponent(IWordStub).exists()).toBe(false);
  expect(wrapper.text()).toContain('А теперь давайте по-русски');

  const continueButton = wrapper
    .findAllComponents({name: 'VBtn'})
    .find(button => button.text().includes('Поехали!'));

  expect(continueButton).toBeDefined();
  await continueButton!.trigger('click');
  await flushPromises();
  await nextTick();
}

describe('ITranslateTask word transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    useTranslateStore().wordList = [{...word}];
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not show the last successfully completed word again', async () => {
    const wrapper = await mountTask();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      lang: 'en',
      word: 'кот',
      translate: 'cat',
    });

    await finishCurrentWord(wrapper, true);
    await continueWithRussian(wrapper);

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      lang: 'ru',
      word: 'cat',
      translate: 'кот',
    });

    await finishCurrentWord(wrapper, true);

    expect(wrapper.emitted('finish')).toHaveLength(1);
    expect(wrapper.findComponent(IWordStub).exists()).toBe(false);
    wrapper.unmount();
  });

  it('repeats a word after too many errors and accepts a clean retry', async () => {
    const wrapper = await mountTask();
    const input = wrapper.findComponent(IWordStub);

    input.vm.$emit('mistake', {count: 2, answer: 'xx'});
    input.vm.$emit('finish', {isOk: true, answer: 'cat'});
    await vi.advanceTimersByTimeAsync(1100);
    await flushPromises();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      lang: 'en',
      word: 'кот',
      translate: 'cat',
    });
    expect(wrapper.emitted('finish')).toBeUndefined();

    await finishCurrentWord(wrapper);
    await continueWithRussian(wrapper);

    expect(wrapper.findComponent(IWordStub).props('lang')).toBe('ru');
    wrapper.unmount();
  });

  it('shows a skipped answer for five seconds without completing it or advancing the next timer', async () => {
    useTranslateStore().wordList = [
      {...word},
      {
        ...word,
        id: 92,
        exerciseItemId: 92,
        wordId: 12,
        word: 'собака',
        translate: 'dog',
        checkWord: 'dog',
      },
    ];
    const wrapper = await mountTask();
    const skippedInput = wrapper.findComponent(IWordStub);
    const skipButton = wrapper
      .findAllComponents({name: 'VBtn'})
      .find(button => button.text().includes('Пропустить'));

    expect(skipButton).toBeDefined();
    await skipButton!.trigger('click');
    await nextTick();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      modelValue: 'CAT',
      word: 'кот',
      disabled: false,
      readonly: true,
    });
    const skippedProgress = wrapper.get('.word-timer')
      .findComponent({name: 'VProgressLinear'});
    const hintButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.props('icon') === 'mdi-help');
    const pauseButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.text().includes('Пауза')
        || button.props('title') === 'Пауза');

    expect(wrapper.get('.word-timer__label').text()).toBe('Запомните перевод слова');
    expect(skippedProgress.props('max')).toBe(5000);
    expect(hintButtons.every(button => button.props('disabled'))).toBe(true);
    expect(pauseButtons.every(button => button.props('disabled'))).toBe(true);

    skippedInput.vm.$emit('finish', {isOk: true, answer: 'cat'});
    await nextTick();
    expect(wrapper.text()).not.toContain('Вы отлично справились!');

    await vi.advanceTimersByTimeAsync(4900);
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('кот');
    expect(wrapper.get('.word-timer').findComponent({name: 'VProgressLinear'})
      .props('bufferValue')).toBe(4900);

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      modelValue: '',
      word: 'собака',
      disabled: false,
      readonly: false,
    });
    expect(wrapper.get('.word-timer').findComponent({name: 'VProgressLinear'})
      .props('bufferValue')).toBe(0);
    expect(wrapper.get('.word-timer__label').text()).toBe('Напишите перевод слова');
    expect(wrapper.get('.word-timer').findComponent({name: 'VProgressLinear'})
      .props('max')).toBe(100000);

    await vi.advanceTimersByTimeAsync(99900);
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('собака');

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('кот');
    wrapper.unmount();
  });

  it('resets hint limits after every complete pass through the word list', async () => {
    useTranslateStore().wordList = [
      {...word},
      {
        ...word,
        id: 92,
        exerciseItemId: 92,
        wordId: 12,
        word: 'собака',
        translate: 'dog',
        checkWord: 'dog',
      },
    ];
    const wrapper = await mountTask();
    const getHeaderHintButton = () => wrapper
      .findAllComponents({name: 'VBtn'})
      .find(button => button.props('icon') === 'mdi-help');

    await getHeaderHintButton()!.trigger('click');
    await getHeaderHintButton()!.trigger('click');
    expect(getHeaderHintButton()!.props('disabled')).toBe(true);

    await vi.advanceTimersByTimeAsync(100000);
    await flushPromises();
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('собака');

    await getHeaderHintButton()!.trigger('click');
    await getHeaderHintButton()!.trigger('click');
    expect(getHeaderHintButton()!.props('disabled')).toBe(true);

    await vi.advanceTimersByTimeAsync(100000);
    await flushPromises();

    expect(wrapper.findComponent(IWordStub).props('word')).toBe('кот');
    expect(getHeaderHintButton()!.props('disabled')).toBe(false);
    wrapper.unmount();
  });
});
