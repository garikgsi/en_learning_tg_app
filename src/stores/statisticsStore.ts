import {ref} from 'vue';
import {defineStore} from 'pinia';
import {getApiErrorMessage} from '@/api/errors';
import useMessages from '@/use/messages';
import {useStatisticsRepository} from '@/use/statisticsRepository';
import {useExerciseRepository} from '@/use/exerciseRepository';
import {useUserStore} from '@/stores/userStore';
import {useDictionaryRepository} from '@/use/dictionaryRepository';
import {messageKeys} from '@/use/messageKeys';
import type {
  AttentionWord,
  ExerciseStatisticsChartPeriod,
  ExerciseStatisticsCharts,
  ExerciseStatisticsItem,
  UserExerciseStatistics,
} from '@/api/types/statistics';

type StatisticsAchievement = {
  place: 1 | 2 | 3
  period: 'week' | 'month'
  criterion: 'learnedWords' | 'wordsToRepeat' | 'completedExercises'
}

const {addError, addWarning, readMessageByKey} = useMessages();

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
  const statisticsRepository = useStatisticsRepository();
  const exerciseRepository = useExerciseRepository();
  const dictionaryRepository = useDictionaryRepository();
  const userStore = useUserStore();


  const loadMonth = async (date: Date): Promise<void> => {

    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const period = monthPeriod(date);
      const periodKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;
      const result = await statisticsRepository.getForPeriod(
        userId,
        periodKey,
        period.dateFrom,
        period.dateTo,
      );

      items.value = result.data.items;
      charts.value = result.data.charts;
      attentionWords.value = result.data.attentionWords ?? [];
      if (result.source === 'indexedDb') {
        const formatted = new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(result.fetchedAt));

        const warning = result.fallbackReason === 'server'
          ? `Ошибка сервера. Показаны сохранённые данные на ${formatted}.`
          : `Нет подключения к интернету. Показаны данные на ${formatted}.`;

        addWarning(
          warning,
          0,
          {
            key: messageKeys.cachedStatistics,
            action: {
              title: 'Обновить',
              handler: async () => {
                await loadMonth(date);
              },
            },
          },
        );
      } else {
        readMessageByKey(messageKeys.cachedStatistics);
        readMessageByKey(messageKeys.statisticsLoadError);
      }
    } catch (error) {
      items.value = [];
      charts.value = null;
      attentionWords.value = [];
      addError(
        getApiErrorMessage(error, 'Не удалось загрузить статистику упражнений'),
        0,
        {
          key: messageKeys.statisticsLoadError,
          action: {
            title: 'Обновить',
            handler: async () => {
              await loadMonth(date);
            },
          },
        },
      );
    }
  }

  const createUserExercise = async (): Promise<number> => {
    isCreating.value = true;

    try {
      return await exerciseRepository.createUserExercise();
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
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      await dictionaryRepository.addWord(userId, wordId);

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
