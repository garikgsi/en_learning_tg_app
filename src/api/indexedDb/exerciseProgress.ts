import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {CachedExerciseProgress} from '@/api/indexedDb/types/exercise';
import type {TranslationExerciseProgress} from '@/types/translation';

const progressKey = (userId: string, exerciseId: number): string => {
  return `${userId}:${exerciseId}`;
};

export const indexedDbExerciseProgressDriver = {
  async get(
    userId: string,
    exerciseId: number,
  ): Promise<TranslationExerciseProgress | null> {
    const cached = await indexedDb.get<CachedExerciseProgress>(
      indexedDbStores.exerciseProgress,
      progressKey(userId, exerciseId),
    );

    return cached?.progress ?? null;
  },

  async put(
    userId: string,
    progress: TranslationExerciseProgress,
  ): Promise<void> {
    await indexedDb.put<CachedExerciseProgress>(
      indexedDbStores.exerciseProgress,
      {
        key: progressKey(userId, progress.exerciseId),
        userId,
        exerciseId: progress.exerciseId,
        updatedAt: new Date().toISOString(),
        progress,
      },
    );
  },

  async remove(userId: string, exerciseId: number): Promise<void> {
    await indexedDb.delete(
      indexedDbStores.exerciseProgress,
      progressKey(userId, exerciseId),
    );
  },
};
