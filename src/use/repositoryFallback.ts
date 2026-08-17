import {getApiErrorStatus, isNetworkError} from '@/api/errors';
import type {RepositoryFallbackReason} from '@/use/types/repository';

export const getRepositoryFallbackReason = (
  error: unknown,
): RepositoryFallbackReason | null => {
  if (isNetworkError(error)) {
    return 'network';
  }

  const status = getApiErrorStatus(error);

  return status !== null && status >= 500 ? 'server' : null;
};
