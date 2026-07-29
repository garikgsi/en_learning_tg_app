import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';
import type {Task} from '@/components/ITranslateTask.vue';

export type Word = {
  id: number
  word: string
  translate: string
}

type ApiExerciseWord = {
  id: number
  ru: string
  en: string
  grade: number
}

type ApiExercise = {
  id: number
  userId: string
  type: {
    id: number
    name: string
    title: string
  }
  dueDate: string
  items: {
    id: number
    word: ApiExerciseWord
  }[]
  createdAt: string
}

type ExercisesResponse = {
  items: ApiExercise[]
}

export const useTranslateStore = defineStore('translate', () => {
  const enList = ref<Word[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const ruList = computed<Word[]>(() => {
    return enList.value.map(word => ({
      id: word.id,
      word: word.translate,
      translate: word.word,
    }));
  });

  const loadWords = async (_code?: string): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const {data} = await apiClient.get<ExercisesResponse>(
        '/api/v1/exercises/current',
      );

      enList.value = data.items.flatMap(exercise => {
        return exercise.items.map(({word}) => ({
          id: word.id,
          word: word.ru,
          translate: word.en,
        }));
      });
    } catch (error) {
      enList.value = [];
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось загрузить упражнение',
      );
    } finally {
      isLoading.value = false;
    }
  }

  const taskCompleted = async (tasks: Task[]): Promise<void> => {
    // TODO: Send the results when the exercise completion endpoint is ready.
    void tasks;
  }

  const clearError = (): void => {
    errorMessage.value = null;
  }

  return {
    enList,
    ruList,
    isLoading,
    errorMessage,
    loadWords,
    taskCompleted,
    clearError,
  };
});
