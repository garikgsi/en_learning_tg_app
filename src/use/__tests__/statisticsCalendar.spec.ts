import { describe, expect, it } from 'vitest';
import type { ExerciseStatisticsItem } from '@/api/types/statistics';
import {
  buildStatisticsCalendarGroups,
  buildStatisticsExerciseQueue,
  findUncompletedUserExerciseForDay,
  formatStatisticsWordTranslation,
  limitStatisticsCalendarWords,
  selectStatisticsCalendarExercise,
} from '@/use/statisticsCalendar';

const item = (
  exerciseId: number,
  typeName: 'user' | 'weekly' | 'daily',
  date: string,
  status: ExerciseStatisticsItem['status'] = 'completed',
): ExerciseStatisticsItem => ({
  exerciseId,
  createdAt: date,
  completionId: status === 'completed' ? exerciseId + 100 : null,
  status,
  date,
  type: {
    id: typeName === 'daily' ? 1 : typeName === 'weekly' ? 2 : 3,
    name: typeName,
    title: `${typeName} exercise`,
  },
  wordsCount: 10,
  wordsWithErrors: exerciseId % 2,
  errorsCount: exerciseId % 2,
  errorWords: exerciseId % 2 ? [`word ${exerciseId}`] : [],
  words: [
    {
      wordId: exerciseId * 10 + 1,
      english: `word ${exerciseId} a`,
      russian: `слово ${exerciseId} а`,
      ruVariants: [`перевод ${exerciseId} а`],
      enVariants: [`synonym ${exerciseId} a`],
      transcription: `/word ${exerciseId} a/`,
      hasErrors: exerciseId % 2 === 1,
    },
    {
      wordId: exerciseId * 10 + 2,
      english: `word ${exerciseId} b`,
      russian: `слово ${exerciseId} б`,
      ruVariants: [],
      enVariants: [],
      transcription: null,
      hasErrors: false,
    },
  ],
  successPercentage: exerciseId % 2 ? 90 : 100,
});

describe('statisticsCalendar', () => {
  it('groups exercises by local day and type and aggregates their results', () => {
    const groups = buildStatisticsCalendarGroups([
      item(1, 'daily', '2026-08-10T08:00:00+03:00'),
      item(2, 'daily', '2026-08-10T12:00:00+03:00'),
      item(3, 'weekly', '2026-08-10T13:00:00+03:00'),
    ], new Date('2026-08-19T12:00:00+03:00'));

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      typeName: 'weekly',
      shortTitle: 'W',
      count: 1,
      wordsCount: 10,
      isOnlyTypeInDay: false,
    });
    expect(groups[1]).toMatchObject({
      typeName: 'daily',
      shortTitle: 'D',
      count: 2,
      wordsCount: 20,
      wordsWithErrors: 1,
      errorsCount: 1,
      errorWords: ['word 1'],
      successPercentage: 95,
      isOnlyTypeInDay: false,
    });
  });

  it('lists erroneous words from oldest exercises before correct words', () => {
    const first = item(1, 'daily', '2026-08-10T07:00:00+03:00');
    const second = item(2, 'daily', '2026-08-10T08:00:00+03:00');
    second.words[0].hasErrors = true;

    const [group] = buildStatisticsCalendarGroups([second, first]);

    expect(group.words).toEqual([
      {
        wordId: 11,
        english: 'word 1 a',
        russian: 'слово 1 а',
        ruVariants: ['перевод 1 а'],
        enVariants: ['synonym 1 a'],
        transcription: '/word 1 a/',
        hasErrors: true,
        isUncompleted: false,
      },
      {
        wordId: 21,
        english: 'word 2 a',
        russian: 'слово 2 а',
        ruVariants: ['перевод 2 а'],
        enVariants: ['synonym 2 a'],
        transcription: '/word 2 a/',
        hasErrors: true,
        isUncompleted: false,
      },
      {
        wordId: 12,
        english: 'word 1 b',
        russian: 'слово 1 б',
        ruVariants: [],
        enVariants: [],
        transcription: null,
        hasErrors: false,
        isUncompleted: false,
      },
      {
        wordId: 22,
        english: 'word 2 b',
        russian: 'слово 2 б',
        ruVariants: [],
        enVariants: [],
        transcription: null,
        hasErrors: false,
        isUncompleted: false,
      },
    ]);
  });

  it('limits the word list to 20 and reports the hidden remainder', () => {
    const words = Array.from({ length: 23 }, (_, index) => ({
      wordId: index + 1,
      english: `word ${index + 1}`,
      russian: `слово ${index + 1}`,
      ruVariants: [],
      enVariants: [],
      transcription: null,
      hasErrors: false,
      isUncompleted: false,
    }));

    const result = limitStatisticsCalendarWords(words);

    expect(result.words).toHaveLength(20);
    expect(result.words[19].english).toBe('word 20');
    expect(result.hiddenCount).toBe(3);
  });

  it('formats Russian translation variants without duplicates', () => {
    expect(formatStatisticsWordTranslation({
      wordId: 1,
      english: 'store',
      russian: 'магазин',
      ruVariants: ['лавка', ' Магазин ', 'торговая точка'],
      enVariants: ['shop'],
      transcription: '/stɔː/',
      hasErrors: false,
      isUncompleted: false,
    })).toBe('магазин, лавка, торговая точка');
  });

  it('finds an uncompleted user exercise for the selected local day', () => {
    const groups = buildStatisticsCalendarGroups([
      item(4, 'user', '2026-08-10T08:00:00+03:00', 'uncompleted'),
      item(5, 'user', '2026-08-11T08:00:00+03:00', 'uncompleted'),
    ]);

    expect(findUncompletedUserExerciseForDay(
      groups,
      new Date('2026-08-10T18:00:00+03:00'),
    )?.items[0].exerciseId).toBe(4);
  });

  it('selects the oldest completed daily exercise in the group', () => {
    const groups = buildStatisticsCalendarGroups([
      item(3, 'daily', '2026-08-10T15:00:00+03:00'),
      item(2, 'daily', '2026-08-10T09:00:00+03:00'),
      item(1, 'daily', '2026-08-10T07:00:00+03:00', 'uncompleted'),
    ]);

    expect(selectStatisticsCalendarExercise(groups[0])?.exerciseId).toBe(2);
  });

  it('sorts exercises by their creation date', () => {
    const newer = item(1, 'daily', '2026-08-10T07:00:00+03:00');
    newer.createdAt = '2026-08-10T12:00:00+03:00';
    const older = item(2, 'daily', '2026-08-10T09:00:00+03:00');
    older.createdAt = '2026-08-10T08:00:00+03:00';

    const groups = buildStatisticsCalendarGroups([newer, older]);

    expect(groups[0].items.map(entry => entry.exerciseId)).toEqual([2, 1]);
    expect(buildStatisticsExerciseQueue(groups[0])).toEqual([2, 1]);
  });

  it('opens an uncompleted exercise when a group has no completed one', () => {
    const groups = buildStatisticsCalendarGroups([
      item(7, 'daily', '2026-08-10T07:00:00+03:00', 'uncompleted'),
    ]);

    expect(selectStatisticsCalendarExercise(groups[0])?.exerciseId).toBe(7);
    expect(groups[0].isOnlyTypeInDay).toBe(true);
  });

  it('shows completed and uncompleted exercises for today as separate blocks', () => {
    const now = new Date('2026-08-10T18:00:00+03:00');
    const groups = buildStatisticsCalendarGroups([
      item(1, 'daily', '2026-08-10T07:00:00+03:00', 'uncompleted'),
      item(2, 'daily', '2026-08-10T09:00:00+03:00'),
      item(3, 'daily', '2026-08-10T12:00:00+03:00', 'uncompleted'),
    ], now);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      status: 'completed',
      color: 'green-lighten-1',
      count: 1,
      isOnlyTypeInDay: false,
    });
    expect(groups[0].items.map(entry => entry.exerciseId)).toEqual([2]);
    expect(groups[1]).toMatchObject({
      status: 'uncompleted',
      color: 'orange-darken-1',
      count: 2,
      isOnlyTypeInDay: false,
    });
    expect(groups[1].items.map(entry => entry.exerciseId)).toEqual([1, 3]);
  });

  it('does not allow completed user exercises to be reopened', () => {
    const groups = buildStatisticsCalendarGroups([
      item(8, 'user', '2026-08-10T07:00:00+03:00'),
    ]);

    expect(selectStatisticsCalendarExercise(groups[0])).toBeNull();
    expect(buildStatisticsExerciseQueue(groups[0])).toEqual([]);
    expect(groups[0].shortTitle).toBe('MY');
  });

  it('combines completed and uncompleted user exercises for today', () => {
    const now = new Date('2026-08-10T18:00:00+03:00');
    const groups = buildStatisticsCalendarGroups([
      item(9, 'user', '2026-08-10T07:00:00+03:00'),
      item(10, 'user', '2026-08-10T09:00:00+03:00', 'uncompleted'),
    ], now);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      typeName: 'user',
      shortTitle: 'MY',
      count: 2,
      status: 'uncompleted',
      color: 'grey-darken-1',
    });
    expect(groups[0].items.map(entry => entry.exerciseId)).toEqual([9, 10]);
    expect(selectStatisticsCalendarExercise(groups[0])?.exerciseId).toBe(10);
    expect(buildStatisticsExerciseQueue(groups[0])).toEqual([10]);
    expect(groups[0].words.map(word => ({
      hasErrors: word.hasErrors,
      isUncompleted: word.isUncompleted,
    }))).toEqual([
      { hasErrors: false, isUncompleted: true },
      { hasErrors: false, isUncompleted: true },
      { hasErrors: true, isUncompleted: false },
      { hasErrors: false, isUncompleted: false },
    ]);
  });
});
