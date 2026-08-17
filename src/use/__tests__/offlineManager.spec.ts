import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  getExercisesForPeriod: vi.fn().mockResolvedValue({
    data: [],
    source: 'http',
  }),
  getStatisticsForPeriod: vi.fn().mockResolvedValue({
    data: {},
    source: 'http',
    fetchedAt: new Date().toISOString(),
  }),
  synchronizeDictionary: vi.fn().mockResolvedValue({source: 'http'}),
}));

vi.mock('@/use/exerciseRepository', () => ({
  useExerciseRepository: () => ({
    getForPeriod: mocks.getExercisesForPeriod,
  }),
}));

vi.mock('@/use/statisticsRepository', () => ({
  useStatisticsRepository: () => ({
    getForPeriod: mocks.getStatisticsForPeriod,
  }),
}));

vi.mock('@/use/dictionaryRepository', () => ({
  useDictionaryRepository: () => ({
    synchronize: mocks.synchronizeDictionary,
  }),
}));

import {useOfflineManager} from '@/use/offlineManager';

describe('offlineManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates simultaneous prefetch requests for the same period', async () => {
    const manager = useOfflineManager();

    await Promise.all([
      manager.prefetch('user-1'),
      manager.prefetch('user-1'),
      manager.prefetch('user-1'),
    ]);

    expect(mocks.getExercisesForPeriod).toHaveBeenCalledOnce();
    expect(mocks.getStatisticsForPeriod).toHaveBeenCalledOnce();
    expect(mocks.synchronizeDictionary).toHaveBeenCalledOnce();
  });
});
