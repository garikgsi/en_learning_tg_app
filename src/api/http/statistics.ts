import {http} from '@/api/http';
import type {ExerciseStatisticsResponse} from '@/api/types/statistics';

export const httpStatisticsDriver = {
  getForPeriod(
    dateFrom: string,
    dateTo: string,
  ): Promise<ExerciseStatisticsResponse> {
    return http.get('/exercises/statistics', {
      params: {dateFrom, dateTo},
    });
  },
};
