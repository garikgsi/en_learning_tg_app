import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {ExerciseStatisticsResponse} from '@/api/types/statistics';

export type CachedStatistics = {
  key: string
  userId: string
  periodKey: string
  fetchedAt: string
  data: ExerciseStatisticsResponse
}

const statisticsKey = (userId: string, periodKey: string): string => {
  return `${userId}:${periodKey}`;
};

export const indexedDbStatisticsDriver = {
  async save(
    userId: string,
    periodKey: string,
    data: ExerciseStatisticsResponse,
  ): Promise<CachedStatistics> {
    const snapshot: CachedStatistics = {
      key: statisticsKey(userId, periodKey),
      userId,
      periodKey,
      fetchedAt: new Date().toISOString(),
      data,
    };

    await indexedDb.put(indexedDbStores.statistics, snapshot);

    return snapshot;
  },

  async get(
    userId: string,
    periodKey: string,
  ): Promise<CachedStatistics | null> {
    return await indexedDb.get<CachedStatistics>(
      indexedDbStores.statistics,
      statisticsKey(userId, periodKey),
    ) ?? null;
  },
};
