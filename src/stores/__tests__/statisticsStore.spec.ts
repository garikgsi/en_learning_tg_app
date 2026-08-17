import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {apiClient} from '@/api/client';
import {
  findStatisticsAchievement,
  useStatisticsStore,
} from '@/stores/statisticsStore';
import type {ExerciseStatisticsCharts} from '@/api/types/statistics';
import {useUserStore} from '@/stores/userStore';

const chartsWithUsers = (
  users: ExerciseStatisticsCharts['week']['users'],
): ExerciseStatisticsCharts => ({
  week: {
    dateFrom: '2026-07-27T00:00:00Z',
    dateTo: '2026-07-31T23:59:59Z',
    users,
  },
  month: {
    dateFrom: '2026-07-01T00:00:00Z',
    dateTo: '2026-07-31T23:59:59Z',
    users,
  },
});

describe('statisticsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads attention words and adds a word for repetition', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        items: [],
        charts: {
          week: {
            dateFrom: '2026-07-27T00:00:00Z',
            dateTo: '2026-07-31T23:59:59Z',
            users: [],
          },
          month: {
            dateFrom: '2026-07-01T00:00:00Z',
            dateTo: '2026-07-31T23:59:59Z',
            users: [],
          },
        },
        attentionWords: [
          {
            wordId: 42,
            russian: 'кока-кола',
            english: 'coca-cola',
            errorPercentage: 75,
            isSelectedForRepetition: false,
          },
        ],
      },
    } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        item: {
          wordId: 42,
        },
      },
    } as never);
    useUserStore().user = {
      id: 'current-user',
      name: 'Current user',
      phone: '+79991234567',
      avatar: '',
      createdAt: '2026-07-01T00:00:00Z',
    };
    const store = useStatisticsStore();

    await store.loadMonth(new Date(2026, 6, 15));
    await store.addAttentionWordToRepetition(42);

    expect(post).toHaveBeenCalledWith(
      '/api/v1/repetition-list/words',
      {word_id: 42},
    );
    expect(store.attentionWords).toEqual([
      expect.objectContaining({
        wordId: 42,
        errorPercentage: 75,
        isSelectedForRepetition: true,
      }),
    ]);
  });

  it('selects the first criterion for the best non-zero place', () => {
    const charts = chartsWithUsers([
      {
        userId: 'current',
        userName: 'Current',
        learnedWords: 10,
        wordsToRepeat: 8,
        completedExercises: 6,
      },
      {
        userId: 'other',
        userName: 'Other',
        learnedWords: 9,
        wordsToRepeat: 7,
        completedExercises: 5,
      },
    ]);

    expect(findStatisticsAchievement(charts, 'current')).toEqual({
      place: 1,
      period: 'week',
      criterion: 'learnedWords',
    });
  });

  it('falls back to second place and ignores zero values', () => {
    const charts = chartsWithUsers([
      {
        userId: 'leader',
        userName: 'Leader',
        learnedWords: 10,
        wordsToRepeat: 4,
        completedExercises: 0,
      },
      {
        userId: 'current',
        userName: 'Current',
        learnedWords: 7,
        wordsToRepeat: 0,
        completedExercises: 0,
      },
      {
        userId: 'other',
        userName: 'Other',
        learnedWords: 5,
        wordsToRepeat: 3,
        completedExercises: 0,
      },
    ]);

    expect(findStatisticsAchievement(charts, 'current')).toEqual({
      place: 2,
      period: 'week',
      criterion: 'learnedWords',
    });
  });
});
