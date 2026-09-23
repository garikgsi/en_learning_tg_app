<script setup lang="ts">
import {computed} from 'vue';
import type {GrammarRaceAnswerState, GrammarRaceTask} from '../types';

type Props = {
  instruction: string
  task: GrammarRaceTask
  selectedAnswer?: string | null
  isAnswerLocked?: boolean
  roundResolved?: boolean
  botHasAnswered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedAnswer: null,
  isAnswerLocked: false,
  roundResolved: false,
  botHasAnswered: false,
});

const emit = defineEmits<{
  answer: [answer: string]
}>();

const promptParts = computed(() => {
  const blankIndex = props.task.payload.text.indexOf('___');

  if (blankIndex < 0) {
    return [props.task.payload.text.trim(), ''] as const;
  }

  return [
    props.task.payload.text.slice(0, blankIndex).trim(),
    props.task.payload.text.slice(blankIndex + 3).trim(),
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

const getOptionLabel = (answer: string, label: string): string => (
  answer === 'none' ? 'артикль не нужен' : label
);

const getAnswerLabel = (answer: string, label: string): string => {
  const state = getAnswerState(answer);
  const labels = [getOptionLabel(answer, label)];

  if (state === 'correct') labels.push('правильный ответ');
  if (state === 'incorrect') labels.push('неправильный ответ');
  if (isBotAnswer(answer)) labels.push('ответ компьютера');

  return labels.join(', ');
};
</script>

<template>
  <v-sheet
    class="pronoun-round__question mt-4 pa-5 text-center"
    rounded="xl"
  >
    <div class="text-overline text-medium-emphasis">
      {{ instruction }}
    </div>
    <div class="pronoun-round__phrase mt-1">
      {{ promptParts[0] }}<span v-if="promptParts[0]">&nbsp;</span><span>___</span><template v-if="promptParts[1]"><span>&nbsp;</span>{{ promptParts[1] }}</template>
    </div>
    <div
      v-if="task.payload.translation"
      class="text-body-2 text-medium-emphasis mt-2"
    >
      {{ task.payload.translation }}
    </div>
  </v-sheet>

  <div class="pronoun-round__answers mt-4">
    <v-chip
      v-for="option in task.options"
      :key="option.id"
      :aria-label="getAnswerLabel(option.id, option.label)"
      class="pronoun-round__answer justify-center"
      :class="{
        'pronoun-round__answer--correct': getAnswerState(option.id) === 'correct',
        'pronoun-round__answer--incorrect': getAnswerState(option.id) === 'incorrect',
        'pronoun-round__answer--bot-selected': isBotAnswer(option.id),
        'pronoun-round__answer--locked': isAnswerLocked,
      }"
      :color="getAnswerState(option.id) === 'correct'
        ? 'success'
        : getAnswerState(option.id) === 'incorrect'
          ? 'error'
          : isBotAnswer(option.id)
            ? 'warning'
            : undefined"
      label
      size="x-large"
      :variant="getAnswerState(option.id) === 'idle' && !isBotAnswer(option.id)
        ? 'outlined'
        : 'flat'"
      :aria-disabled="isAnswerLocked"
      @click="!isAnswerLocked && emit('answer', option.id)"
    >
      <span
        class="font-weight-bold"
        :class="{'pronoun-round__answer-label--compact': option.id === 'none'}"
      >
        {{ getOptionLabel(option.id, option.label) }}
      </span>
      <v-icon
        v-if="getAnswerState(option.id) === 'correct'"
        class="ml-2"
        icon="mdi-check-circle"
        size="20"
      ></v-icon>
      <v-icon
        v-if="getAnswerState(option.id) === 'incorrect'"
        class="ml-2"
        icon="mdi-close-circle"
        size="20"
      ></v-icon>
      <v-icon
        v-if="isBotAnswer(option.id)"
        class="ml-2 pronoun-round__bot-answer-icon"
        color="warning"
        icon="mdi-robot-outline"
        size="20"
      ></v-icon>
    </v-chip>
  </div>
</template>

<style scoped>
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

.pronoun-round__answer-label--compact {
  font-size: 13px;
  line-height: 1.15;
  white-space: normal;
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
</style>
