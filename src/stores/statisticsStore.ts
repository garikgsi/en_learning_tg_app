import {ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';

export type ExerciseStatisticsItem = {
  exerciseId: number
  completionId: number | null
  status: 'completed' | 'uncompleted'
  date: string
  type: {
    id: number
    name: string
    title: string
  }
  wordsCount: number
  wordsWithErrors: number
  successPercentage: number
}

type ExerciseStatisticsResponse = {
  items: ExerciseStatisticsItem[]
}

const monthPeriod = (date: Date) => {
  const dateFrom = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const dateTo = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

export const useStatisticsStore = defineStore('statistics', () => {
  const items = ref<ExerciseStatisticsItem[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const loadMonth = async (date: Date): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const {data} = await apiClient.get<ExerciseStatisticsResponse>(
        '/api/v1/exercises/statistics',
        {
          params: monthPeriod(date),
        },
      );

      items.value = data.items;
    } catch (error) {
      items.value = [];
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось загрузить статистику упражнений',
      );
    } finally {
      isLoading.value = false;
    }
  }

  const clearError = (): void => {
    errorMessage.value = null;
  }

  return {
    items,
    isLoading,
    errorMessage,
    loadMonth,
    clearError,
  };
});
