import {ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';
import useMessages from '@/use/messages';

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

export type UserExerciseStatistics = {
  userId: string
  userName: string
  learnedWords: number
  wordsToRepeat: number
  completedExercises: number
}

export type ExerciseStatisticsChartPeriod = {
  dateFrom: string
  dateTo: string
  users: UserExerciseStatistics[]
}

export type ExerciseStatisticsCharts = {
  week: ExerciseStatisticsChartPeriod
  month: ExerciseStatisticsChartPeriod
}

export type AttentionWord = {
  wordId: number
  russian: string
  english: string
  errorPercentage: number
  isSelectedForRepetition: boolean
}

export type StatisticsAchievement = {
  place: 1 | 2 | 3
  period: 'week' | 'month'
  criterion: 'learnedWords' | 'wordsToRepeat' | 'completedExercises'
}

type ExerciseStatisticsResponse = {
  items: ExerciseStatisticsItem[]
  charts: ExerciseStatisticsCharts
  attentionWords: AttentionWord[]
}

type CreateUserExerciseResponse = {
  item: {
    id: number
  }
}

const {addError} = useMessages();

const achievementCriteria: StatisticsAchievement['criterion'][] = [
  'learnedWords',
  'wordsToRepeat',
  'completedExercises',
];

export const findStatisticsAchievement = (
  charts: ExerciseStatisticsCharts | null,
  currentUserId?: string,
): StatisticsAchievement | null => {
  if (!charts || !currentUserId) {
    return null;
  }

  for (const place of [1, 2, 3] as const) {
    for (const period of ['week', 'month'] as const) {
      const currentUser = charts[period].users.find(
        item => item.userId === currentUserId,
      );

      if (!currentUser) {
        continue;
      }

      for (const criterion of achievementCriteria) {
        const result = currentUser[criterion];

        if (result <= 0) {
          continue;
        }

        const usersAhead = charts[period].users.filter(
          item => item[criterion] > result,
        ).length;

        if (usersAhead + 1 === place) {
          return {
            place,
            period,
            criterion,
          };
        }
      }
    }
  }

  return null;
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
  const charts = ref<ExerciseStatisticsCharts | null>(null);
  const attentionWords = ref<AttentionWord[]>([]);
  const addingAttentionWordIds = ref<number[]>([]);
  const isCreating = ref(false);


  const loadMonth = async (date: Date): Promise<void> => {

    try {
      const {data} = await apiClient.get<ExerciseStatisticsResponse>(
        '/api/v1/exercises/statistics',
        {
          params: monthPeriod(date),
        },
      );

      items.value = data.items;
      charts.value = data.charts;
      attentionWords.value = data.attentionWords ?? [];
    } catch (error) {
      items.value = [];
      charts.value = null;
      attentionWords.value = [];
      addError(getApiErrorMessage( error, 'Не удалось загрузить статистику упражнений'));
    }
  }

  const createUserExercise = async (): Promise<number> => {
    isCreating.value = true;

    try {
      const {data} = await apiClient.post<CreateUserExerciseResponse>(
        '/api/v1/exercises',
      );

      return data.item.id;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось создать пользовательское задание'));
      throw error;
    } finally {
      isCreating.value = false;
    }
  }

  const isAddingAttentionWord = (wordId: number): boolean => {
    return addingAttentionWordIds.value.includes(wordId);
  }

  const addAttentionWordToRepetition = async (
    wordId: number,
  ): Promise<void> => {
    const word = attentionWords.value.find(item => item.wordId === wordId);

    if (
      !word
      || word.isSelectedForRepetition
      || isAddingAttentionWord(wordId)
    ) {
      return;
    }

    addingAttentionWordIds.value.push(wordId);

    try {
      await apiClient.post('/api/v1/repetition-list/words', {
        word_id: wordId,
      });

      word.isSelectedForRepetition = true;
    } catch (error) {
      addError(getApiErrorMessage( error, 'Не удалось добавить слово для повторения'));
    } finally {
      addingAttentionWordIds.value = addingAttentionWordIds.value.filter(
        item => item !== wordId,
      );
    }
  }


  return {
    items,
    charts,
    attentionWords,
    addingAttentionWordIds,
    isCreating,
    loadMonth,
    createUserExercise,
    isAddingAttentionWord,
    addAttentionWordToRepetition,

  };
});
