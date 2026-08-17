import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
  isNetworkError,
} from '@/api/errors';
import {httpExerciseDriver} from '@/api/http/exercise';
import {indexedDbExerciseDriver} from '@/api/indexedDb/exercise';
import type {PendingCompletion} from '@/api/indexedDb/types/exercise';
import type {
  CompleteExercisePayload,
  Exercise,
} from '@/api/types/exercise';
import type {RepositoryResult} from '@/use/types/repository';
import type {
  CompletionSyncSummary,
  NewExerciseCompletion,
} from '@/use/types/exerciseRepository';
import {getRepositoryFallbackReason} from '@/use/repositoryFallback';

const syncRequests = new Map<string, Promise<CompletionSyncSummary>>();

const createAttemptId = (): string => {
  return crypto.randomUUID();
};

const retryDelayMs = (attemptsCount: number): number => {
  return Math.min(30_000 * 2 ** Math.max(attemptsCount - 1, 0), 15 * 60_000);
};

const localDayPeriod = (): {dateFrom: string, dateTo: string} => {
  const dateFrom = new Date();
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(dateFrom);
  dateTo.setHours(23, 59, 59, 999);

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
};

const performSync = async (userId: string): Promise<CompletionSyncSummary> => {
  const pending = await indexedDbExerciseDriver.getPending(userId);
  let sent = 0;

  for (const completion of pending) {
    if (
      completion.nextRetryAt
      && new Date(completion.nextRetryAt).getTime() > Date.now()
    ) {
      continue;
    }

    try {
      await httpExerciseDriver.complete(completion.payload);
      await indexedDbExerciseDriver.removeFromOutbox(completion.attemptId);
      sent++;
    } catch (error) {
      const status = getApiErrorStatus(error);
      const code = getApiErrorCode(error);
      const isRetryable = isNetworkError(error)
        || status === null
        || status >= 500
        || status === 401;
      const attemptsCount = completion.attemptsCount + 1;

      await indexedDbExerciseDriver.updateOutbox({
        ...completion,
        status: isRetryable ? 'pending' : 'failed',
        attemptsCount,
        nextRetryAt: isRetryable && !isNetworkError(error) && status !== 401
          ? new Date(Date.now() + retryDelayMs(attemptsCount)).toISOString()
          : null,
        lastError: code
          ?? getApiErrorMessage(error, 'Не удалось отправить результат'),
      });

      if (isNetworkError(error) || status === 401) {
        break;
      }
    }
  }

  const outbox = await indexedDbExerciseDriver.getAllOutbox(userId);

  return {
    sent,
    pending: outbox.filter(item => item.status === 'pending').length,
    failed: outbox.filter(item => item.status === 'failed').length,
  };
};

const repository = {
  createUserExercise(): Promise<number> {
    return httpExerciseDriver.createUserExercise();
  },

  async getForPeriod(
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<RepositoryResult<Exercise[]>> {
    try {
      const exercises = await httpExerciseDriver.getForPeriod(
        dateFrom,
        dateTo,
      );
      await indexedDbExerciseDriver.replaceForPeriod(
        userId,
        dateFrom,
        dateTo,
        exercises,
      );

      return {data: exercises, source: 'http'};
    } catch (error) {
      const fallbackReason = getRepositoryFallbackReason(error);

      if (!fallbackReason) {
        throw error;
      }

      const exercises = await indexedDbExerciseDriver.getForPeriod(
        userId,
        dateFrom,
        dateTo,
      );

      if (exercises.length === 0) {
        throw error;
      }

      return {data: exercises, source: 'indexedDb', fallbackReason};
    }
  },

  async getCurrent(userId: string): Promise<RepositoryResult<Exercise[]>> {
    try {
      const exercises = await httpExerciseDriver.getCurrent();
      await indexedDbExerciseDriver.saveMany(userId, exercises);

      return {data: exercises, source: 'http'};
    } catch (error) {
      const fallbackReason = getRepositoryFallbackReason(error);

      if (!fallbackReason) {
        throw error;
      }

      const {dateFrom, dateTo} = localDayPeriod();
      const exercises = await indexedDbExerciseDriver.getForPeriod(
        userId,
        dateFrom,
        dateTo,
      );

      if (exercises.length === 0) {
        throw error;
      }

      return {data: exercises, source: 'indexedDb', fallbackReason};
    }
  },

  async getById(
    userId: string,
    exerciseId: number,
  ): Promise<RepositoryResult<Exercise>> {
    try {
      const exercise = await httpExerciseDriver.getById(exerciseId);
      await indexedDbExerciseDriver.saveMany(userId, [exercise]);

      return {data: exercise, source: 'http'};
    } catch (error) {
      const fallbackReason = getRepositoryFallbackReason(error);

      if (!fallbackReason) {
        throw error;
      }

      const exercise = await indexedDbExerciseDriver.getById(
        userId,
        exerciseId,
      );

      if (!exercise) {
        throw error;
      }

      return {data: exercise, source: 'indexedDb', fallbackReason};
    }
  },

  async enqueueCompletions(
    userId: string,
    completions: NewExerciseCompletion[],
  ): Promise<CompletionSyncSummary> {
    const completedAt = new Date().toISOString();
    const pendingCompletions = completions.map(completion => {
      const attemptId = createAttemptId();
      const payload: CompleteExercisePayload = {
        attempt_id: attemptId,
        completed_at: completedAt,
        exercise_id: completion.exerciseId,
        exercise_items_result: completion.itemResults,
      };
      const pendingCompletion: PendingCompletion = {
        attemptId,
        userId,
        exerciseId: completion.exerciseId,
        payload,
        status: 'pending',
        attemptsCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: completedAt,
      };

      return pendingCompletion;
    });

    await indexedDbExerciseDriver.enqueueManyAndRemoveExercises(
      userId,
      pendingCompletions,
    );

    return repository.syncPending(userId);
  },

  async syncPending(userId: string): Promise<CompletionSyncSummary> {
    const existing = syncRequests.get(userId);

    if (existing) {
      return existing;
    }

    const request = performSync(userId).finally(() => {
      syncRequests.delete(userId);
    });
    syncRequests.set(userId, request);

    return request;
  },

  async getOutboxSummary(userId: string): Promise<CompletionSyncSummary> {
    const outbox = await indexedDbExerciseDriver.getAllOutbox(userId);

    return {
      sent: 0,
      pending: outbox.filter(item => item.status === 'pending').length,
      failed: outbox.filter(item => item.status === 'failed').length,
    };
  },
};

export const useExerciseRepository = () => repository;
