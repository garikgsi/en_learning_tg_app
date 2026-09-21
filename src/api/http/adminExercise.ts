import {http} from '@/api/http';
import type {DictionaryPageResponse} from '@/api/types/dictionary';
import type {Exercise} from '@/api/types/exercise';

export type AssignmentUser = {
  id: string
  name: string
  phone: string
  grade: number | null
  avatar: string
  totalEarnedCoins: number
}

export type DailyAssignmentPayload = {
  userId: string
  wordIds: number[]
  dueDate: string
  replaceExisting: boolean
}

export const httpAdminExerciseDriver = {
  async getUsers(): Promise<AssignmentUser[]> {
    return (await http.get<{items: AssignmentUser[]}>('/admin/users')).items;
  },

  async searchWords(search: string): Promise<DictionaryPageResponse> {
    return http.get<DictionaryPageResponse>('/dictionary', {params: {search, page: 1, perPage: 30}});
  },

  assign(payload: DailyAssignmentPayload): Promise<{item: Exercise, wasReplaced: boolean}> {
    return http.post('/admin/exercises/daily', payload);
  },
};
