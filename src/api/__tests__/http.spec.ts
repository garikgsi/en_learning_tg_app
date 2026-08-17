import {afterEach, describe, expect, it, vi} from 'vitest';
import {baseUrl, http, HttpClient, type HttpTransport} from '@/api/http';
import {httpAppUpdateDriver} from '@/api/http/appUpdate';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HttpClient', () => {
  it('adds the API version prefix to driver paths', async () => {
    const get = vi.fn().mockResolvedValue({data: {ok: true}});
    const transport = {get} as unknown as HttpTransport;
    const client = new HttpClient(transport, baseUrl);

    await client.get('/dictionary/sync', {params: {page: 1}});

    expect(get).toHaveBeenCalledWith('/api/v1/dictionary/sync', {
      params: {page: 1},
    });
  });

  it('requests a backend refresh during a manual update check', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({data: null});

    await httpAppUpdateDriver.getLatest(true);

    expect(get).toHaveBeenCalledWith('/app-updates/latest', {
      params: {refresh: 1},
    });
  });
});
