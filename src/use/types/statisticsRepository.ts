import type {ExerciseStatisticsResponse} from '@/api/types/statistics';
import type {
  RepositoryFallbackReason,
  RepositorySource,
} from '@/use/types/repository';

export type StatisticsRepositoryResult = {
  data: ExerciseStatisticsResponse
  source: RepositorySource
  fetchedAt: string
  fallbackReason?: RepositoryFallbackReason
}
