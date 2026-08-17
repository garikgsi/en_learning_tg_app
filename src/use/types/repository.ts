export type RepositorySource = 'http' | 'indexedDb';
export type RepositoryFallbackReason = 'network' | 'server';

export type RepositoryResult<T> = {
  data: T
  source: RepositorySource
  fallbackReason?: RepositoryFallbackReason
}
