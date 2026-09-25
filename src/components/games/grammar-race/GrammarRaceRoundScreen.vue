<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import GrammarRacePlayerScore from './GrammarRacePlayerScore.vue';
import GrammarRaceTaskHost from './tasks/GrammarRaceTaskHost.vue';
import studentHappy from './assets/student-happy.png';
import studentSad from './assets/student-sad.png';
import robotHappy from './assets/robot-happy.png';
import robotSad from './assets/robot-sad.png';
import robotThinking from './assets/robot-thinking.png';
import robotScientist from './assets/robot-scientist.png';
import type {
  GrammarRaceDefinition,
  GrammarRaceTask,
} from './types';

type Props = {
  game: GrammarRaceDefinition
  task: GrammarRaceTask
  playerScore: number
  computerScore: number
  winningScore?: number
  roundNumber: number
  selectedAnswer?: string | null
  timerProgress?: number
  roundMessage?: string
  isAnswerLocked?: boolean
  roundResolved?: boolean
  botState?: 'thinking' | 'correct' | 'incorrect'
  botHasAnswered?: boolean
  studentState?: 'ready' | 'correct' | 'incorrect'
  playerAvatar?: string | null
  studentName?: string
  reviewVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedAnswer: null,
  timerProgress: 0,
  roundMessage: 'Ответьте раньше соперника',
  isAnswerLocked: false,
  roundResolved: false,
  botState: 'thinking',
  botHasAnswered: false,
  studentState: 'ready',
  playerAvatar: null,
  studentName: 'Вы',
  reviewVisible: false,
  winningScore: undefined,
});

const emit = defineEmits<{
  answer: [answer: string]
  acknowledgeReview: []
}>();

type ScoreFlight = {
  key: number
  side: 'student' | 'computer'
  left: number
  top: number
  x: number
  y: number
}

const answersElement = ref<HTMLElement | null>(null);
const playerScoreElement = ref<HTMLElement | null>(null);
const computerScoreElement = ref<HTMLElement | null>(null);
const displayedPlayerScore = ref(props.playerScore);
const displayedComputerScore = ref(props.computerScore);
const scoreFlight = ref<ScoreFlight | null>(null);
let scoreFlightKey = 0;

const finishScoreFlight = (): void => {
  if (scoreFlight.value?.side === 'student') {
    displayedPlayerScore.value = props.playerScore;
  } else {
    displayedComputerScore.value = props.computerScore;
  }
  scoreFlight.value = null;
};

const startScoreFlight = async (
  side: 'student' | 'computer',
  score: number,
): Promise<void> => {
  const displayedScore = side === 'student'
    ? displayedPlayerScore
    : displayedComputerScore;

  if (score <= displayedScore.value) {
    displayedScore.value = score;
    return;
  }

  await nextTick();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayedScore.value = score;
    return;
  }

  const answer = answersElement.value?.querySelector<HTMLElement>(
    side === 'student'
      ? '.pronoun-round__answer--correct'
      : '.pronoun-round__answer--bot-selected',
  );
  const scoreContainer = side === 'student'
    ? playerScoreElement.value
    : computerScoreElement.value;
  const scoreValue = scoreContainer?.querySelector<HTMLElement>(
    '.pronoun-player-score__value',
  );

  if (!answer || !scoreValue) {
    displayedScore.value = score;
    return;
  }

  const answerRect = answer.getBoundingClientRect();
  const scoreRect = scoreValue.getBoundingClientRect();
  const left = answerRect.left + answerRect.width / 2;
  const top = answerRect.top + answerRect.height / 2;

  scoreFlight.value = {
    key: ++scoreFlightKey,
    side,
    left,
    top,
    x: scoreRect.left + scoreRect.width / 2 - left,
    y: scoreRect.top + scoreRect.height / 2 - top,
  };
};

watch(() => props.playerScore, score => {
  void startScoreFlight('student', score);
});

watch(() => props.computerScore, score => {
  void startScoreFlight('computer', score);
});

const studentAvatar = computed(() => props.studentState === 'incorrect'
  ? studentSad
  : studentHappy);
const robotAvatar = computed(() => ({
  thinking: robotThinking,
  correct: robotHappy,
  incorrect: robotSad,
})[props.botState]);
// The target is snapshotted by the server for the active difficulty level.
const targetScore = computed(() => props.winningScore ?? props.game.rules.targetScore);

const reviewTranslation = computed(() => {
  if (props.task.payload.feedback?.translation) {
    return props.task.payload.feedback.translation;
  }

  if (!props.task.payload.translation) {
    return null;
  }

  const answerTranslations: Record<string, string> = {
    he: 'он',
    she: 'она',
    it: 'это',
    we: 'мы',
    they: 'они',
  };
  const answer = answerTranslations[props.task.correctAnswer]
    ?? props.task.correctAnswer;

  return `${props.task.payload.translation} → ${answer}`;
});
</script>

<template>
  <div class="grammar-race-round-host">
    <v-card
      class="pronoun-screen pronoun-round overflow-hidden"
      elevation="8"
      rounded="xl"
    >
      <v-card-text class="pa-4 pa-sm-5">
      <div class="d-flex ga-2">
        <div ref="playerScoreElement" class="pronoun-round__score-player">
          <GrammarRacePlayerScore
            :avatar="playerAvatar || studentHappy"
            :label="studentName"
            :score="displayedPlayerScore"
            side="student"
            :target-score="targetScore"
          ></GrammarRacePlayerScore>
        </div>
        <div ref="computerScoreElement" class="pronoun-round__score-player">
          <GrammarRacePlayerScore
            :avatar="robotThinking"
            label="Компьютер"
            :score="displayedComputerScore"
            side="computer"
            :target-score="targetScore"
          ></GrammarRacePlayerScore>
        </div>
      </div>

      <div class="d-flex align-center justify-center ga-2 mt-4">
        <v-chip
          color="secondary"
          prepend-icon="mdi-flag-outline"
          size="small"
          variant="tonal"
        >
          Раунд {{ roundNumber }}
        </v-chip>
        <span class="text-caption text-medium-emphasis">
          Первый до {{ targetScore }}
        </span>
      </div>

      <div class="pronoun-round__arena mt-2">
        <v-img
          alt="Ученица"
          class="pronoun-round__student"
          cover
          position="center top"
          :src="studentAvatar"
        ></v-img>

        <div class="pronoun-round__speed-lines" aria-hidden="true"></div>

        <div
          v-if="botState === 'thinking'"
          class="pronoun-round__thinking"
          aria-label="Компьютер думает"
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        <v-img
          alt="Компьютер думает"
          class="pronoun-round__robot"
          cover
          position="center top"
          :src="robotAvatar"
        ></v-img>
      </div>

      <v-progress-linear
        aria-label="Ожидание ответа компьютера"
        class="pronoun-round__timer"
        color="warning"
        height="7"
        :model-value="timerProgress"
        rounded
      ></v-progress-linear>

      <div ref="answersElement">
        <GrammarRaceTaskHost
          :bot-has-answered="botHasAnswered"
          :instruction="task.payload.instruction || game.instruction"
          :is-answer-locked="isAnswerLocked"
          :round-resolved="roundResolved"
          :selected-answer="selectedAnswer"
          :task="task"
          @answer="emit('answer', $event)"
        ></GrammarRaceTaskHost>
      </div>

      <div class="text-caption text-medium-emphasis text-center mt-4">
        {{ roundMessage }}
      </div>
      </v-card-text>
    </v-card>

    <v-dialog
      contained
      :model-value="reviewVisible"
      max-width="400"
      persistent
    >
      <v-card class="pronoun-round__review" rounded="xl">
        <div
          aria-hidden="true"
          class="pronoun-round__review-robot"
          :style="{backgroundImage: `url(${robotScientist})`}"
        ></div>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-5">
          <v-icon color="secondary" icon="mdi-lightbulb-on-outline"></v-icon>
          Разберём пример
        </v-card-title>
        <v-card-text class="px-5">
          <div class="text-body-2 text-medium-emphasis">Правильный вариант</div>
          <div class="text-h6 font-weight-bold mt-1">
            {{ task.payload.feedback?.correctText }}
          </div>
          <div
            v-if="reviewTranslation"
            class="text-body-2 text-medium-emphasis mt-1"
          >
            {{ reviewTranslation }}
          </div>
          <v-alert
            class="mt-4"
            color="secondary"
            icon="mdi-school-outline"
            variant="tonal"
          >
            {{ task.payload.feedback?.explanation }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-btn
            block
            color="success"
            size="large"
            variant="flat"
            @click="emit('acknowledgeReview')"
          >
            Понятно
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <Teleport to="body">
    <div
      v-if="scoreFlight"
      :key="scoreFlight.key"
      aria-hidden="true"
      class="pronoun-round__score-flight"
      :class="`pronoun-round__score-flight--${scoreFlight.side}`"
      :style="{
        left: `${scoreFlight.left}px`,
        top: `${scoreFlight.top}px`,
        '--score-flight-x': `${scoreFlight.x}px`,
        '--score-flight-y': `${scoreFlight.y}px`,
      }"
      @animationend="finishScoreFlight"
    >
      +1
    </div>
  </Teleport>
</template>

<style scoped>
.grammar-race-round-host {
  position: relative;
}

.pronoun-round__review {
  isolation: isolate;
  overflow: hidden;
  position: relative;
}

.pronoun-round__review-robot {
  background-position: right top;
  background-repeat: no-repeat;
  background-size: contain;
  height: 235px;
  opacity: 0.24;
  pointer-events: none;
  position: absolute;
  right: -28px;
  top: 18px;
  width: 180px;
  z-index: 0;
}

.pronoun-round__review > :not(.pronoun-round__review-robot) {
  position: relative;
  z-index: 1;
}

.pronoun-screen {
  background:
    radial-gradient(circle at 50% 18%, rgba(var(--v-theme-secondary), 0.14), transparent 34%),
    rgb(var(--v-theme-surface));
  min-height: 680px;
}

.pronoun-round__score-player {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
}

.pronoun-round__score-player > :deep(*) {
  width: 100%;
}

.pronoun-round__arena {
  height: 150px;
  overflow: hidden;
  position: relative;
}

.pronoun-round__student,
.pronoun-round__robot {
  position: absolute;
  top: 20px;
  z-index: 2;
}

.pronoun-round__student {
  height: 120px;
  left: 0;
  width: 155px;
}

.pronoun-round__robot {
  height: 120px;
  right: 0;
  width: 125px;
}

.pronoun-round__robot :deep(.v-img__img) {
  transform: scale(1.3);
  transform-origin: center top;
}

.pronoun-round__speed-lines {
  background: repeating-linear-gradient(
    0deg,
    transparent 0 18px,
    rgba(var(--v-theme-secondary), 0.13) 18px 21px
  );
  height: 90px;
  left: 14%;
  position: absolute;
  right: 14%;
  top: 38px;
  transform: perspective(180px) rotateX(62deg);
}

.pronoun-round__thinking {
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 8px 20px rgba(75, 33, 66, 0.1);
  display: flex;
  gap: 5px;
  padding: 10px 12px;
  position: absolute;
  right: 104px;
  top: 18px;
  z-index: 3;
}

.pronoun-round__thinking span {
  background: rgb(var(--v-theme-warning));
  border-radius: 50%;
  height: 6px;
  width: 6px;
}

.pronoun-round__timer {
  background: rgba(var(--v-theme-warning), 0.12);
}

.pronoun-round__score-flight {
  align-items: center;
  animation: grammar-race-score-flight 720ms cubic-bezier(0.22, 0.76, 0.28, 1) forwards;
  background: rgb(var(--v-theme-success));
  border: 3px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(var(--v-theme-success), 0.42);
  color: rgb(var(--v-theme-on-success));
  display: flex;
  font-size: 18px;
  font-weight: 900;
  height: 48px;
  justify-content: center;
  pointer-events: none;
  position: fixed;
  width: 48px;
  z-index: 9999;
}

.pronoun-round__score-flight--computer {
  background: rgb(var(--v-theme-warning));
  box-shadow: 0 8px 24px rgba(var(--v-theme-warning), 0.42);
  color: rgb(var(--v-theme-on-warning));
}

@keyframes grammar-race-score-flight {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }

  14% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.08);
  }

  76% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(
      calc(-50% + var(--score-flight-x)),
      calc(-50% + var(--score-flight-y))
    ) scale(0.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pronoun-round__score-flight {
    animation-duration: 1ms;
  }
}
</style>
