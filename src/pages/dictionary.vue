<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  watch,
} from 'vue';
import {storeToRefs} from 'pinia';
import {
  type DictionaryWord,
  useDictionaryStore,
} from '@/stores/dictionaryStore';
import {useSettingsStore} from '@/stores/settingsStore';

const dictionaryStore = useDictionaryStore();
const settingsStore = useSettingsStore();
const {
  items,
  totalItems,
  isLoading,
  errorMessage,
  hasMore,
  search,
} = storeToRefs(dictionaryStore);
const {dictionaryWordsPerPage} = storeToRefs(settingsStore);

watch(dictionaryWordsPerPage, () => {
  dictionaryStore.reloadFromFirstPage();
});

const lazyLoadThreshold = 300;
let scrollFrame: number | null = null;

const loadNextPageIfNeeded = () => {
  if (!hasMore.value || isLoading.value) {
    return;
  }

  const scrollingElement = document.scrollingElement
    ?? document.documentElement;
  const distanceToBottom = scrollingElement.scrollHeight
    - scrollingElement.scrollTop
    - window.innerHeight;

  if (distanceToBottom <= lazyLoadThreshold) {
    dictionaryStore.loadNextPage();
  }
}

const handleScroll = () => {
  if (scrollFrame !== null) {
    return;
  }

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    loadNextPageIfNeeded();
  });
}

watch(
  () => items.value.length,
  async () => {
    await nextTick();
    loadNextPageIfNeeded();
  },
);

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, {passive: true});
  await dictionaryStore.loadDictionary();
  await nextTick();
  loadNextPageIfNeeded();
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
</script>

<template>
  <v-card>
    <v-card-text class="pb-2">

      <v-text-field
        v-if="isLoading || totalItems > 0 || search"
        :model-value="search"
        clearable
        density="compact"
        hide-details
        label="Поиск по словарю"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @update:model-value="dictionaryStore.searchDictionary"
      ></v-text-field>
    </v-card-text>

    <div
      v-if="!isLoading && !errorMessage && totalItems === 0 && !search"
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
      :loading="isLoading"
      hide-default-header
      hide-default-footer
      item-value="id"
      loading-text="Загружаем словарь..."
      no-data-text="Слова не найдены"
    >
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

    <div
      v-if="hasMore"
      class="lazy-load-sentinel"
    ></div>
  </v-card>
</template>

<style scoped>
.repeat-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
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
