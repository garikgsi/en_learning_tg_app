import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, describe, expect, it} from 'vitest';
import type {Exercise} from '@/api/types/exercise';
import {useTranslateStore} from '@/stores/translateStore';

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
  beforeEach(() => setActivePinia(createPinia()));

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
});
