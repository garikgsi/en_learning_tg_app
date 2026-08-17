import {describe, expect, it, vi} from 'vitest';
import {baseUrl, HttpClient, type HttpTransport} from '@/api/http';

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
});
