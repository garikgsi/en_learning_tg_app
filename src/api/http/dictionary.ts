import {baseUrl, http} from '@/api/http';
import {apiBaseUrl} from '@/api/client';
import type {
  DictionaryLookupResponse,
  DictionaryStorePayload,
  DictionaryStoreResponse,
  DictionarySyncResponse,
  DictionaryUpdatePayload,
  DictionaryWordResponse,
} from '@/api/types/dictionary';

const bypassDevelopmentAudioCache = (url: string): string => {
  if (import.meta.env.MODE !== 'development') {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}audio_cache_bust=${Date.now()}`;
};

export const httpDictionaryDriver = {
  synchronize(
    page: number,
    perPage: number,
    createdAfter?: string,
    availableGrade?: number | null,
    revision?: number,
    updatedAfter?: string,
  ): Promise<DictionarySyncResponse> {
    return http.get<DictionarySyncResponse>('/dictionary/sync', {
      params: {page, perPage, createdAfter, availableGrade, revision, updatedAfter},
    });
  },

  addWord(wordId: number): Promise<void> {
    return http.post<void>('/repetition-list/words', {
      word_id: wordId,
    });
  },

  lookupWord(
    word: string,
    sourceLanguage: 'ru' | 'en',
  ): Promise<DictionaryLookupResponse> {
    return http.post<DictionaryLookupResponse>('/dictionary/lookup', {
      word,
      sourceLanguage,
    });
  },

  storeWord(
    word: DictionaryStorePayload,
  ): Promise<DictionaryStoreResponse> {
    return http.post<DictionaryStoreResponse>('/dictionary/words', word);
  },

  getWord(wordId: number): Promise<DictionaryWordResponse> {
    return http.get<DictionaryWordResponse>(`/dictionary/words/${wordId}`);
  },

  updateWord(wordId: number, word: DictionaryUpdatePayload): Promise<DictionaryWordResponse> {
    return http.patch<DictionaryWordResponse>(`/dictionary/words/${wordId}`, word);
  },

  getWordAudioUrl(wordId: number, english?: string): string {
    const serverUrl = apiBaseUrl.replace(/\/+$/, '');

    const url = `${serverUrl}${baseUrl}/dictionary/words/${wordId}/audio`;
    return bypassDevelopmentAudioCache(
      english ? `${url}?word=${encodeURIComponent(english)}` : url,
    );
  },

  getPluralAudioUrl(pluralId: number): string {
    const serverUrl = apiBaseUrl.replace(/\/+$/, '');

    return bypassDevelopmentAudioCache(
      `${serverUrl}${baseUrl}/dictionary/plurals/${pluralId}/audio`,
    );
  },
};
