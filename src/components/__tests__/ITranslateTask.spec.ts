import {flushPromises, mount} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import {defineComponent, h, nextTick} from 'vue';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createVuetify} from 'vuetify';
import ITranslateTask from '@/components/ITranslateTask.vue';
import {useDictionaryStore} from '@/stores/dictionaryStore';
import {useTranslateStore} from '@/stores/translateStore';
import {useUserStore} from '@/stores/userStore';
import type {Exercise} from '@/api/types/exercise';
import type {TranslationExerciseProgress, TranslationWord} from '@/types/translation';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';

const IWordStub = defineComponent({
  name: 'IWord',
  props: {
    modelValue: String,
    word: String,
    translate: String,
    lang: String,
    wordLang: String,
    disabled: Boolean,
    readonly: Boolean,
    wordVariants: Array,
    translateVariants: Array,
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
  wordVariants: [],
  translateVariants: [],
  checkWord: 'cat',
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
  beforeEach(async () => {
    setActivePinia(createPinia());
    await indexedDb.clear(indexedDbStores.exerciseProgress);
    vi.useFakeTimers();
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

  it('plays the english word in both translation directions', async () => {
    const playWordAudio = vi.spyOn(
      useDictionaryStore(),
      'playWordAudio',
    ).mockResolvedValue();
    const wrapper = await mountTask();
    const getAudioButton = () => wrapper
      .findAllComponents({name: 'VBtn'})
      .find(button => button.text().includes('Озвучить'));

    expect(getAudioButton()).toBeDefined();
    await getAudioButton()!.trigger('click');
    expect(playWordAudio).toHaveBeenLastCalledWith(11);

    await finishCurrentWord(wrapper);
    await continueWithRussian(wrapper);
    await getAudioButton()!.trigger('click');
    expect(playWordAudio).toHaveBeenLastCalledWith(11);
    expect(playWordAudio).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('starts plural exercises without language selection and finishes one direction', async () => {
    const pluralAudio = vi.spyOn(
      useDictionaryStore(),
      'playPluralPairAudio',
    ).mockResolvedValue();
    useTranslateStore().wordList = [{
      ...word,
      word: 'man',
      translate: 'men',
      checkWord: 'men',
      wordVariants: ['мужчина'],
      translateVariants: ['мужчины'],
      exerciseType: 'plural',
      pluralId: 5,
    }];

    const wrapper = mount(ITranslateTask, {
      global: {
        plugins: [createVuetify()],
        stubs: {IWord: IWordStub},
      },
    });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).not.toContain('Выберем язык');
    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      word: 'man',
      translate: 'men',
      wordLang: 'en',
      wordVariants: ['мужчина'],
      translateVariants: ['мужчины'],
    });
    expect(wrapper.get('.i-timer__label').text())
      .toBe('Напишите множественное число');

    const audioButton = wrapper
      .findAllComponents({name: 'VBtn'})
      .find(button => button.text().includes('Озвучить'));
    await audioButton!.trigger('click');
    expect(pluralAudio).toHaveBeenCalledWith(11, 5);

    wrapper.findComponent(IWordStub).vm.$emit(
      'finish',
      {isOk: true, answer: 'men'},
    );
    await vi.advanceTimersByTimeAsync(1100);
    await flushPromises();

    expect(wrapper.emitted('finish')).toHaveLength(1);
    expect(wrapper.emitted('finish')![0][0]).toMatchObject([
      {lang: 'en'},
    ]);
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
    const skippedProgress = wrapper.get('.i-timer')
      .findComponent({name: 'VProgressLinear'});
    const hintButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.props('icon') === 'mdi-help');
    const audioButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.text().includes('Озвучить')
        || button.props('title') === 'Озвучить английское слово');
    const skipButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.text().includes('Пропустить')
        || button.props('title') === 'Пропустить');

    expect(wrapper.get('.i-timer__label').text()).toBe('Запомните перевод слова');
    expect(skippedProgress.props('max')).toBe(5000);
    expect(hintButtons.every(button => button.props('disabled'))).toBe(true);
    expect(audioButtons.every(button => button.props('disabled'))).toBe(true);
    expect(skipButtons.every(button => {
      return button.props('icon') === 'mdi-debug-step-over'
        || button.text().includes('Пропустить');
    })).toBe(true);

    skippedInput.vm.$emit('finish', {isOk: true, answer: 'cat'});
    await nextTick();
    expect(wrapper.text()).not.toContain('Вы отлично справились!');

    await vi.advanceTimersByTimeAsync(4900);
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('кот');
    expect(wrapper.get('.i-timer').findComponent({name: 'VProgressLinear'})
      .props('bufferValue')).toBe(4900);

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      modelValue: '',
      word: 'собака',
      disabled: false,
      readonly: false,
    });
    expect(wrapper.get('.i-timer').findComponent({name: 'VProgressLinear'})
      .props('bufferValue')).toBe(0);
    expect(wrapper.get('.i-timer__label').text()).toBe('Напишите перевод слова');
    expect(wrapper.get('.i-timer').findComponent({name: 'VProgressLinear'})
      .props('max')).toBe(100000);

    await vi.advanceTimersByTimeAsync(99900);
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('собака');

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(wrapper.findComponent(IWordStub).props('word')).toBe('кот');
    wrapper.unmount();
  });

  it('allows skipping when only one word remains', async () => {
    const wrapper = await mountTask();
    const skipButtons = wrapper
      .findAllComponents({name: 'VBtn'})
      .filter(button => button.text().includes('Пропустить')
        || button.props('title') === 'Пропустить');

    expect(skipButtons.length).toBeGreaterThan(0);
    expect(skipButtons.every(button => button.props('disabled') === false))
      .toBe(true);

    await skipButtons[0].trigger('click');
    await nextTick();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      modelValue: 'CAT',
      word: 'кот',
      readonly: true,
    });

    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      modelValue: '',
      word: 'кот',
      readonly: false,
    });
    expect(wrapper.emitted('finish')).toBeUndefined();
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

  it('continues a saved daily exercise from the same word and answer', async () => {
    vi.useRealTimers();
    const store = useTranslateStore();
    const secondWord: TranslationWord = {
      ...word,
      id: 92,
      exerciseItemId: 92,
      wordId: 12,
      word: 'собака',
      translate: 'dog',
      checkWord: 'dog',
    };
    const activeExercise: Exercise = {
      id: 7,
      userId: 'resume-user',
      type: {id: 1, name: 'daily', title: 'Перевод слов'},
      dueDate: '2026-09-23',
      createdAt: '2026-09-23T00:00:00Z',
      items: [
        {
          id: 91,
          word: {
            id: 11,
            ru: 'кот',
            en: 'cat',
            ruVariants: [],
            enVariants: [],
            transcription: null,
            grade: 3,
          },
        },
        {
          id: 92,
          word: {
            id: 12,
            ru: 'собака',
            en: 'dog',
            ruVariants: [],
            enVariants: [],
            transcription: null,
            grade: 3,
          },
        },
      ],
    };
    useUserStore().user = {
      id: 'resume-user',
      name: 'Ученик',
      phone: '+79990000000',
      role: 'user',
      avatar: '',
      createdAt: '2026-09-23T00:00:00Z',
    };
    store.activeExercise = activeExercise;
    store.wordList = [{...word}, secondWord];
    const progress: TranslationExerciseProgress = {
      version: 1,
      exerciseId: 7,
      exerciseItemIds: [91, 92],
      currentLanguage: 'en',
      currentWordIndex: 0,
      currentWordId: 92,
      answer: 'D',
      errorsOnCurrentAttempt: 0,
      hintUsageByWord: {},
      visitedWordIdsInCycle: [91, 92],
      russianResults: [],
      englishResults: [{
        id: 91,
        retries: 1,
        isOk: true,
        variants: [],
        skipTimes: 0,
        hintTimes: 0,
        errorTimes: 0,
      }],
    };
    await store.saveExerciseProgress(progress);

    const wrapper = mount(ITranslateTask, {
      global: {
        plugins: [createVuetify()],
        stubs: {IWord: IWordStub},
      },
    });
    await flushPromises();
    await nextTick();

    expect(wrapper.findComponent(IWordStub).props()).toMatchObject({
      lang: 'en',
      word: 'собака',
      translate: 'dog',
      modelValue: 'D',
    });
    expect(wrapper.text()).toContain('Осталось слов: 1 из 2');
    wrapper.unmount();
  });
});
