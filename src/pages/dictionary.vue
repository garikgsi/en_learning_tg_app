<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import {storeToRefs} from 'pinia';
import {useDictionaryStore} from '@/stores/dictionaryStore';
import {useSettingsStore} from '@/stores/settingsStore';
import type {DictionaryWord} from '@/types/dictionary';
import type {
  ApiDictionaryWord,
  DictionaryStorePayload,
} from '@/api/types/dictionary';

const dictionaryStore = useDictionaryStore();
const settingsStore = useSettingsStore();
const {
  items,
  totalItems,
  isLoading,
  hasMore,
  search,
} = storeToRefs(dictionaryStore);
const {dictionaryWordsPerPage} = storeToRefs(settingsStore);
const isInitialLoading = ref(items.value.length === 0);
const isLoadingNextPage = ref(false);
const isAddDialogOpen = ref(false);
const isLookingUpWord = ref(false);
const isSavingWord = ref(false);
const sourceLanguage = ref<'ru' | 'en'>('ru');
const lookupWord = ref('');
const reviewedWord = ref<DictionaryStorePayload | null>(null);
const existingWords = ref<ApiDictionaryWord[]>([]);

watch(dictionaryWordsPerPage, () => {
  dictionaryStore.reloadFromFirstPage();
});

const lazyLoadThreshold = 300;
let scrollFrame: number | null = null;

const loadNextPageIfNeeded = async (): Promise<void> => {
  if (
    !hasMore.value
    || isLoading.value
    || isLoadingNextPage.value
  ) {
    return;
  }

  const scrollingElement = document.scrollingElement
    ?? document.documentElement;
  const distanceToBottom = scrollingElement.scrollHeight
    - scrollingElement.scrollTop
    - window.innerHeight;

  if (distanceToBottom <= lazyLoadThreshold) {
    isLoadingNextPage.value = true;

    try {
      await dictionaryStore.loadNextPage();
    } finally {
      isLoadingNextPage.value = false;
    }
  }
}

const handleScroll = () => {
  if (scrollFrame !== null) {
    return;
  }

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    void loadNextPageIfNeeded();
  });
}

watch(
  () => items.value.length,
  async () => {
    await nextTick();
    await loadNextPageIfNeeded();
  },
);

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, {passive: true});

  try {
    await dictionaryStore.loadDictionary();
  } finally {
    isInitialLoading.value = false;
  }

  await nextTick();
  await loadNextPageIfNeeded();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);

  if (scrollFrame !== null) {
    window.cancelAnimationFrame(scrollFrame);
  }
});

const headers = [
  {
    title: 'Русское слово',
    key: 'russian',
  },
  {
    title: 'Английское слово',
    key: 'english',
  },
  {
    title: 'Повторения',
    key: 'repeatCount',
    align: 'end',
    width: 260,
  },
] as const;

const getRepeatBadgeColor = (word: DictionaryWord) => {
  return word.successfulRepeatCount > word.failedRepeatCount
    ? 'success'
    : 'error';
}

const getRepeatBadgeTitle = (word: DictionaryWord) => {
  return `Успешно: ${word.successfulRepeatCount}, безуспешно: ${word.failedRepeatCount}`;
}

const getRepetitionButtonTitle = (word: DictionaryWord) => {
  if (dictionaryStore.isWordSelectedForRepetition(word.id)) {
    return 'Добавлено в список на повторение';
  }

  return 'Добавить в список на повторение';
}

const getAudioButtonTitle = (word: DictionaryWord): string => {
  return `Прослушать произношение слова ${word.english}`;
}

const resetAddWord = (): void => {
  sourceLanguage.value = 'ru';
  lookupWord.value = '';
  reviewedWord.value = null;
  existingWords.value = [];
}

const closeAddDialog = (): void => {
  isAddDialogOpen.value = false;
}

const findWordTranslation = async (): Promise<void> => {
  const word = lookupWord.value.trim();

  if (!word || isLookingUpWord.value) {
    return;
  }

  isLookingUpWord.value = true;

  try {
    const result = await dictionaryStore.lookupWord(
      word,
      sourceLanguage.value,
    );
    reviewedWord.value = {
      russian: result.russian,
      english: result.english,
      transcription: result.transcription,
    };
    existingWords.value = result.existingWords;
  } catch {
    // The store displays the API error.
  } finally {
    isLookingUpWord.value = false;
  }
}

const saveReviewedWord = async (): Promise<void> => {
  const word = reviewedWord.value;

  if (
    !word
    || !word.russian.trim()
    || !word.english.trim()
    || isSavingWord.value
  ) {
    return;
  }

  isSavingWord.value = true;

  try {
    await dictionaryStore.storeWord({
      russian: word.russian.trim(),
      english: word.english.trim(),
      transcription: word.transcription?.trim() || null,
    });
    closeAddDialog();
  } catch {
    // The store displays the API error.
  } finally {
    isSavingWord.value = false;
  }
}
</script>

<template>
  <v-card>
    <v-card-text class="dictionary-toolbar pb-2">

      <v-text-field
        class="dictionary-toolbar__search"
        v-if="isLoading || totalItems > 0 || search"
        :model-value="search"
        clearable
        density="compact"
        :disabled="isLoading"
        hide-details
        label="Поиск по словарю"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @update:model-value="dictionaryStore.searchDictionary"
      ></v-text-field>

      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="isAddDialogOpen = true"
      >
        <span class="d-none d-sm-inline">Добавить слово</span>
      </v-btn>
    </v-card-text>

    <v-skeleton-loader
      v-if="isInitialLoading"
      type="table"
    ></v-skeleton-loader>

    <div
      v-else-if="totalItems === 0 && !search"
      class="dictionary-empty"
    >
      <v-icon
        color="medium-emphasis"
        icon="mdi-book-open-page-variant-outline"
        size="48"
      ></v-icon>
      <div class="text-h6">Слова ещё не загружены</div>
      <div class="text-body-2 text-medium-emphasis">
        В словаре пока нет доступных слов.
      </div>
    </div>

    <v-data-table-server
      v-else
      :headers="headers"
      :items="items"
      :items-per-page="dictionaryWordsPerPage"
      :items-length="totalItems"
      hide-default-header
      hide-default-footer
      item-value="id"
      no-data-text="Слова не найдены"
    >
      <template #item.english="{item}">
        <div class="dictionary-audio-cell">
          <v-btn
            :aria-label="getAudioButtonTitle(item)"
            icon="mdi-play-circle-outline"
            :loading="dictionaryStore.audioLoadingWordId === item.id"
            size="small"
            :title="getAudioButtonTitle(item)"
            variant="text"
            @click="dictionaryStore.playWordAudio(item.id)"
          />
          <div class="dictionary-translation" lang="en">
            <div>{{ item.english }}</div>
            <div
              v-if="item.transcription"
              class="dictionary-translation__transcription"
            >
              {{ item.transcription }}
            </div>
          </div>
        </div>
      </template>

      <template #item.repeatCount="{item}">
        <div class="repeat-actions">
          <v-chip
            :color="getRepeatBadgeColor(item)"
            :title="getRepeatBadgeTitle(item)"
            size="small"
            variant="tonal"
          >
            {{ item.repeatCount }}
          </v-chip>

          <v-btn
            class="repeat-button d-none d-sm-inline-flex"
            :class="{'repeat-button--selected': dictionaryStore.isWordSelectedForRepetition(item.id)}"
            :color="dictionaryStore.isWordSelectedForRepetition(item.id) ? 'success' : 'primary'"
            :disabled="dictionaryStore.isWordSelectedForRepetition(item.id)"
            prepend-icon="mdi-bell-plus-outline"
            size="small"
            :title="getRepetitionButtonTitle(item)"
            @click="dictionaryStore.addWordToRepetition(item.id)"
          >
            Повторить
          </v-btn>

          <v-btn
            :aria-label="getRepetitionButtonTitle(item)"
            class="repeat-button d-sm-none"
            :class="{'repeat-button--selected': dictionaryStore.isWordSelectedForRepetition(item.id)}"
            :color="dictionaryStore.isWordSelectedForRepetition(item.id) ? 'success' : 'primary'"
            :disabled="dictionaryStore.isWordSelectedForRepetition(item.id)"
            icon="mdi-bell-plus-outline"
            size="small"
            :title="getRepetitionButtonTitle(item)"
            @click="dictionaryStore.addWordToRepetition(item.id)"
          ></v-btn>
        </div>
      </template>
    </v-data-table-server>

    <v-progress-linear
      v-if="isLoadingNextPage"
      color="primary"
      indeterminate
    ></v-progress-linear>

    <div
      v-if="hasMore"
      class="lazy-load-sentinel"
    ></div>
  </v-card>

  <v-dialog
    v-model="isAddDialogOpen"
    max-width="560"
    persistent
    @after-leave="resetAddWord"
  >
    <v-card>
      <v-card-title>Добавление слова</v-card-title>
      <v-divider />

      <v-card-text class="dictionary-add-dialog">
        <template v-if="!reviewedWord">
          <v-btn-toggle
            v-model="sourceLanguage"
            color="primary"
            density="compact"
            mandatory
            variant="outlined"
          >
            <v-btn value="ru">Русское</v-btn>
            <v-btn value="en">English</v-btn>
          </v-btn-toggle>

          <v-text-field
            v-model="lookupWord"
            autofocus
            :label="sourceLanguage === 'ru'
              ? 'Русское слово'
              : 'English word'"
            maxlength="255"
            variant="outlined"
            @keydown.enter="findWordTranslation"
          />
        </template>

        <template v-else>
          <v-text-field
            v-model="reviewedWord.russian"
            label="Русское слово"
            maxlength="255"
            variant="outlined"
          />
          <v-text-field
            v-model="reviewedWord.english"
            label="Английский перевод"
            lang="en"
            maxlength="255"
            variant="outlined"
          />
          <v-text-field
            v-model="reviewedWord.transcription"
            clearable
            label="Транскрипция"
            lang="en"
            maxlength="255"
            variant="outlined"
          />

          <v-alert
            v-if="existingWords.length"
            density="compact"
            type="warning"
            variant="tonal"
          >
            <div class="mb-1">В словаре уже есть похожие записи:</div>
            <div
              v-for="word in existingWords"
              :key="word.id"
            >
              {{ word.ru }} — {{ word.en }}
            </div>
          </v-alert>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <v-btn
          v-if="reviewedWord"
          :disabled="isSavingWord"
          @click="reviewedWord = null"
        >
          Назад
        </v-btn>
        <v-spacer />
        <v-btn
          color="secondary"
          :disabled="isLookingUpWord || isSavingWord"
          @click="closeAddDialog"
        >
          Отмена
        </v-btn>
        <v-btn
          v-if="!reviewedWord"
          color="primary"
          :disabled="!lookupWord.trim()"
          :loading="isLookingUpWord"
          @click="findWordTranslation"
        >
          Найти
        </v-btn>
        <v-btn
          v-else
          color="primary"
          :disabled="
            !reviewedWord.russian.trim()
              || !reviewedWord.english.trim()
          "
          :loading="isSavingWord"
          @click="saveReviewedWord"
        >
          Добавить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.repeat-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.dictionary-toolbar {
  align-items: center;
  display: flex;
  gap: 12px;
}

.dictionary-toolbar__search {
  flex: 1 1 auto;
  min-width: 0;
}

.dictionary-translation__transcription {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.75rem;
  line-height: 1.25;
}

.dictionary-audio-cell {
  align-items: center;
  display: flex;
  gap: 4px;
}

.dictionary-add-dialog {
  display: grid;
  gap: 12px;
  padding-top: 24px;
}

.repeat-button--selected.v-btn--disabled {
  opacity: 1;
}

.lazy-load-sentinel {
  height: 1px;
}

.dictionary-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px 16px;
  text-align: center;
}
</style>
