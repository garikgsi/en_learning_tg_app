import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AxiosError} from 'axios';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import {httpExerciseDriver} from '@/api/http/exercise';
import type {Exercise} from '@/api/types/exercise';
import {useExerciseRepository} from '@/use/exerciseRepository';

const exercise: Exercise = {
  id: 7,
  userId: 'user-1',
  type: {id: 1, name: 'daily', title: 'Ежедневное упражнение'},
  dueDate: '2026-08-14T09:00:00Z',
  items: [{
    id: 91,
    word: {id: 4, ru: 'кот', en: 'cat', grade: 1},
  }],
  createdAt: '2026-08-14T00:00:00Z',
};

describe('exerciseRepository', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      indexedDb.clear(indexedDbStores.exercises),
      indexedDb.clear(indexedDbStores.completionOutbox),
    ]);
  });

  it('uses cached exercises when the server is unavailable', async () => {
    const getForPeriod = vi.spyOn(httpExerciseDriver, 'getForPeriod');
    getForPeriod.mockResolvedValueOnce([exercise]);
    const repository = useExerciseRepository();

    await repository.getForPeriod(
      'user-1',
      '2026-08-11T00:00:00Z',
      '2026-08-17T23:59:59Z',
    );

    getForPeriod.mockRejectedValueOnce(new AxiosError('Network unavailable'));
    const result = await repository.getForPeriod(
      'user-1',
      '2026-08-11T00:00:00Z',
      '2026-08-17T23:59:59Z',
    );

    expect(result.source).toBe('indexedDb');
    expect(result.fallbackReason).toBe('network');
    expect(result.data).toEqual([exercise]);
  });

  it('keeps the network error when there are no cached exercises', async () => {
    const error = new AxiosError('Network unavailable');
    vi.spyOn(httpExerciseDriver, 'getCurrent').mockRejectedValueOnce(error);

    await expect(
      useExerciseRepository().getCurrent('user-without-cache'),
    ).rejects.toBe(error);
  });

  it('adds newly published exercises to the existing IndexedDB cache', async () => {
    const newExercise = {
      ...exercise,
      id: 8,
      createdAt: '2026-08-15T00:00:00Z',
    };
    const getForPeriod = vi.spyOn(httpExerciseDriver, 'getForPeriod')
      .mockResolvedValueOnce([exercise])
      .mockResolvedValueOnce([exercise, newExercise])
      .mockRejectedValueOnce(new AxiosError('Network unavailable'));
    const repository = useExerciseRepository();
    const period = [
      '2026-08-11T00:00:00Z',
      '2026-08-17T23:59:59Z',
    ] as const;

    await repository.getForPeriod('user-1', ...period);
    await repository.getForPeriod('user-1', ...period);
    const cached = await repository.getForPeriod('user-1', ...period);

    expect(cached.source).toBe('indexedDb');
    expect(cached.data.map(item => item.id)).toEqual([exercise.id, 8]);
  });

  it('keeps a result queued after a network failure and retries the same attempt', async () => {
    const complete = vi.spyOn(httpExerciseDriver, 'complete');
    complete.mockRejectedValueOnce(new AxiosError('Network unavailable'));
    const repository = useExerciseRepository();
    vi.spyOn(httpExerciseDriver, 'getForPeriod').mockResolvedValueOnce([exercise]);
    await repository.getForPeriod(
      'user-1',
      '2026-08-11T00:00:00Z',
      '2026-08-17T23:59:59Z',
    );

    const firstSummary = await repository.enqueueCompletions('user-1', [{
      exerciseId: exercise.id,
      itemResults: [{
        exercise_item_id: 91,
        errors_count: 0,
        hints_count: 0,
        lang_id: 1,
        variants: ['cat'],
      }],
    }]);

    expect(firstSummary.pending).toBe(1);
    expect(await indexedDb.get(
      indexedDbStores.exercises,
      `user-1:${exercise.id}`,
    )).toBeUndefined();
    const firstAttempt = complete.mock.calls[0][0].attempt_id;

    complete.mockResolvedValueOnce({
      id: 1,
      exercise_id: exercise.id,
      attempt_id: firstAttempt,
      completed_at: new Date().toISOString(),
    });
    const secondSummary = await repository.syncPending('user-1');

    expect(complete.mock.calls[1][0].attempt_id).toBe(firstAttempt);
    expect(secondSummary.pending).toBe(0);
  });
});
