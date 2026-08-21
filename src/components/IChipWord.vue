<script setup lang="ts">
  import { ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import type { TranslationLanguage } from '@/types/translation';

  type Props = {
    word: string
    translation: string
    transcription?: string | null
    wordId?: number | null
    language: TranslationLanguage
    color: string
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{
    play: [wordId: number]
  }>();

  const { smAndUp } = useDisplay();
  const isTooltipOpen = ref(false);

  const closeTooltip = (): void => {
    isTooltipOpen.value = false;
  }

  const play = (): void => {
    if (props.wordId) {
      emit('play', props.wordId);
    }
  }
</script>

<template>
  <v-tooltip
    v-model="isTooltipOpen"
    location="top"
    :open-on-click="!smAndUp"
    :open-on-focus="smAndUp"
    :open-on-hover="smAndUp"
  >
    <template #activator="{props}">
      <span
        v-click-outside="closeTooltip"
        class="i-chip-word__activator"
      >
        <v-chip
          v-bind="props"
          :aria-label="[
            word,
            transcription,
            translation,
          ].filter(Boolean).join(': ')"
          :color="color"
          :lang="language"
          size="small"
          @click="play"
        >
          {{ word }}
        </v-chip>
      </span>
    </template>

    <div v-if="transcription" class="i-chip-word__transcription">
      {{ transcription }}
    </div>
    <div>{{ translation }}</div>
  </v-tooltip>
</template>

<style scoped>
.i-chip-word__activator {
  display: inline-flex;
}

.i-chip-word__transcription {
  font-weight: 500;
  margin-bottom: 2px;
}
</style>
