<script setup lang="ts">
  import { ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import type { TranslationLanguage } from '@/types/translation';

  type Props = {
    word: string
    translation: string
    transcription?: string | null
    wordId?: number | null
    plural?: {
      id: number
      word: string
      translation: string
    } | null
    language: TranslationLanguage
    color: string
    closable?: boolean
    audioLoading?: boolean
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{
    play: [wordId: number, pluralId?: number]
    close: []
  }>();

  const { smAndUp } = useDisplay();
  const isTooltipOpen = ref(false);

  const closeTooltip = (): void => {
    isTooltipOpen.value = false;
  }

  const play = (): void => {
    if (props.wordId) {
      if (props.plural) {
        emit('play', props.wordId, props.plural.id);
        return;
      }

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
          :aria-label="plural
            ? `${translation} — ${plural.translation}; ${word} — ${plural.word}`
            : [word, transcription, translation].filter(Boolean).join(': ')"
          :color="color"
          :lang="language"
          :closable="closable"
          close-label="Удалить слово"
          size="small"
          @click="play"
          @click:close="emit('close')"
        >
          {{ word }}
        </v-chip>
      </span>
    </template>

    <div class="i-chip-word__tooltip">
      <v-progress-circular
        v-if="wordId && audioLoading"
        aria-label="Загрузка произношения"
        color="secondary"
        indeterminate
        :size="26"
        :width="2"
      >
        <v-icon color="secondary" icon="mdi-volume-high" :size="15" />
      </v-progress-circular>
      <v-icon
        v-else-if="wordId"
        aria-label="Произношение готово"
        color="primary"
        icon="mdi-volume-high"
        :size="22"
      />

      <div>
        <template v-if="plural">
          <div>{{ translation }} — {{ plural.translation }}</div>
          <div>{{ word }} — {{ plural.word }}</div>
        </template>
        <template v-else>
          <div v-if="transcription" class="i-chip-word__transcription">
            {{ transcription }}
          </div>
          <div>{{ translation }}</div>
        </template>
      </div>
    </div>
  </v-tooltip>
</template>

<style scoped>
.i-chip-word__activator {
  display: inline-flex;
}

.i-chip-word__tooltip {
  align-items: center;
  display: flex;
  gap: 8px;
  min-height: 26px;
}

.i-chip-word__transcription {
  font-weight: 500;
  margin-bottom: 2px;
}
</style>
