import {httpStatisticsDriver} from '@/api/http/statistics';
import {indexedDbStatisticsDriver} from '@/api/indexedDb/statistics';
import type {StatisticsRepositoryResult} from '@/use/types/statisticsRepository';
import {getRepositoryFallbackReason} from '@/use/repositoryFallback';

const repository = {
  async getForPeriod(
    userId: string,
    periodKey: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<StatisticsRepositoryResult> {
    try {
      const data = await httpStatisticsDriver.getForPeriod(dateFrom, dateTo);
      const snapshot = await indexedDbStatisticsDriver.save(
        userId,
        periodKey,
        data,
      );

      return {
        data,
        source: 'http',
        fetchedAt: snapshot.fetchedAt,
      };
    } catch (error) {
      const fallbackReason = getRepositoryFallbackReason(error);

      if (!fallbackReason) {
        throw error;
      }

      const snapshot = await indexedDbStatisticsDriver.get(userId, periodKey);

      if (!snapshot) {
        throw error;
      }

      return {
        data: snapshot.data,
        source: 'indexedDb',
        fetchedAt: snapshot.fetchedAt,
        fallbackReason,
      };
    }
  },
};

export const useStatisticsRepository = () => repository;
