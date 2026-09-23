<script setup lang="ts">
import studentHappy from './assets/student-happy.png';
import studentSad from './assets/student-sad.png';
import robotHappy from './assets/robot-happy.png';
import robotSad from './assets/robot-sad.png';
import type {GrammarRaceDefinition, GrammarRaceResult} from './types';

type Props = {
  game: GrammarRaceDefinition
  result: GrammarRaceResult
  playerScore: number
  computerScore: number
  isResultPending?: boolean
  replayCost?: number | null
  canReplay?: boolean
  studentName?: string
  isTraining?: boolean
}

withDefaults(defineProps<Props>(), {
  isResultPending: false,
  replayCost: 1,
  canReplay: true,
  studentName: 'Вы',
  isTraining: false,
});

defineEmits<{
  finish: []
  replay: []
}>();
</script>

<template>
  <v-card
    class="pronoun-screen pronoun-result overflow-hidden"
    elevation="8"
    rounded="xl"
  >
    <div class="pronoun-result__confetti" aria-hidden="true">
      <span v-for="piece in 12" :key="piece"></span>
    </div>

    <v-card-text class="pronoun-result__content pa-5 pa-sm-7 text-center">
      <v-avatar
        class="pronoun-result__trophy"
        color="primary"
        size="62"
        variant="tonal"
      >
        <v-icon icon="mdi-trophy-award" size="34"></v-icon>
      </v-avatar>

      <h1 class="text-h3 font-weight-black mt-3">
        {{ result === 'win' ? 'Победа!' : 'В этот раз победил компьютер' }}
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1">
        {{ result === 'win'
          ? 'Вы оказались быстрее компьютера'
          : 'Попробуйте ещё раз и возьмите реванш' }}
      </p>

      <div class="pronoun-result__arena mt-2">
        <v-img
          :alt="result === 'win' ? 'Победившая ученица' : 'Расстроенная ученица'"
          class="pronoun-result__student"
          cover
          position="center top"
          :src="result === 'win' ? studentHappy : studentSad"
        ></v-img>
        <v-img
          :alt="result === 'win' ? 'Расстроенный компьютер' : 'Победивший компьютер'"
          class="pronoun-result__robot"
          cover
          position="center top"
          :src="result === 'win' ? robotSad : robotHappy"
        ></v-img>
      </div>

      <v-sheet
        class="pronoun-result__score mx-auto pa-3"
        rounded="xl"
      >
        <span class="text-h6 font-weight-medium text-medium-emphasis text-truncate">
          {{ studentName }}
        </span>
        <strong class="pronoun-result__score-value">
          {{ playerScore }} : {{ computerScore }}
        </strong>
        <span class="text-h6 font-weight-medium text-medium-emphasis">ПК</span>
      </v-sheet>

      <v-sheet
        v-if="result === 'win' && !isTraining"
        class="pronoun-result__reward mt-3 pa-4"
        rounded="xl"
      >
        <v-avatar color="primary" size="42" variant="flat">
          <v-icon color="on-primary" icon="mdi-hand-coin-outline" size="24"></v-icon>
        </v-avatar>
        <div class="text-left">
          <div class="text-caption text-medium-emphasis">Награда за победу</div>
          <div class="text-h6 font-weight-bold">+{{ game.rules.winReward }} EnCoin</div>
        </div>
      </v-sheet>

      <v-alert
        v-else-if="!isTraining"
        class="mt-3 text-left"
        density="compact"
        type="info"
        variant="tonal"
      >
        За поражение награда не начисляется
      </v-alert>

      <v-alert
        v-else
        class="mt-3 text-left"
        density="compact"
        type="info"
        variant="tonal"
      >
        Это была тренировка — попытки и монеты не расходуются, награда не начисляется
      </v-alert>

      <v-alert
        v-if="isResultPending && !isTraining"
        class="mt-3 text-left"
        density="compact"
        icon="mdi-cloud-upload-outline"
        type="info"
        variant="tonal"
      >
        Результат сохранён и будет отправлен после восстановления связи
      </v-alert>

      <v-btn
        block
        class="mt-4 text-none"
        color="primary"
        height="50"
        rounded="xl"
        size="large"
        variant="flat"
        @click="$emit('finish')"
      >
        Готово
      </v-btn>

      <v-btn
        v-if="canReplay"
        block
        class="mt-2 text-none"
        color="secondary"
        height="46"
        prepend-icon="mdi-replay"
        rounded="xl"
        variant="tonal"
        @click="$emit('replay')"
      >
        {{ isTraining
          ? 'Тренироваться ещё'
          : replayCost === 0
          ? 'Сыграть ещё бесплатно'
          : `Сыграть ещё за ${replayCost} EnCoin` }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.pronoun-screen {
  background:
    radial-gradient(circle at 50% 24%, rgba(var(--v-theme-primary), 0.14), transparent 34%),
    rgb(var(--v-theme-surface));
  min-height: 680px;
  position: relative;
}

.pronoun-result__content {
  position: relative;
  z-index: 2;
}

.pronoun-result__trophy {
  box-shadow: 0 10px 28px rgba(var(--v-theme-primary), 0.22);
}

.pronoun-result__arena {
  height: 210px;
  overflow: hidden;
  position: relative;
}

.pronoun-result__student,
.pronoun-result__robot {
  position: absolute;
  top: 30px;
}

.pronoun-result__student {
  height: 155px;
  left: 6px;
  width: 195px;
  z-index: 2;
}

.pronoun-result__robot {
  height: 155px;
  right: 6px;
  transform: rotate(5deg);
  width: 150px;
  z-index: 1;
}

.pronoun-result__robot :deep(.v-img__img) {
  transform: scale(1.35);
  transform-origin: center top;
}

.pronoun-result__score {
  align-items: center;
  background: rgba(var(--v-theme-secondary), 0.08);
  border: 1px solid rgba(var(--v-theme-secondary), 0.18);
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr auto 1fr;
  max-width: 300px;
}

.pronoun-result__score-value {
  color: rgb(var(--v-theme-primary));
  font-size: 34px;
}

.pronoun-result__reward {
  align-items: center;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  display: flex;
  gap: 12px;
  justify-content: center;
}

.pronoun-result__confetti span {
  background: rgb(var(--v-theme-primary));
  border-radius: 999px;
  height: 12px;
  position: absolute;
  transform: rotate(26deg);
  width: 5px;
  z-index: 1;
}

.pronoun-result__confetti span:nth-child(3n) {
  background: rgb(var(--v-theme-secondary));
  transform: rotate(-42deg);
}

.pronoun-result__confetti span:nth-child(4n) {
  background: rgb(var(--v-theme-success));
  transform: rotate(68deg);
}

.pronoun-result__confetti span:nth-child(1) { left: 8%; top: 9%; }
.pronoun-result__confetti span:nth-child(2) { left: 17%; top: 21%; }
.pronoun-result__confetti span:nth-child(3) { left: 28%; top: 7%; }
.pronoun-result__confetti span:nth-child(4) { right: 8%; top: 13%; }
.pronoun-result__confetti span:nth-child(5) { right: 18%; top: 23%; }
.pronoun-result__confetti span:nth-child(6) { right: 29%; top: 7%; }
.pronoun-result__confetti span:nth-child(7) { left: 6%; top: 36%; }
.pronoun-result__confetti span:nth-child(8) { right: 7%; top: 38%; }
.pronoun-result__confetti span:nth-child(9) { left: 13%; top: 52%; }
.pronoun-result__confetti span:nth-child(10) { right: 12%; top: 53%; }
.pronoun-result__confetti span:nth-child(11) { left: 24%; top: 31%; }
.pronoun-result__confetti span:nth-child(12) { right: 25%; top: 33%; }

@media (max-width: 399px) {
  .pronoun-result__student {
    left: -4px;
    width: 180px;
  }

  .pronoun-result__robot {
    right: -2px;
    width: 142px;
  }
}
</style>
