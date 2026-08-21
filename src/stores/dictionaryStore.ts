import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {getApiErrorMessage} from '@/api/errors';
import {useSettingsStore} from '@/stores/settingsStore';
import {useUserStore} from '@/stores/userStore';
import useMessages from '@/use/messages';
import {useDictionaryRepository} from '@/use/dictionaryRepository';
import type {ApiDictionaryWord} from '@/api/types/dictionary';
import type {
  DictionaryLookupResponse,
  DictionaryStorePayload,
  DictionaryStoreResponse,
} from '@/api/types/dictionary';
import type {DictionaryWord} from '@/types/dictionary';
import {messageKeys} from '@/use/messageKeys';

const {addError, addWarning, readMessageByKey} = useMessages();

const isWordEligibleForRepetition = (word: DictionaryWord): boolean => {
  return !/\s/.test(word.english.trim())
    && !/\s/.test(word.russian.trim());
}

const toDictionaryWord = (word: ApiDictionaryWord): DictionaryWord => ({
  id: word.id,
  english: word.en,
  russian: word.ru,
  transcription: word.transcription,
  grade: word.grade,
  repeatCount: word.repeatCount,
  successfulRepeatCount: word.successfulRepeatCount,
  failedRepeatCount: word.failedRepeatCount,
  isSelectedForRepetition: word.is_active,
});

export const useDictionaryStore = defineStore('dictionary', () => {
  const settingsStore = useSettingsStore();
  const userStore = useUserStore();
  const dictionaryRepository = useDictionaryRepository();

  const items = ref<DictionaryWord[]>([]);
  const knownWords = ref<Record<number, DictionaryWord>>({});
  const repetitionWordIds = ref<number[]>([]);
  const totalItems = ref(0);
  const page = ref(1);
  const lastPage = ref(1);
  const hasMore = computed(() => page.value < lastPage.value);
  const availableGrade = ref(0);
  const isDataFetching = ref(false);
  const audioLoadingWordId = ref<number | null>(null);
  const search = ref('');

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;
  let activeAudio: HTMLAudioElement | null = null;

  const releaseActiveAudio = (): void => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
      activeAudio = null;
    }
  }

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

    isDataFetching.value = true;


    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const result = await dictionaryRepository.getPage(
        userId,
        search.value.trim() || undefined,
        targetPage,
        settingsStore.dictionaryWordsPerPage,
      );

      if (currentRequestId !== requestId) {
        return;
      }

      const data = result.data;
      const loadedItems = data.items.map(toDictionaryWord);

      items.value = append
        ? [...items.value, ...loadedItems]
        : loadedItems;
      totalItems.value = data.total;
      page.value = data.page;
      lastPage.value = data.lastPage;
      availableGrade.value = data.availableGrade;

      const selectedWordIds = new Set(repetitionWordIds.value);

      for (const word of loadedItems) {
        knownWords.value[word.id] = word;

        if (word.isSelectedForRepetition) {
          selectedWordIds.add(word.id);
        } else {
          selectedWordIds.delete(word.id);
        }
      }

      repetitionWordIds.value = [...selectedWordIds];

      if (result.source === 'indexedDb') {
        const warning = result.fallbackReason === 'server'
          ? 'Ошибка сервера. Показан словарь, сохранённый на устройстве.'
          : 'Нет подключения к интернету. Показан словарь, сохранённый на устройстве.';

        addWarning(warning, 0, {
          key: messageKeys.cachedDictionary,
          action: {
            title: 'Обновить',
            handler: async () => {
              await dictionaryRepository.synchronize(userId, true);
              await loadDictionary(1);
            },
          },
        });
      } else {
        readMessageByKey(messageKeys.cachedDictionary);
        readMessageByKey(messageKeys.dictionaryLoadError);
      }
    } catch (error) {
      if (currentRequestId === requestId) {
        addError(
          getApiErrorMessage(error, 'Не удалось загрузить словарь'),
          0,
          {
            key: messageKeys.dictionaryLoadError,
            action: {
              title: 'Обновить',
              handler: async () => {
                await loadDictionary(1);
              },
            },
          },
        );
      }
    } finally {
      if (currentRequestId === requestId) {
        isDataFetching.value = false;
      }
    }
  }

  const searchDictionary = (value: string | null): void => {
    search.value = value ?? '';

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadDictionary(1);
    }, 1000);
  }

  const loadNextPage = async (): Promise<void> => {
    if (isDataFetching.value || !hasMore.value) {
      return;
    }

    await loadDictionary(page.value + 1, true);
  }

  const reloadFromFirstPage = (): void => {
    void loadDictionary(1);
  }

  const addWordToRepetition = async (wordId: number): Promise<void> => {

    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      await dictionaryRepository.addWord(userId, wordId);

      const word = knownWords.value[wordId];

      if (word) {
        word.isSelectedForRepetition = true;
      }

      if (!repetitionWordIds.value.includes(wordId)) {
        repetitionWordIds.value.push(wordId);
      }
    } catch (error) {
      addError(getApiErrorMessage( error, 'Не удалось добавить слово для повторения'));
    }
  }

  const isWordSelectedForRepetition = (wordId: number): boolean => {
    return repetitionWordIds.value.includes(wordId);
  }

  const lookupWord = async (
    word: string,
    sourceLanguage: 'ru' | 'en',
  ): Promise<DictionaryLookupResponse> => {
    try {
      return await dictionaryRepository.lookupWord(word, sourceLanguage);
    } catch (error) {
      addError(getApiErrorMessage(
        error,
        'Не удалось получить перевод слова',
      ));
      throw error;
    }
  }

  const storeWord = async (
    word: DictionaryStorePayload,
  ): Promise<DictionaryStoreResponse> => {
    try {
      const userId = userStore.user?.id;

      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await dictionaryRepository.storeWord(userId, word);
      await loadDictionary(1);

      return response;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось добавить слово'));
      throw error;
    }
  }

  const playWordAudio = async (wordId: number): Promise<void> => {
    if (audioLoadingWordId.value !== null) {
      return;
    }

    audioLoadingWordId.value = wordId;

    try {
      releaseActiveAudio();
      activeAudio = new Audio(dictionaryRepository.getWordAudioUrl(wordId));
      activeAudio.preload = 'auto';
      activeAudio.addEventListener('ended', releaseActiveAudio, {once: true});
      await activeAudio.play();
    } catch (error) {
      releaseActiveAudio();
      addError(getApiErrorMessage(
        error,
        'Не удалось воспроизвести произношение',
      ));
    } finally {
      audioLoadingWordId.value = null;
    }
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
    isLoading: isDataFetching,
    audioLoadingWordId,
    search,
    loadDictionary,
    searchDictionary,
    loadNextPage,
    reloadFromFirstPage,
    addWordToRepetition,
    isWordSelectedForRepetition,
    lookupWord,
    storeWord,
    playWordAudio,

  };
});
