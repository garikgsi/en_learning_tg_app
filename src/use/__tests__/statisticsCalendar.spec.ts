import { describe, expect, it } from 'vitest';
import type { ExerciseStatisticsItem } from '@/api/types/statistics';
import {
  buildStatisticsCalendarGroups,
  buildStatisticsExerciseQueue,
  findUncompletedUserExerciseForDay,
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
      english: `word ${exerciseId} a`,
      russian: `слово ${exerciseId} а`,
      hasErrors: exerciseId % 2 === 1,
    },
    {
      english: `word ${exerciseId} b`,
      russian: `слово ${exerciseId} б`,
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
      { english: 'word 1 a', russian: 'слово 1 а', hasErrors: true },
      { english: 'word 2 a', russian: 'слово 2 а', hasErrors: true },
      { english: 'word 1 b', russian: 'слово 1 б', hasErrors: false },
      { english: 'word 2 b', russian: 'слово 2 б', hasErrors: false },
    ]);
  });

  it('limits the word list to 20 and reports the hidden remainder', () => {
    const words = Array.from({ length: 23 }, (_, index) => ({
      english: `word ${index + 1}`,
      russian: `слово ${index + 1}`,
      hasErrors: false,
    }));

    const result = limitStatisticsCalendarWords(words);

    expect(result.words).toHaveLength(20);
    expect(result.words[19].english).toBe('word 20');
    expect(result.hiddenCount).toBe(3);
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

  it('does not allow completed user exercises to be reopened', () => {
    const groups = buildStatisticsCalendarGroups([
      item(8, 'user', '2026-08-10T07:00:00+03:00'),
    ]);

    expect(selectStatisticsCalendarExercise(groups[0])).toBeNull();
    expect(buildStatisticsExerciseQueue(groups[0])).toEqual([]);
    expect(groups[0].shortTitle).toBe('MY');
  });
});
