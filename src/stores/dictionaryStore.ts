import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';
import {useSettingsStore} from '@/stores/settingsStore';

export type DictionaryWord = {
  id: number
  english: string
  russian: string
  grade: number
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
}

type ApiDictionaryWord = {
  id: number
  ru: string
  en: string
  grade: number
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
}

type DictionaryPageResponse = {
  items: ApiDictionaryWord[]
  total: number
  page: number
  perPage: number
  lastPage: number
  availableGrade: number
}

const isWordEligibleForRepetition = (word: DictionaryWord): boolean => {
  return !/\s/.test(word.english.trim())
    && !/\s/.test(word.russian.trim());
}

const toDictionaryWord = (word: ApiDictionaryWord): DictionaryWord => ({
  id: word.id,
  english: word.en,
  russian: word.ru,
  grade: word.grade,
  repeatCount: word.repeatCount,
  successfulRepeatCount: word.successfulRepeatCount,
  failedRepeatCount: word.failedRepeatCount,
});

export const useDictionaryStore = defineStore('dictionary', () => {
  const settingsStore = useSettingsStore();

  const items = ref<DictionaryWord[]>([]);
  const knownWords = ref<Record<number, DictionaryWord>>({});
  const repetitionWordIds = ref<number[]>([]);
  const totalItems = ref(0);
  const page = ref(1);
  const lastPage = ref(1);
  const hasMore = computed(() => page.value < lastPage.value);
  const availableGrade = ref(0);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const search = ref('');

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  const leastRepeatedWords = computed<DictionaryWord[]>(() => {
    const eligibleWords = Object.values(knownWords.value)
      .filter(isWordEligibleForRepetition);

    if (eligibleWords.length === 0) {
      return [];
    }

    const minimumRepeatCount = Math.min(
      ...eligibleWords.map(word => word.repeatCount),
    );

    return eligibleWords.filter(
      word => word.repeatCount === minimumRepeatCount,
    );
  });

  const wordsForRepetition = computed<DictionaryWord[]>(() => {
    const minimumRepeatCount = leastRepeatedWords.value[0]?.repeatCount;

    return Object.values(knownWords.value).filter(word => {
      return (
        isWordEligibleForRepetition(word)
        && word.repeatCount === minimumRepeatCount
      ) || repetitionWordIds.value.includes(word.id);
    });
  });

  const loadDictionary = async (
    targetPage = 1,
    append = false,
  ): Promise<void> => {
    const currentRequestId = ++requestId;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const {data} = await apiClient.get<DictionaryPageResponse>(
        '/api/v1/dictionary',
        {
          params: {
            search: search.value.trim() || undefined,
            page: targetPage,
            perPage: settingsStore.dictionaryWordsPerPage,
          },
        },
      );

      if (currentRequestId !== requestId) {
        return;
      }

      const loadedItems = data.items.map(toDictionaryWord);

      items.value = append
        ? [...items.value, ...loadedItems]
        : loadedItems;
      totalItems.value = data.total;
      page.value = data.page;
      lastPage.value = data.lastPage;
      availableGrade.value = data.availableGrade;

      for (const word of loadedItems) {
        knownWords.value[word.id] = word;
      }
    } catch (error) {
      if (currentRequestId === requestId) {
        errorMessage.value = getApiErrorMessage(
          error,
          'Не удалось загрузить словарь',
        );
      }
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false;
      }
    }
  }

  const searchDictionary = (value: string | null): void => {
    search.value = value ?? '';

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadDictionary(1);
    }, 500);
  }

  const loadNextPage = (): void => {
    if (isLoading.value || !hasMore.value) {
      return;
    }

    void loadDictionary(page.value + 1, true);
  }

  const reloadFromFirstPage = (): void => {
    void loadDictionary(1);
  }

  const addWordToRepetition = async (wordId: number): Promise<void> => {
    // TODO: Replace this local selection with the repetition-list API.
    await Promise.resolve();

    if (knownWords.value[wordId] && !repetitionWordIds.value.includes(wordId)) {
      repetitionWordIds.value.push(wordId);
    }
  }

  const isWordSelectedForRepetition = (wordId: number): boolean => {
    return repetitionWordIds.value.includes(wordId);
  }

  const clearError = (): void => {
    errorMessage.value = null;
  }

  return {
    items,
    leastRepeatedWords,
    wordsForRepetition,
    repetitionWordIds,
    totalItems,
    page,
    lastPage,
    hasMore,
    availableGrade,
    isLoading,
    errorMessage,
    search,
    loadDictionary,
    searchDictionary,
    loadNextPage,
    reloadFromFirstPage,
    addWordToRepetition,
    isWordSelectedForRepetition,
    clearError,
  };
});
