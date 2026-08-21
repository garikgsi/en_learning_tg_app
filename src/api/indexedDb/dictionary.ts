import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {
  ApiDictionaryWord,
  DictionaryPageResponse,
  DictionarySyncResponse,
} from '@/api/types/dictionary';
import type {
  CachedDictionaryWord,
  DictionaryCacheMetadata,
} from '@/api/indexedDb/types/dictionary';

const wordKey = (userId: string, wordId: number): string => {
  return `${userId}:${wordId}`;
};

const normalizeSearch = (value?: string): string => {
  return value?.trim().toLocaleLowerCase('ru-RU') ?? '';
};

export const indexedDbDictionaryDriver = {
  getMetadata(userId: string): Promise<DictionaryCacheMetadata | undefined> {
    return indexedDb.get<DictionaryCacheMetadata>(
      indexedDbStores.dictionaryMetadata,
      userId,
    );
  },

  async saveSynchronization(
    userId: string,
    response: DictionarySyncResponse,
  ): Promise<void> {
    const metadata: DictionaryCacheMetadata = {
      userId,
      latestCreatedAt: response.latestCreatedAt,
      availableGrade: response.availableGrade,
      revision: response.revision,
      synchronizedAt: new Date().toISOString(),
    };
    const existing = response.isFullSync
      ? await indexedDb.getAllFromIndex<CachedDictionaryWord>(
        indexedDbStores.dictionaryWords,
        'by-user',
        userId,
      )
      : [];

    await indexedDb.mutateStores([
      ...existing.map(item => ({
        store: indexedDbStores.dictionaryWords,
        type: 'delete' as const,
        key: item.key,
      })),
      ...response.items.map(word => ({
        store: indexedDbStores.dictionaryWords,
        type: 'put' as const,
        value: {
          key: wordKey(userId, word.id),
          userId,
          word,
        } satisfies CachedDictionaryWord,
      })),
      {
        store: indexedDbStores.dictionaryMetadata,
        type: 'put',
        value: metadata,
      },
    ]);
  },

  async getPage(
    userId: string,
    search: string | undefined,
    page: number,
    perPage: number,
  ): Promise<DictionaryPageResponse> {
    const metadata = await this.getMetadata(userId);

    if (!metadata) {
      throw new Error('Словарь ещё не сохранён на устройстве');
    }

    const normalizedSearch = normalizeSearch(search);
    const cached = await indexedDb.getAllFromIndex<CachedDictionaryWord>(
      indexedDbStores.dictionaryWords,
      'by-user',
      userId,
    );
    const words = cached
      .map(item => item.word)
      .filter(word => word.grade <= metadata.availableGrade)
      .filter(word => {
        if (!normalizedSearch) {
          return true;
        }

        return word.ru.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
          || word.en.toLocaleLowerCase('en-US').includes(normalizedSearch);
      })
      .sort((left, right) => left.ru.localeCompare(right.ru, 'ru-RU'));
    const total = words.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(page, lastPage);
    const offset = (currentPage - 1) * perPage;

    return {
      items: words.slice(offset, offset + perPage),
      total,
      page: currentPage,
      perPage,
      lastPage,
      availableGrade: metadata.availableGrade,
    };
  },

  async markSelectedForRepetition(
    userId: string,
    wordId: number,
  ): Promise<void> {
    const cached = await indexedDb.get<CachedDictionaryWord>(
      indexedDbStores.dictionaryWords,
      wordKey(userId, wordId),
    );

    if (!cached) {
      return;
    }

    const word: ApiDictionaryWord = {
      ...cached.word,
      is_active: true,
    };
    await indexedDb.put(indexedDbStores.dictionaryWords, {...cached, word});
  },

  async putWord(userId: string, word: ApiDictionaryWord): Promise<void> {
    await indexedDb.put(indexedDbStores.dictionaryWords, {
      key: wordKey(userId, word.id),
      userId,
      word,
    } satisfies CachedDictionaryWord);
  },
};
