import {baseUrl, http} from '@/api/http';
import {apiBaseUrl} from '@/api/client';
import type {
  DictionaryLookupResponse,
  DictionaryStorePayload,
  DictionaryStoreResponse,
  DictionarySyncResponse,
} from '@/api/types/dictionary';

export const httpDictionaryDriver = {
  synchronize(
    page: number,
    perPage: number,
    createdAfter?: string,
    availableGrade?: number,
    revision?: number,
  ): Promise<DictionarySyncResponse> {
    return http.get<DictionarySyncResponse>('/dictionary/sync', {
      params: {page, perPage, createdAfter, availableGrade, revision},
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

  getWordAudioUrl(wordId: number): string {
    const serverUrl = apiBaseUrl.replace(/\/+$/, '');

    return `${serverUrl}${baseUrl}/dictionary/words/${wordId}/audio`;
  },
};
