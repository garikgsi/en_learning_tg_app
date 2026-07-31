import {flushPromises, mount} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import {defineComponent, h, nextTick} from 'vue';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createVuetify} from 'vuetify';
import ITranslateTask from '@/components/ITranslateTask.vue';
import {useTranslateStore, type Word} from '@/stores/translateStore';

const IWordStub = defineComponent({
  name: 'IWord',
  props: {
    modelValue: String,
    word: String,
    translate: String,
    lang: String,
    disabled: Boolean,
  },
  emits: ['finish', 'mistake', 'update:model-value'],
  setup(_props, {expose}) {
    expose({
      focus: vi.fn(),
      reset: vi.fn(),
    });

    return () => h('div', {class: 'i-word-stub'});
  },
});

const word: Word = {
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
    useTranslateStore().enList = [{...word}];
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
});
