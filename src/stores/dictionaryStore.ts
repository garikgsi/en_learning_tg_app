import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {useSettingsStore} from '@/stores/settingsStore';

export type DictionaryWord = {
  id: number
  english: string
  russian: string
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
}

export type DictionarySortItem = {
  key: string
  order?: boolean | 'asc' | 'desc'
}

type DictionaryPage = {
  items: DictionaryWord[]
  total: number
}

type DictionarySourceWord = Omit<
  DictionaryWord,
  'successfulRepeatCount' | 'failedRepeatCount'
>

const dictionarySource: DictionaryWord[] = ([
  {id: 1, english: 'bird', russian: 'птица', repeatCount: 4},
  {id: 2, english: 'cat', russian: 'кошка', repeatCount: 8},
  {id: 3, english: 'school', russian: 'школа', repeatCount: 3},
  {id: 4, english: 'home', russian: 'дом', repeatCount: 6},
  {id: 5, english: 'today', russian: 'сегодня', repeatCount: 2},
  {id: 6, english: 'tomorrow', russian: 'завтра', repeatCount: 5},
  {id: 7, english: 'book', russian: 'книга', repeatCount: 7},
  {id: 8, english: 'city', russian: 'город', repeatCount: 1},
  {id: 9, english: 'family', russian: 'семья', repeatCount: 9},
  {id: 10, english: 'friend', russian: 'друг', repeatCount: 4},
  {id: 11, english: 'garden', russian: 'сад', repeatCount: 2},
  {id: 12, english: 'house', russian: 'дом', repeatCount: 10},
  {id: 13, english: 'language', russian: 'язык', repeatCount: 6},
  {id: 14, english: 'morning', russian: 'утро', repeatCount: 3},
  {id: 15, english: 'night', russian: 'ночь', repeatCount: 5},
  {id: 16, english: 'question', russian: 'вопрос', repeatCount: 7},
  {id: 17, english: 'river', russian: 'река', repeatCount: 2},
  {id: 18, english: 'street', russian: 'улица', repeatCount: 4},
  {id: 19, english: 'teacher', russian: 'учитель', repeatCount: 8},
  {id: 20, english: 'window', russian: 'окно', repeatCount: 1},
  {id: 21, english: 'answer', russian: 'ответ', repeatCount: 5},
  {id: 22, english: 'car', russian: 'машина', repeatCount: 3},
  {id: 23, english: 'door', russian: 'дверь', repeatCount: 6},
  {id: 24, english: 'evening', russian: 'вечер', repeatCount: 2},
  {id: 25, english: 'flower', russian: 'цветок', repeatCount: 4},
  {id: 26, english: 'game', russian: 'игра', repeatCount: 7},
  {id: 27, english: 'lesson', russian: 'урок', repeatCount: 9},
  {id: 28, english: 'music', russian: 'музыка', repeatCount: 3},
  {id: 29, english: 'table', russian: 'стол', repeatCount: 5},
  {id: 30, english: 'water', russian: 'вода', repeatCount: 8},
  {id: 31, english: 'full name', russian: 'полное имя', repeatCount: 0},
  {id: 32, english: 'home address', russian: 'домашний адрес', repeatCount: 0},
  {id: 33, english: 'identity card', russian: 'удостоверение личности', repeatCount: 0},
  {id: 34, english: 'identification number', russian: 'идентификационный номер', repeatCount: 0},
  {id: 35, english: 'join a club', russian: 'вступать в клуб', repeatCount: 0},
  {id: 36, english: 'membership card', russian: 'членский билет (карта)', repeatCount: 0},
  {id: 37, english: 'telephone number', russian: 'телефонный номер', repeatCount: 0},
  {id: 38, english: 'register at the library', russian: 'записываться в библиотеку', repeatCount: 0},
  {id: 39, english: 'age', russian: 'возраст', repeatCount: 0},
  {id: 40, english: 'aunt', russian: 'тетя', repeatCount: 0},
  {id: 41, english: 'big', russian: 'большой', repeatCount: 0},
  {id: 42, english: 'brother', russian: 'брат', repeatCount: 0},
  {id: 43, english: 'child', russian: 'ребенок', repeatCount: 0},
  {id: 44, english: 'children', russian: 'дети', repeatCount: 0},
  {id: 45, english: 'cousin', russian: 'двоюродный брат/двоюродная сестра', repeatCount: 0},
  {id: 46, english: 'curly', russian: 'кудрявый', repeatCount: 0},
  {id: 47, english: 'daughter', russian: 'дочь', repeatCount: 0},
  {id: 48, english: 'dad', russian: 'папа', repeatCount: 0},
  {id: 49, english: 'fair', russian: 'светлый', repeatCount: 0},
  {id: 50, english: 'fat', russian: 'толстый', repeatCount: 0},
  {id: 51, english: 'grey', russian: 'седой', repeatCount: 0},
  {id: 52, english: 'hair', russian: 'волосы', repeatCount: 0},
  {id: 53, english: 'height', russian: 'рост', repeatCount: 0},
  {id: 54, english: 'husband', russian: 'муж', repeatCount: 0},
  {id: 55, english: 'long', russian: 'длинный', repeatCount: 0},
  {id: 56, english: 'middle age', russian: 'среднего возраста', repeatCount: 0},
  {id: 57, english: 'mum', russian: 'мама', repeatCount: 0},
  {id: 58, english: 'old', russian: 'старый', repeatCount: 0},
  {id: 59, english: 'parents', russian: 'родители', repeatCount: 0},
  {id: 60, english: 'short', russian: 'короткий', repeatCount: 0},
  {id: 61, english: 'sister', russian: 'сестра', repeatCount: 0},
  {id: 62, english: 'slim', russian: 'стройный', repeatCount: 0},
  {id: 63, english: 'son', russian: 'сын', repeatCount: 0},
  {id: 64, english: 'twins', russian: 'близнецы', repeatCount: 0},
  {id: 65, english: 'uncle', russian: 'дядя', repeatCount: 0},
  {id: 66, english: 'wavy', russian: 'волнистые (о волосах)', repeatCount: 0},
  {id: 67, english: 'weight', russian: 'вес', repeatCount: 0},
  {id: 68, english: 'wife', russian: 'жена', repeatCount: 0},
  {id: 69, english: 'young', russian: 'молодой', repeatCount: 0},
  {id: 70, english: "be in one's early sixties", russian: 'быть немногим старше шестидесяти', repeatCount: 0},
  {id: 71, english: 'be in late thirties', russian: 'быть немногим младше сорока', repeatCount: 0},
  {id: 72, english: 'be in mid twenties', russian: 'быть в возрасте 25 лет', repeatCount: 0},
  {id: 73, english: 'be married to smb', russian: 'быть женатым, замужем', repeatCount: 0},
  {id: 74, english: 'facial features', russian: 'черты лица', repeatCount: 0},
] satisfies DictionarySourceWord[]).map(word => {
  const failedRepeatCount = Math.min(word.repeatCount, word.id % 4);

  return {
    ...word,
    successfulRepeatCount: word.repeatCount - failedRepeatCount,
    failedRepeatCount,
  };
});

const collator = new Intl.Collator(['ru', 'en'], {
  sensitivity: 'base',
});

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase();

const isWordEligibleForRepetition = (word: DictionaryWord): boolean => {
  return !/\s/.test(word.english.trim())
    && !/\s/.test(word.russian.trim());
}

export const useDictionaryStore = defineStore('dictionary', () => {
  const settingsStore = useSettingsStore();

  const items = ref<DictionaryWord[]>([]);
  const repetitionWordIds = ref<number[]>([]);
  const leastRepeatedWords = computed<DictionaryWord[]>(() => {
    const eligibleWords = dictionarySource.filter(isWordEligibleForRepetition);
    const minimumRepeatCount = Math.min(
      ...eligibleWords.map(word => word.repeatCount),
    );

    return eligibleWords.filter(
      word => word.repeatCount === minimumRepeatCount,
    );
  });
  const wordsForRepetition = computed<DictionaryWord[]>(() => {
    return dictionarySource.filter(word => {
      return (
        isWordEligibleForRepetition(word)
        && word.repeatCount === leastRepeatedWords.value[0]?.repeatCount
      ) || repetitionWordIds.value.includes(word.id);
    });
  });
  const totalItems = ref(0);
  const isLoading = ref(false);
  const search = ref('');
  const sortBy = ref<DictionarySortItem[]>([
    {
      key: 'russian',
      order: 'asc',
    },
  ]);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  const fetchDictionaryPage = async (): Promise<DictionaryPage> => {
    // Temporary async boundary. Replace this block with an API request later.
    await new Promise(resolve => setTimeout(resolve, 250));

    const query = normalizeSearch(search.value);
    const filteredItems = dictionarySource.filter(item => {
      if (!query) {
        return true;
      }

      return normalizeSearch(item.english).includes(query)
        || normalizeSearch(item.russian).includes(query);
    });

    const activeSort = sortBy.value[0];

    if (activeSort) {
      const direction = activeSort.order === 'desc' || activeSort.order === false ? -1 : 1;

      filteredItems.sort((first, second) => {
        if (activeSort.key === 'repeatCount') {
          return (first.repeatCount - second.repeatCount) * direction;
        }

        if (activeSort.key === 'english' || activeSort.key === 'russian') {
          return collator.compare(first[activeSort.key], second[activeSort.key]) * direction;
        }

        return 0;
      });
    }

    const wordsLimit = settingsStore.dictionaryWordsPerPage;
    const pageItems = wordsLimit > 0
      ? filteredItems.slice(0, wordsLimit)
      : filteredItems;

    return {
      items: pageItems,
      total: filteredItems.length,
    };
  }

  const loadDictionary = async (): Promise<void> => {
    const currentRequestId = ++requestId;
    isLoading.value = true;

    try {
      const result = await fetchDictionaryPage();

      if (currentRequestId === requestId) {
        items.value = result.items;
        totalItems.value = result.total;
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
      void loadDictionary();
    }, 1000);
  }

  const sortDictionary = (value: DictionarySortItem[]): void => {
    sortBy.value = value;
    void loadDictionary();
  }

  const addWordToRepetition = async (wordId: number): Promise<void> => {
    // TODO: Replace this local stub with an API request.
    await Promise.resolve();

    const wordExists = dictionarySource.some(word => word.id === wordId);

    if (wordExists && !repetitionWordIds.value.includes(wordId)) {
      repetitionWordIds.value.push(wordId);
    }
  }

  const isWordSelectedForRepetition = (wordId: number): boolean => {
    return repetitionWordIds.value.includes(wordId);
  }

  return {
    items,
    leastRepeatedWords,
    wordsForRepetition,
    repetitionWordIds,
    totalItems,
    isLoading,
    search,
    sortBy,
    loadDictionary,
    searchDictionary,
    sortDictionary,
    addWordToRepetition,
    isWordSelectedForRepetition,
  };
});
