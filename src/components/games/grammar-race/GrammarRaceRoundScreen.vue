<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import GrammarRacePlayerScore from './GrammarRacePlayerScore.vue';
import studentHappy from './assets/student-happy.png';
import studentSad from './assets/student-sad.png';
import robotHappy from './assets/robot-happy.png';
import robotSad from './assets/robot-sad.png';
import robotThinking from './assets/robot-thinking.png';
import type {
  GrammarRaceAnswerState,
  GrammarRaceDefinition,
  GrammarRaceTask,
} from './types';

type Props = {
  game: GrammarRaceDefinition
  task: GrammarRaceTask
  playerScore: number
  computerScore: number
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
});

const emit = defineEmits<{
  answer: [answer: string]
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

const promptParts = computed(() => {
  const blankIndex = props.task.prompt.indexOf('___');

  if (blankIndex < 0) {
    return [props.task.prompt.trim(), ''] as const;
  }

  return [
    props.task.prompt.slice(0, blankIndex).trim(),
    props.task.prompt.slice(blankIndex + 3).trim(),
  ] as const;
});

const getAnswerState = (answer: string): GrammarRaceAnswerState => {
  if (answer === props.selectedAnswer) {
    return answer === props.task.correctAnswer ? 'correct' : 'incorrect';
  }

  return props.roundResolved && answer === props.task.correctAnswer
    ? 'correct'
    : 'idle';
};

const isBotAnswer = (answer: string): boolean => (
  props.botHasAnswered && answer === props.task.botAnswer
);

const getAnswerLabel = (answer: string): string => {
  const state = getAnswerState(answer);
  const labels = [answer];

  if (state === 'correct') labels.push('правильный ответ');
  if (state === 'incorrect') labels.push('неправильный ответ');
  if (isBotAnswer(answer)) labels.push('ответ компьютера');

  return labels.join(', ');
};

const studentAvatar = computed(() => props.studentState === 'incorrect'
  ? studentSad
  : studentHappy);
const robotAvatar = computed(() => ({
  thinking: robotThinking,
  correct: robotHappy,
  incorrect: robotSad,
})[props.botState]);
</script>

<template>
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
            :target-score="game.rules.targetScore"
          ></GrammarRacePlayerScore>
        </div>
        <div ref="computerScoreElement" class="pronoun-round__score-player">
          <GrammarRacePlayerScore
            :avatar="robotThinking"
            label="Компьютер"
            :score="displayedComputerScore"
            side="computer"
            :target-score="game.rules.targetScore"
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
          Первый до {{ game.rules.targetScore }}
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

      <v-sheet
        class="pronoun-round__question mt-4 pa-5 text-center"
        rounded="xl"
      >
        <div class="text-overline text-medium-emphasis">
          {{ game.instruction }}
        </div>
        <div class="pronoun-round__phrase mt-1">
          {{ promptParts[0] }}<span v-if="promptParts[0]">&nbsp;</span><span>___</span><template v-if="promptParts[1]"> {{ promptParts[1] }}</template>
        </div>
        <div
          v-if="task.translation"
          class="text-body-2 text-medium-emphasis mt-2"
        >
          {{ task.translation }}
        </div>
      </v-sheet>

      <div ref="answersElement" class="pronoun-round__answers mt-4">
        <v-chip
          v-for="answer in task.choices"
          :key="answer"
          :aria-label="getAnswerLabel(answer)"
          class="pronoun-round__answer justify-center"
          :class="{
            'pronoun-round__answer--correct': getAnswerState(answer) === 'correct',
            'pronoun-round__answer--incorrect': getAnswerState(answer) === 'incorrect',
            'pronoun-round__answer--bot-selected': isBotAnswer(answer),
            'pronoun-round__answer--locked': isAnswerLocked,
          }"
          :color="getAnswerState(answer) === 'correct'
            ? 'success'
            : getAnswerState(answer) === 'incorrect'
              ? 'error'
              : isBotAnswer(answer)
                ? 'warning'
              : undefined"
          label
          size="x-large"
          :variant="getAnswerState(answer) === 'idle' && !isBotAnswer(answer)
            ? 'outlined'
            : 'flat'"
          :aria-disabled="isAnswerLocked"
          @click="!isAnswerLocked && emit('answer', answer)"
        >
          <span class="font-weight-bold">{{ answer }}</span>
          <v-icon
            v-if="getAnswerState(answer) === 'correct'"
            class="ml-2"
            icon="mdi-check-circle"
            size="20"
          ></v-icon>
          <v-icon
            v-if="getAnswerState(answer) === 'incorrect'"
            class="ml-2"
            icon="mdi-close-circle"
            size="20"
          ></v-icon>
          <v-icon
            v-if="isBotAnswer(answer)"
            class="ml-2 pronoun-round__bot-answer-icon"
            color="warning"
            icon="mdi-robot-outline"
            size="20"
          ></v-icon>
        </v-chip>
      </div>

      <div class="text-caption text-medium-emphasis text-center mt-4">
        {{ roundMessage }}
      </div>
    </v-card-text>
  </v-card>

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

.pronoun-round__question {
  background: rgba(var(--v-theme-primary), 0.06);
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.pronoun-round__phrase {
  color: rgb(var(--v-theme-on-surface));
  font-size: clamp(28px, 8vw, 38px);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.pronoun-round__phrase span {
  color: rgb(var(--v-theme-primary));
}

.pronoun-round__answers {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pronoun-round__answer {
  border-color: rgba(var(--v-theme-primary), 0.28);
  font-size: 18px;
  height: 56px;
  max-width: none;
  width: 100%;
}

.pronoun-round__answer--correct {
  box-shadow: 0 8px 18px rgba(var(--v-theme-success), 0.2);
}

.pronoun-round__answer--incorrect {
  box-shadow: 0 8px 18px rgba(var(--v-theme-error), 0.18);
}

.pronoun-round__answer--bot-selected {
  outline: 3px solid rgba(var(--v-theme-warning), 0.78);
  outline-offset: 2px;
}

.pronoun-round__bot-answer-icon {
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
  padding: 2px;
}

.pronoun-round__answer--locked {
  cursor: default;
  pointer-events: none;
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
