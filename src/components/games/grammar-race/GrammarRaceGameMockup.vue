<script setup lang="ts">
import {computed, ref} from 'vue';
import GrammarRaceLobbyScreen from './GrammarRaceLobbyScreen.vue';
import GrammarRaceRoundScreen from './GrammarRaceRoundScreen.vue';
import GrammarRaceResultScreen from './GrammarRaceResultScreen.vue';
import type {GrammarRaceDefinition} from './types';

type Props = {
  game: GrammarRaceDefinition
}

type PreviewScreen = 'lobby' | 'round' | 'result' | 'loss'

const props = defineProps<Props>();
const activeScreen = ref<PreviewScreen>('lobby');
const previewTask = computed(() => props.game.tasks[0]);

const screens = [
  {value: 'lobby', label: 'Лобби', icon: 'mdi-home-outline'},
  {value: 'round', label: 'Раунд', icon: 'mdi-lightning-bolt-outline'},
  {value: 'result', label: 'Победа', icon: 'mdi-trophy-outline'},
  {value: 'loss', label: 'Поражение', icon: 'mdi-emoticon-sad-outline'},
] as const;
</script>

<template>
  <div class="grammar-race-preview mx-auto">
    <div class="d-flex flex-column align-center mb-4">
      <div class="text-caption text-medium-emphasis mb-2">
        {{ game.groupTitle }} · статичный прототип
      </div>
      <v-btn-toggle
        v-model="activeScreen"
        color="primary"
        density="comfortable"
        divided
        mandatory
        rounded="xl"
        variant="outlined"
      >
        <v-btn
          v-for="screen in screens"
          :key="screen.value"
          :aria-label="`Показать экран: ${screen.label}`"
          :icon="screen.icon"
          :value="screen.value"
        ></v-btn>
      </v-btn-toggle>
    </div>

    <v-window
      v-model="activeScreen"
      :touch="false"
    >
      <v-window-item value="lobby">
        <GrammarRaceLobbyScreen :game="game"></GrammarRaceLobbyScreen>
      </v-window-item>
      <v-window-item value="round">
        <GrammarRaceRoundScreen
          v-if="previewTask"
          :computer-score="2"
          :game="game"
          :player-score="3"
          :round-number="6"
          :selected-answer="previewTask.correctAnswer"
          :task="previewTask"
        ></GrammarRaceRoundScreen>
      </v-window-item>
      <v-window-item value="result">
        <GrammarRaceResultScreen
          :computer-score="3"
          :game="game"
          :player-score="game.rules.targetScore"
          result="win"
        ></GrammarRaceResultScreen>
      </v-window-item>
      <v-window-item value="loss">
        <GrammarRaceResultScreen
          :computer-score="game.rules.targetScore"
          :game="game"
          :player-score="3"
          result="loss"
        ></GrammarRaceResultScreen>
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
.grammar-race-preview {
  max-width: 440px;
}
</style>
