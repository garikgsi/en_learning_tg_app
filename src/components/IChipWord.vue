<script setup lang="ts">
  import { ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import type { TranslationLanguage } from '@/types/translation';

  type Props = {
    word: string
    translation: string
    language: TranslationLanguage
    color: string
  }

  defineProps<Props>();

  const { smAndUp } = useDisplay();
  const isTooltipOpen = ref(false);

  const closeTooltip = (): void => {
    isTooltipOpen.value = false;
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
          :aria-label="`${word}: ${translation}`"
          :color="color"
          :lang="language"
          size="small"
        >
          {{ word }}
        </v-chip>
      </span>
    </template>

    <span>{{ translation }}</span>
  </v-tooltip>
</template>

<style scoped>
.i-chip-word__activator {
  display: inline-flex;
}
</style>
