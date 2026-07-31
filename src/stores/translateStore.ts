import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';
import type {Task} from '@/components/ITranslateTask.vue';
import {MAX_HINTS_ON_WORD} from '@/libs/exerciseRules';

export type Word = {
  id: number
  exerciseId: number
  exerciseItemId: number
  wordId: number
  word: string
  translate: string
  checkWord: string
  otherCheckWords: string[]
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

type ExerciseResponse = {
  item: ApiExercise
}

type ExerciseItemResultPayload = {
  exercise_item_id: number
  errors_count: number
  hints_count: number
  lang_id: number
  variants: string[]
}

type CompleteExercisePayload = {
  exercise_id: number
  exercise_items_result: ExerciseItemResultPayload[]
}

const langIds = {
  en: 1,
  ru: 2,
} as const;

export const selectCheckWord = (
  value: string,
): Pick<Word, 'checkWord' | 'otherCheckWords'> => {
  const variants = [...new Set(
    value
      .split(',')
      .map(variant => variant.trim())
      .filter(Boolean),
  )];

  if (variants.length === 0) {
    return {
      checkWord: '',
      otherCheckWords: [],
    };
  }

  const selectedIndex = Math.floor(Math.random() * variants.length);

  return {
    checkWord: variants[selectedIndex],
    otherCheckWords: variants.filter((_, index) => index !== selectedIndex),
  };
}

export const useTranslateStore = defineStore('translate', () => {
  const enList = ref<Word[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const ruList = computed<Word[]>(() => {
    return enList.value.map(word => {
      const checkWord = selectCheckWord(word.word);

      return {
        ...word,
        word: word.translate,
        translate: word.word,
        ...checkWord,
      };
    });
  });

  const clearWords = (): void => {
    enList.value = [];
    errorMessage.value = null;
  }

  const setExercises = (exercises: ApiExercise[]): void => {
    enList.value = exercises.flatMap(exercise => {
      return exercise.items.map(({id, word}) => {
        const checkWord = selectCheckWord(word.en);

        return {
          id,
          exerciseId: exercise.id,
          exerciseItemId: id,
          wordId: word.id,
          word: word.ru,
          translate: word.en,
          ...checkWord,
        };
      });
    });
  }

  const loadWords = async (_code?: string): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const {data} = await apiClient.get<ExercisesResponse>(
        '/api/v1/exercises/current',
      );

      setExercises(data.items);
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

  const loadExercise = async (exerciseId: number): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const {data} = await apiClient.get<ExerciseResponse>(
        `/api/v1/exercises/${exerciseId}`,
      );

      setExercises([data.item]);
    } catch (error) {
      enList.value = [];
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось загрузить выбранное упражнение',
      );
    } finally {
      isLoading.value = false;
    }
  }

  const taskCompleted = async (tasks: Task[]): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const resultsByExercise = new Map<number, ExerciseItemResultPayload[]>();

      tasks.forEach(task => {
        task.results.forEach(result => {
          const word = task.list.find(item => item.id === result.id);

          if (!word) {
            throw new Error('Exercise item was not found for the result.');
          }

          const exerciseResults = resultsByExercise.get(word.exerciseId) ?? [];
          const variants = result.variants.filter(variant => {
            const lettersCount = Array.from(
              variant.replace(/\s/g, ''),
            ).length;

            return lettersCount >= MAX_HINTS_ON_WORD;
          });

          exerciseResults.push({
            exercise_item_id: word.exerciseItemId,
            errors_count: result.errorTimes,
            hints_count: result.hintTimes,
            lang_id: langIds[task.lang],
            variants,
          });
          resultsByExercise.set(word.exerciseId, exerciseResults);
        });
      });

      await Promise.all(
        [...resultsByExercise.entries()].map(
          ([exerciseId, exerciseItemsResult]) => {
            const payload: CompleteExercisePayload = {
              exercise_id: exerciseId,
              exercise_items_result: exerciseItemsResult,
            };

            return apiClient.post('/api/v1/exercises/complete', payload);
          },
        ),
      );

      enList.value = [];
    } catch (error) {
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось сохранить результаты упражнения',
      );
    } finally {
      isLoading.value = false;
    }
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
    loadExercise,
    clearWords,
    taskCompleted,
    clearError,
  };
});
