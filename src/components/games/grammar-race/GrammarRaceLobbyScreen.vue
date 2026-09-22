<script setup lang="ts">
import {computed} from 'vue';
import studentHappy from './assets/student-happy.png';
import robotThinking from './assets/robot-thinking.png';
import type {GrammarRaceDefinition} from './types';

type Props = {
  game: GrammarRaceDefinition
  currentLevel?: number
  nextEntryCost?: number | null
  availableCoins?: number
  isConnected?: boolean
  isLoading?: boolean
  hasActiveSession?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentLevel: 1,
  nextEntryCost: 0,
  availableCoins: 0,
  isConnected: true,
  isLoading: false,
  hasActiveSession: false,
});

defineEmits<{
  back: []
  start: []
}>();

const buttonText = computed(() => {
  if (props.hasActiveSession) return 'Продолжить игру';
  if (props.nextEntryCost === null) return 'Попытки на сегодня закончились';
  if (props.nextEntryCost === 0) return 'Играть бесплатно';

  return `Играть за ${props.nextEntryCost} EnCoin`;
});

const cannotAfford = computed(() => (
  props.nextEntryCost !== null
  && props.nextEntryCost > props.availableCoins
));

const isStartDisabled = computed(() => (
  props.isLoading
  || (!props.hasActiveSession && !props.isConnected)
  || (!props.hasActiveSession && props.nextEntryCost === null)
  || (!props.hasActiveSession && cannotAfford.value)
));
</script>

<template>
  <v-card
    class="pronoun-screen pronoun-lobby overflow-hidden"
    elevation="8"
    rounded="xl"
  >
    <div class="pronoun-lobby__glow pronoun-lobby__glow--top"></div>
    <div class="pronoun-lobby__glow pronoun-lobby__glow--bottom"></div>

    <v-card-text class="pronoun-lobby__content pa-5 pa-sm-7">
      <div class="d-flex justify-center">
        <v-chip
          color="primary"
          prepend-icon="mdi-flag-checkered"
          size="small"
          variant="tonal"
        >
          {{ game.groupTitle }}
        </v-chip>
      </div>

      <div class="text-center mt-3">
        <h1 class="pronoun-lobby__title text-h4 font-weight-black">
          {{ game.title }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          {{ game.description }}
        </p>
      </div>

      <div class="pronoun-lobby__arena mt-4">
        <div class="pronoun-lobby__track-lines"></div>
        <v-img
          alt="Ученица готова к игре"
          class="pronoun-lobby__student"
          cover
          position="center top"
          :src="studentHappy"
        ></v-img>

        <div class="pronoun-lobby__versus" aria-hidden="true">
          VS
        </div>

        <v-img
          alt="Компьютер-соперник"
          class="pronoun-lobby__robot"
          cover
          position="center top"
          :src="robotThinking"
        ></v-img>
      </div>

      <div class="d-flex align-center justify-center ga-2 mt-1 text-body-2 font-weight-medium">
        <v-icon color="primary" icon="mdi-trophy-outline" size="20"></v-icon>
        Первый, кто наберёт {{ game.rules.targetScore }} очков, получит
        {{ game.rules.winReward }} монеты
      </div>

      <div class="text-caption text-medium-emphasis text-center mt-1">
        {{ game.rankTitle }} {{ currentLevel }} уровня
      </div>

      <v-btn
        v-if="hasActiveSession || nextEntryCost !== null"
        block
        class="mt-5 text-none"
        color="primary"
        :disabled="isStartDisabled"
        height="52"
        :loading="isLoading"
        prepend-icon="mdi-play"
        rounded="xl"
        size="large"
        variant="flat"
        @click="$emit('start')"
      >
        {{ buttonText }}
      </v-btn>

      <div
        v-if="!hasActiveSession && nextEntryCost !== null && nextEntryCost > 0"
        class="text-caption text-medium-emphasis text-center mt-2"
      >
        Бесплатно сыграть можно будет завтра
      </div>

      <v-alert
        v-if="!isConnected && !hasActiveSession"
        class="mt-3 text-left"
        density="compact"
        type="info"
        variant="tonal"
      >
        Для начала новой игры нужно подключение к интернету
      </v-alert>

      <v-alert
        v-else-if="nextEntryCost === null && !hasActiveSession && !isLoading"
        class="mt-3 text-left"
        density="compact"
        type="info"
        variant="tonal"
      >
        На сегодня игры закончились. Снова поиграть можно будет завтра
      </v-alert>

      <v-alert
        v-else-if="cannotAfford && !hasActiveSession"
        class="mt-3 text-left"
        density="compact"
        type="warning"
        variant="tonal"
      >
        Недостаточно EnCoin для следующей попытки
      </v-alert>

      <v-btn
        v-if="!isLoading && !hasActiveSession && nextEntryCost === null"
        block
        class="mt-4 text-none"
        color="primary"
        height="52"
        prepend-icon="mdi-arrow-left"
        rounded="xl"
        size="large"
        variant="tonal"
        @click="$emit('back')"
      >
        К играм
      </v-btn>

    </v-card-text>
  </v-card>
</template>

<style scoped>
.pronoun-screen {
  background:
    radial-gradient(circle at 50% 30%, rgba(var(--v-theme-secondary), 0.12), transparent 38%),
    rgb(var(--v-theme-surface));
  min-height: 680px;
  position: relative;
}

.pronoun-lobby__content {
  position: relative;
  z-index: 2;
}

.pronoun-lobby__title {
  color: rgb(var(--v-theme-primary-darken-1));
  line-height: 1.08;
}

.pronoun-lobby__arena {
  height: 265px;
  overflow: hidden;
  position: relative;
}

.pronoun-lobby__student,
.pronoun-lobby__robot {
  position: absolute;
  top: 72px;
  z-index: 2;
}

.pronoun-lobby__student {
  height: 150px;
  left: -4px;
  width: 195px;
}

.pronoun-lobby__robot {
  height: 150px;
  right: 2px;
  width: 155px;
}

.pronoun-lobby__robot :deep(.v-img__img) {
  transform: scale(1.3);
  transform-origin: center top;
}

.pronoun-lobby__versus {
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border: 3px solid rgb(var(--v-theme-secondary));
  border-radius: 50%;
  box-shadow: 0 8px 20px rgba(var(--v-theme-secondary), 0.25);
  color: rgb(var(--v-theme-secondary));
  display: flex;
  font-size: 21px;
  font-weight: 900;
  height: 62px;
  justify-content: center;
  left: 50%;
  position: absolute;
  top: 94px;
  transform: translateX(-50%) rotate(-7deg);
  width: 62px;
  z-index: 3;
}

.pronoun-lobby__track-lines {
  background:
    linear-gradient(90deg, transparent 49%, rgba(var(--v-theme-primary), 0.22) 49% 51%, transparent 51%),
    repeating-linear-gradient(0deg, transparent 0 24px, rgba(var(--v-theme-secondary), 0.12) 24px 28px);
  border-radius: 50% 50% 16px 16px;
  bottom: 18px;
  height: 120px;
  left: 10%;
  opacity: 0.7;
  position: absolute;
  transform: perspective(260px) rotateX(55deg);
  width: 80%;
}

.pronoun-lobby__glow {
  border-radius: 50%;
  filter: blur(2px);
  pointer-events: none;
  position: absolute;
}

.pronoun-lobby__glow--top {
  background: rgba(var(--v-theme-primary), 0.1);
  height: 190px;
  right: -90px;
  top: -80px;
  width: 190px;
}

.pronoun-lobby__glow--bottom {
  background: rgba(var(--v-theme-secondary), 0.1);
  bottom: -80px;
  height: 200px;
  left: -100px;
  width: 200px;
}

@media (max-width: 399px) {
  .pronoun-screen {
    min-height: 650px;
  }

  .pronoun-lobby__arena {
    height: 235px;
  }

  .pronoun-lobby__student {
    height: 140px;
    left: -4px;
    top: 62px;
    width: 175px;
  }

  .pronoun-lobby__robot {
    height: 140px;
    right: 0;
    top: 62px;
    width: 145px;
  }
}
</style>
