import {describe, expect, it} from 'vitest';
import {AxiosError, AxiosHeaders} from 'axios';
import {getApiErrorMessage} from '@/api/errors';

describe('getApiErrorMessage', () => {
  it('classifies an HTTP 500 response as a server error', () => {
    const error = new AxiosError(
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
    );

    expect(getApiErrorMessage(error, 'Не удалось загрузить данные')).toBe(
      'Ошибка сервера. Повторите попытку позже',
    );
  });
});
