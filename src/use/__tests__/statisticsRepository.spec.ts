import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AxiosError, AxiosHeaders} from 'axios';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import {httpStatisticsDriver} from '@/api/http/statistics';
import type {ExerciseStatisticsResponse} from '@/api/types/statistics';
import {useStatisticsRepository} from '@/use/statisticsRepository';

const response: ExerciseStatisticsResponse = {
  items: [],
  attentionWords: [],
  charts: {
    week: {dateFrom: '2026-08-10', dateTo: '2026-08-16', users: []},
    month: {dateFrom: '2026-08-01', dateTo: '2026-08-31', users: []},
  },
};

describe('statisticsRepository', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await indexedDb.clear(indexedDbStores.statistics);
  });

  it('returns the last server snapshot when the network is unavailable', async () => {
    const getForPeriod = vi.spyOn(httpStatisticsDriver, 'getForPeriod');
    getForPeriod.mockResolvedValueOnce(response);
    const repository = useStatisticsRepository();

    const online = await repository.getForPeriod(
      'user-1',
      '2026-08',
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    );
    getForPeriod.mockRejectedValueOnce(new AxiosError('Network unavailable'));

    const offline = await repository.getForPeriod(
      'user-1',
      '2026-08',
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    );

    expect(online.source).toBe('http');
    expect(offline).toEqual({
      data: response,
      source: 'indexedDb',
      fetchedAt: online.fetchedAt,
      fallbackReason: 'network',
    });
  });

  it('reports a server fallback separately from a network failure', async () => {
    const getForPeriod = vi.spyOn(httpStatisticsDriver, 'getForPeriod');
    getForPeriod.mockResolvedValueOnce(response);
    const repository = useStatisticsRepository();
    const args = [
      'user-1',
      '2026-08',
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    ] as const;

    await repository.getForPeriod(...args);
    getForPeriod.mockRejectedValueOnce(new AxiosError(
      'Request failed with status code 500',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {headers: new AxiosHeaders()},
        data: {},
      },
    ));

    const fallback = await repository.getForPeriod(...args);

    expect(fallback.source).toBe('indexedDb');
    expect(fallback.fallbackReason).toBe('server');
  });
});
