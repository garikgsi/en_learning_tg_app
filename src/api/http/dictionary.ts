import {http} from '@/api/http';
import type {DictionarySyncResponse} from '@/api/types/dictionary';

export const httpDictionaryDriver = {
  synchronize(
    page: number,
    perPage: number,
    createdAfter?: string,
    availableGrade?: number,
  ): Promise<DictionarySyncResponse> {
    return http.get<DictionarySyncResponse>('/dictionary/sync', {
      params: {page, perPage, createdAfter, availableGrade},
    });
  },

  addWord(wordId: number): Promise<void> {
    return http.post<void>('/repetition-list/words', {
      word_id: wordId,
    });
  },
};
