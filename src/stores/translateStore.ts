import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {getApiErrorMessage} from '@/api/errors';
import type {Exercise} from '@/api/types/exercise';
import type {
  TranslationTask,
  TranslationWord,
} from '@/types/translation';
import {MAX_HINTS_ON_WORD} from '@/libs/exerciseRules';
import useMessages from '@/use/messages';
import {useExerciseRepository} from '@/use/exerciseRepository';
import {useUserStore} from '@/stores/userStore';
import {useOfflineManager} from '@/use/offlineManager';
import {messageKeys} from '@/use/messageKeys';

type ExerciseItemResultPayload = {
  exercise_item_id: number
  errors_count: number
  hints_count: number
  lang_id: number
  variants: string[]
}

const {
  addError,
  addInfo,
  addWarning,
  readMessageByKey,
} = useMessages();

const langIds = {
  en: 1,
  ru: 2,
} as const;

export const selectCheckWord = (
  value: string | string[],
): Pick<TranslationWord, 'checkWord' | 'otherCheckWords'> => {
  const variants = [...new Set(
    (Array.isArray(value) ? value : [value])
      .flatMap(variant => variant.split(','))
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
  const wordList = ref<TranslationWord[]>([]);
  const exerciseRepository = useExerciseRepository();
  const userStore = useUserStore();
  const offlineManager = useOfflineManager();

  const reversedWordList = computed<TranslationWord[]>(() => {
    return wordList.value.map(word => {
      const checkWord = selectCheckWord([word.word, ...word.wordVariants]);

      return {
        ...word,
        word: word.translate,
        translate: word.word,
        wordVariants: [],
        ...checkWord,
      };
    });
  });

  const clearWords = (): void => {
    wordList.value = [];
  }

  const setExercises = (exercises: Exercise[]): void => {
    wordList.value = exercises.flatMap(exercise => {
      return exercise.items.map(({id, word}) => {
        const checkWord = selectCheckWord([
          word.en,
          ...(word.enVariants ?? []),
        ]);

        return {
          id,
          exerciseId: exercise.id,
          exerciseItemId: id,
          wordId: word.id,
          word: word.ru,
          translate: word.en,
          wordVariants: word.ruVariants ?? [],
          ...checkWord,
        };
      });
    });
  }

  const loadWords = async (_code?: string): Promise<boolean> => {
    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const result = await exerciseRepository.getCurrent(userId);

      setExercises(result.data);
      if (result.source === 'indexedDb') {
        const warning = result.fallbackReason === 'server'
          ? 'Ошибка сервера. Используется сохранённое упражнение.'
          : 'Нет подключения к интернету. Используется сохранённое упражнение.';

        addWarning(
          warning,
          0,
          {
            key: messageKeys.cachedExercise,
            action: {
              title: 'Обновить',
              handler: async () => {
                await loadWords(_code);
              },
            },
          },
        );
      } else {
        readMessageByKey(messageKeys.cachedExercise);
        readMessageByKey(messageKeys.exerciseLoadError);
      }

      return true;
    } catch (error) {
      wordList.value = [];
      const errorMessage = getApiErrorMessage(
        error,
        'Не удалось загрузить упражнение',
      );
      addError(errorMessage, 0, {
        key: messageKeys.exerciseLoadError,
        action: {
          title: 'Обновить',
          handler: async () => {
            await loadWords(_code);
          },
        },
      });
      return false;
    }
  }

  const loadExercise = async (exerciseId: number): Promise<boolean> => {
    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const result = await exerciseRepository.getById(
        userId,
        exerciseId,
      );

      setExercises([result.data]);
      if (result.source === 'indexedDb') {
        const warning = result.fallbackReason === 'server'
          ? 'Ошибка сервера. Используется сохранённое упражнение.'
          : 'Нет подключения к интернету. Используется сохранённое упражнение.';

        addWarning(
          warning,
          0,
          {
            key: messageKeys.cachedExercise,
            action: {
              title: 'Обновить',
              handler: async () => {
                await loadExercise(exerciseId);
              },
            },
          },
        );
      } else {
        readMessageByKey(messageKeys.cachedExercise);
        readMessageByKey(messageKeys.exerciseLoadError);
      }

      return true;
    } catch (error) {
      wordList.value = [];
      const errorMessage = getApiErrorMessage(
        error,
        'Не удалось загрузить выбранное упражнение',
      );
      addError(errorMessage, 0, {
        key: messageKeys.exerciseLoadError,
        action: {
          title: 'Обновить',
          handler: async () => {
            await loadExercise(exerciseId);
          },
        },
      });
      return false;
    }
  }

  const taskCompleted = async (tasks: TranslationTask[]): Promise<void> => {

    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

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

      const summary = await exerciseRepository.enqueueCompletions(
        userId,
        [...resultsByExercise.entries()].map(
          ([exerciseId, itemResults]) => ({exerciseId, itemResults})),
      );
      await offlineManager.updateOutboxSummary(userId);

      wordList.value = [];

      if (summary.pending > 0) {
        addInfo('Результат сохранён и будет отправлен при подключении к интернету');
      }
    } catch (error) {
      addError(getApiErrorMessage( error, 'Не удалось сохранить результаты упражнения'));
    }
  }


  return {
    wordList,
    reversedWordList,
    loadWords,
    loadExercise,
    clearWords,
    taskCompleted,

  };
});
