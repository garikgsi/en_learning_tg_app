import {ref} from 'vue';
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

export type DictionaryTableOptions = {
  sortBy: DictionarySortItem[]
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

export const useDictionaryStore = defineStore('dictionary', () => {
  const settingsStore = useSettingsStore();

  const items = ref<DictionaryWord[]>([]);
  const totalItems = ref(0);
  const isLoading = ref(false);
  const search = ref('');
  const sortBy = ref<DictionarySortItem[]>([]);

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

  const loadDictionary = async (options?: DictionaryTableOptions): Promise<void> => {
    if (options) {
      sortBy.value = options.sortBy;
    }

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
    }, 300);
  }

  return {
    items,
    totalItems,
    isLoading,
    search,
    sortBy,
    loadDictionary,
    searchDictionary,
  };
});
