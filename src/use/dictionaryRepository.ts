import {httpDictionaryDriver} from '@/api/http/dictionary';
import {indexedDbDictionaryDriver} from '@/api/indexedDb/dictionary';
import type {
  DictionaryLookupResponse,
  DictionaryPageResponse,
  DictionaryStorePayload,
  DictionaryStoreResponse,
} from '@/api/types/dictionary';
import {getRepositoryFallbackReason} from '@/use/repositoryFallback';
import type {
  RepositoryFallbackReason,
  RepositoryResult,
  RepositorySource,
} from '@/use/types/repository';

type SynchronizationResult = {
  source: RepositorySource
  fallbackReason?: RepositoryFallbackReason
}

const synchronizationRequests = new Map<string, Promise<SynchronizationResult>>();
const synchronizationResults = new Map<
  string,
  SynchronizationResult & {checkedAt: number}
>();
const synchronizationTtlMs = 60_000;
const synchronizationPageSize = 500;

const performSynchronization = async (
  userId: string,
): Promise<SynchronizationResult> => {
  const metadata = await indexedDbDictionaryDriver.getMetadata(userId);

  try {
    const firstPage = await httpDictionaryDriver.synchronize(
      1,
      synchronizationPageSize,
      metadata?.latestCreatedAt ?? undefined,
      metadata?.availableGrade,
      metadata?.revision,
    );
    const remainingPages = await Promise.all(
      Array.from(
        {length: Math.max(0, firstPage.lastPage - 1)},
        (_, index) => httpDictionaryDriver.synchronize(
          index + 2,
          synchronizationPageSize,
          metadata?.latestCreatedAt ?? undefined,
          metadata?.availableGrade,
          metadata?.revision,
        ),
      ),
    );
    const response = {
      ...firstPage,
      items: [
        ...firstPage.items,
        ...remainingPages.flatMap(page => page.items),
      ],
    };

    await indexedDbDictionaryDriver.saveSynchronization(userId, response);

    return {source: 'http'};
  } catch (error) {
    const fallbackReason = getRepositoryFallbackReason(error);

    if (!fallbackReason || !metadata) {
      throw error;
    }

    return {source: 'indexedDb', fallbackReason};
  }
};

const synchronize = async (
  userId: string,
  force = false,
): Promise<SynchronizationResult> => {
  const recent = synchronizationResults.get(userId);

  if (
    !force
    && recent
    && Date.now() - recent.checkedAt < synchronizationTtlMs
  ) {
    return recent;
  }

  const existing = synchronizationRequests.get(userId);

  if (existing) {
    return existing;
  }

  const request = performSynchronization(userId)
    .then(result => {
      synchronizationResults.set(userId, {...result, checkedAt: Date.now()});
      return result;
    })
    .finally(() => synchronizationRequests.delete(userId));
  synchronizationRequests.set(userId, request);

  return request;
};

const repository = {
  synchronize,

  async getPage(
    userId: string,
    search: string | undefined,
    page: number,
    perPage: number,
  ): Promise<RepositoryResult<DictionaryPageResponse>> {
    const synchronization = await synchronize(userId);
    const data = await indexedDbDictionaryDriver.getPage(
      userId,
      search,
      page,
      perPage,
    );

    return {...synchronization, data};
  },

  async addWord(userId: string, wordId: number): Promise<void> {
    await httpDictionaryDriver.addWord(wordId);
    await indexedDbDictionaryDriver.markSelectedForRepetition(userId, wordId);
  },

  lookupWord(
    word: string,
    sourceLanguage: 'ru' | 'en',
  ): Promise<DictionaryLookupResponse> {
    return httpDictionaryDriver.lookupWord(word, sourceLanguage);
  },

  async storeWord(
    userId: string,
    word: DictionaryStorePayload,
  ): Promise<DictionaryStoreResponse> {
    const response = await httpDictionaryDriver.storeWord(word);
    await indexedDbDictionaryDriver.putWord(userId, response.item);
    synchronizationResults.delete(userId);

    return response;
  },

  getWordAudioUrl(wordId: number): string {
    return httpDictionaryDriver.getWordAudioUrl(wordId);
  },
};

export const useDictionaryRepository = () => repository;
