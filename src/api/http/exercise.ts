import {http} from '@/api/http';
import type {
  CompleteExercisePayload,
  Exercise,
  ExerciseCompletion,
} from '@/api/types/exercise';

type ExercisesResponse = {
  items: Exercise[]
}

type ExerciseResponse = {
  item: Exercise
}

type ExerciseCompletionResponse = {
  data: ExerciseCompletion
}

type CreateExerciseResponse = {
  item: {id: number}
}

export const httpExerciseDriver = {
  async createUserExercise(): Promise<number> {
    const response = await http.post<CreateExerciseResponse>(
      '/exercises',
    );

    return response.item.id;
  },

  async getForPeriod(dateFrom: string, dateTo: string): Promise<Exercise[]> {
    const response = await http.get<ExercisesResponse>('/exercises', {
      params: {dateFrom, dateTo},
    });

    return response.items;
  },

  async getCurrent(): Promise<Exercise[]> {
    const response = await http.get<ExercisesResponse>(
      '/exercises/current',
    );

    return response.items;
  },

  async getById(exerciseId: number): Promise<Exercise> {
    const response = await http.get<ExerciseResponse>(
      `/exercises/${exerciseId}`,
    );

    return response.item;
  },

  async complete(
    payload: CompleteExercisePayload,
  ): Promise<ExerciseCompletion> {
    const response = await http.post<ExerciseCompletionResponse>(
      '/exercises/complete',
      payload,
    );

    return response.data;
  },
};
