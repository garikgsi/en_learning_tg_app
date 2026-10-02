import {describe, expect, it} from 'vitest';
import type {ExerciseStatisticsItem} from '@/api/types/statistics';
import {selectWeeklyUncompletedExercises} from '@/use/weeklyExercises';

const exercise = (
  exerciseId: number,
  date: string,
  status: ExerciseStatisticsItem['status'] = 'uncompleted',
  createdAt = date,
): ExerciseStatisticsItem => ({
  exerciseId,
  createdAt,
  completionId: null,
  status,
  date,
  type: {id: 1, name: 'daily', title: 'Ежедневное задание'},
  wordsCount: 1,
  wordsWithErrors: 0,
  errorsCount: 0,
  errorWords: [],
  words: [],
  successPercentage: 0,
});

describe('selectWeeklyUncompletedExercises', () => {
  it('keeps every uncompleted item and sorts them by day', () => {
    const items = [
      exercise(2, '2026-10-01T10:00:00+03:00'),
      exercise(1, '2026-09-29T10:00:00+03:00'),
      exercise(3, '2026-09-30T10:00:00+03:00', 'completed'),
      exercise(
        1,
        '2026-09-29T10:00:00+03:00',
        'uncompleted',
        '2026-09-29T12:00:00+03:00',
      ),
    ];

    expect(selectWeeklyUncompletedExercises(items).map(item => item.exerciseId))
      .toEqual([1, 1, 2]);
    expect(selectWeeklyUncompletedExercises(items).map(item => item.createdAt))
      .toEqual([
        '2026-09-29T10:00:00+03:00',
        '2026-09-29T12:00:00+03:00',
        '2026-10-01T10:00:00+03:00',
      ]);
  });
});
