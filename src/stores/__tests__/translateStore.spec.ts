import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, describe, expect, it} from 'vitest';
import type {Exercise} from '@/api/types/exercise';
import {useTranslateStore} from '@/stores/translateStore';
import {useUserStore} from '@/stores/userStore';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {TranslationExerciseProgress} from '@/types/translation';

const exercise: Exercise = {
  id: 7,
  userId: 'user-1',
  type: {id: 1, name: 'repeat', title: 'Повторение'},
  dueDate: '2026-08-26',
  createdAt: '2026-08-26T00:00:00Z',
  items: [{
    id: 91,
    word: {
      id: 132,
      ru: 'математика',
      en: 'maths',
      ruVariants: ['арифметика'],
      enVariants: ['mathematics', 'math'],
      transcription: null,
      grade: 4,
    },
  }],
};

describe('translateStore exercise words', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await indexedDb.clear(indexedDbStores.exerciseProgress);
  });

  it('uses only primary translations for answers and keeps variants as hints', () => {
    const store = useTranslateStore();

    store.setExercises([exercise]);

    expect(store.wordList[0]).toMatchObject({
      word: 'математика',
      translate: 'maths',
      checkWord: 'maths',
      wordVariants: ['арифметика'],
      translateVariants: ['mathematics', 'math'],
    });
    expect(store.reversedWordList[0]).toMatchObject({
      word: 'maths',
      translate: 'математика',
      checkWord: 'математика',
      wordVariants: ['mathematics', 'math'],
      translateVariants: ['арифметика'],
    });
  });

  it('maps plural exercises to a single singular-to-plural task', () => {
    const store = useTranslateStore();
    const pluralExercise: Exercise = {
      ...exercise,
      type: {id: 4, name: 'plural', title: 'Множественное число'},
      items: [{
        ...exercise.items[0],
        word: {
          ...exercise.items[0].word,
          ru: 'мужчина',
          en: 'man',
        },
        plural: {
          id: 5,
          ru: 'мужчины',
          en: 'men',
          transcription: '/men/',
        },
      }],
    };

    store.setExercises([pluralExercise]);

    expect(store.wordList[0]).toMatchObject({
      word: 'man',
      translate: 'men',
      checkWord: 'men',
      wordVariants: ['мужчина'],
      translateVariants: ['мужчины'],
      pluralId: 5,
      exerciseType: 'plural',
    });
  });

  it('stores and restores daily exercise progress only on this device', async () => {
    const store = useTranslateStore();
    const dailyExercise: Exercise = {
      ...exercise,
      type: {id: 1, name: 'daily', title: 'Перевод слов'},
    };
    useUserStore().user = {
      id: 'progress-user',
      name: 'Ученик',
      phone: '+79990000000',
      role: 'user',
      avatar: '',
      createdAt: '2026-08-26T00:00:00Z',
    };
    store.activeExercise = dailyExercise;
    store.setExercises([dailyExercise]);
    const progress: TranslationExerciseProgress = {
      version: 1,
      exerciseId: dailyExercise.id,
      exerciseItemIds: [91],
      currentLanguage: 'en',
      currentWordIndex: 0,
      currentWordId: 91,
      answer: 'MA',
      errorsOnCurrentAttempt: 1,
      hintUsageByWord: {91: 1},
      visitedWordIdsInCycle: [91],
      russianResults: [],
      englishResults: [{
        id: 91,
        retries: 0,
        isOk: false,
        variants: ['mx'],
        skipTimes: 0,
        hintTimes: 1,
        errorTimes: 1,
      }],
    };

    await store.saveExerciseProgress(progress);

    expect(await store.loadExerciseProgress()).toEqual(progress);

    await store.clearExerciseProgress();
    expect(await store.loadExerciseProgress()).toBeNull();
  });

  it.each(['daily', 'weekly', 'plural'])(
    'allows resuming %s exercises',
    async exerciseType => {
      const store = useTranslateStore();
      const resumableExercise: Exercise = {
        ...exercise,
        type: {id: 1, name: exerciseType, title: exerciseType},
      };
      useUserStore().user = {
        id: `progress-${exerciseType}`,
        name: 'Ученик',
        phone: '+79990000000',
        role: 'user',
        avatar: '',
        createdAt: '2026-08-26T00:00:00Z',
      };
      store.activeExercise = resumableExercise;
      store.setExercises([resumableExercise]);
      const progress: TranslationExerciseProgress = {
        version: 1,
        exerciseId: resumableExercise.id,
        exerciseItemIds: [91],
        currentWordIndex: -1,
        currentWordId: null,
        answer: '',
        errorsOnCurrentAttempt: 0,
        hintUsageByWord: {},
        visitedWordIdsInCycle: [],
        russianResults: [],
        englishResults: [],
      };

      await store.saveExerciseProgress(progress);

      expect(await store.loadExerciseProgress()).toEqual(progress);
    },
  );
});
