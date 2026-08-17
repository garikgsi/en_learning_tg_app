import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {Exercise} from '@/api/types/exercise';
import type {PendingCompletion} from '@/api/indexedDb/types/exercise';

type CachedExercise = {
  key: string
  userId: string
  exerciseId: number
  dueDate: string
  cachedAt: string
  exercise: Exercise
}

const exerciseKey = (userId: string, exerciseId: number): string => {
  return `${userId}:${exerciseId}`;
};

export const indexedDbExerciseDriver = {
  async saveMany(userId: string, exercises: Exercise[]): Promise<void> {
    const cachedAt = new Date().toISOString();

    await indexedDb.mutate<CachedExercise>(
      indexedDbStores.exercises,
      exercises.map(exercise => ({
        type: 'put',
        value: {
          key: exerciseKey(userId, exercise.id),
          userId,
          exerciseId: exercise.id,
          dueDate: exercise.dueDate,
          cachedAt,
          exercise,
        },
      })),
    );
  },

  async replaceForPeriod(
    userId: string,
    dateFrom: string,
    dateTo: string,
    exercises: Exercise[],
  ): Promise<void> {
    const cachedAt = new Date().toISOString();
    const existing = await indexedDb.getAllFromIndex<CachedExercise>(
      indexedDbStores.exercises,
      'by-user-due-date',
      IDBKeyRange.bound([userId, dateFrom], [userId, dateTo]),
    );
    const receivedKeys = new Set(
      exercises.map(exercise => exerciseKey(userId, exercise.id)),
    );

    await indexedDb.mutate<CachedExercise>(
      indexedDbStores.exercises,
      [
        ...existing
          .filter(item => !receivedKeys.has(item.key))
          .map(item => ({type: 'delete' as const, key: item.key})),
        ...exercises.map(exercise => ({
          type: 'put' as const,
          value: {
            key: exerciseKey(userId, exercise.id),
            userId,
            exerciseId: exercise.id,
            dueDate: exercise.dueDate,
            cachedAt,
            exercise,
          },
        })),
      ],
    );
  },

  async getById(userId: string, exerciseId: number): Promise<Exercise | null> {
    const cached = await indexedDb.get<CachedExercise>(
      indexedDbStores.exercises,
      exerciseKey(userId, exerciseId),
    );

    return cached?.exercise ?? null;
  },

  async getForPeriod(
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Exercise[]> {
    const range = IDBKeyRange.bound(
      [userId, dateFrom],
      [userId, dateTo],
    );
    const cached = await indexedDb.getAllFromIndex<CachedExercise>(
      indexedDbStores.exercises,
      'by-user-due-date',
      range,
    );

    return cached.map(item => item.exercise);
  },

  async enqueue(completion: PendingCompletion): Promise<void> {
    await indexedDb.put(indexedDbStores.completionOutbox, completion);
  },

  async enqueueMany(completions: PendingCompletion[]): Promise<void> {
    await indexedDb.mutate<PendingCompletion>(
      indexedDbStores.completionOutbox,
      completions.map(value => ({type: 'put', value})),
    );
  },

  async enqueueManyAndRemoveExercises(
    userId: string,
    completions: PendingCompletion[],
  ): Promise<void> {
    await indexedDb.mutateStores([
      ...completions.map(value => ({
        store: indexedDbStores.completionOutbox,
        type: 'put' as const,
        value,
      })),
      ...completions.map(completion => ({
        store: indexedDbStores.exercises,
        type: 'delete' as const,
        key: exerciseKey(userId, completion.exerciseId),
      })),
    ]);
  },

  async getPending(userId: string): Promise<PendingCompletion[]> {
    const records = await indexedDb.getAllFromIndex<PendingCompletion>(
      indexedDbStores.completionOutbox,
      'by-user-created-at',
      IDBKeyRange.bound([userId, ''], [userId, '\uffff']),
    );

    return records.filter(record => record.status === 'pending');
  },

  async getAllOutbox(userId: string): Promise<PendingCompletion[]> {
    return indexedDb.getAllFromIndex<PendingCompletion>(
      indexedDbStores.completionOutbox,
      'by-user-created-at',
      IDBKeyRange.bound([userId, ''], [userId, '\uffff']),
    );
  },

  async updateOutbox(completion: PendingCompletion): Promise<void> {
    await indexedDb.put(indexedDbStores.completionOutbox, completion);
  },

  async removeFromOutbox(attemptId: string): Promise<void> {
    await indexedDb.delete(indexedDbStores.completionOutbox, attemptId);
  },
};
