<script setup lang="ts">
import {computed} from 'vue';
import IChipWord from '@/components/IChipWord.vue';

type ChipWord = {
  id: number | null
  en: string
  ru: string
  color: string
}

type Props = {
  words: ChipWord[]
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20,
});
const emit = defineEmits<{
  play: [wordId: number]
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
</script>

<template>
  <div class="i-chip-word-list">
    <IChipWord
      v-for="(word, index) in visibleWords"
      :key="`${word.id ?? 'unknown'}:${index}:${word.en}`"
      :color="word.color"
      language="en"
      :translation="word.ru"
      :word="word.en"
      :word-id="word.id"
      @play="emit('play', $event)"
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
