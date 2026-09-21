<script setup lang="ts">
import {computed} from 'vue';
import IChipWord from '@/components/IChipWord.vue';

type ChipWord = {
  id: number | null
  en: string
  ru: string
  color: string
  plural?: {
    id: number
    en: string
    ru: string
  } | null
}

type Props = {
  words: ChipWord[]
  limit?: number
  audioLoadingWordId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20,
});
const emit = defineEmits<{
  play: [wordId: number, pluralId?: number]
}>();

const normalizedLimit = computed(() => {
  return Number.isFinite(props.limit)
    ? Math.max(0, Math.floor(props.limit))
    : 0;
});
const visibleWords = computed(() => {
  return props.words.slice(0, normalizedLimit.value);
});
const hiddenCount = computed(() => {
  return Math.max(props.words.length - normalizedLimit.value, 0);
});

const play = (word: ChipWord, wordId: number): void => {
  if (word.plural) {
    emit('play', wordId, word.plural.id);
    return;
  }

  emit('play', wordId);
};
</script>

<template>
  <div class="i-chip-word-list">
    <IChipWord
      v-for="(word, index) in visibleWords"
      :key="`${word.id ?? 'unknown'}:${index}:${word.en}`"
      :color="word.color"
      language="en"
      :translation="word.ru"
      :plural="word.plural ? {
        id: word.plural.id,
        word: word.plural.en,
        translation: word.plural.ru,
      } : null"
      :word="word.en"
      :word-id="word.id"
      :audio-loading="audioLoadingWordId === word.id"
      @play="play(word, $event)"
    />

    <IChipWord
      v-if="hiddenCount > 0"
      color="grey"
      language="en"
      :translation="`И ещё ${hiddenCount} слов`"
      :word="`ещё +${hiddenCount}`"
    />
  </div>
</template>

<style scoped>
.i-chip-word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
