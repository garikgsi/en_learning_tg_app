<script setup lang="ts">
import GrammarRaceSingleChoiceTask from './GrammarRaceSingleChoiceTask.vue';
import type {GrammarRaceTask} from '../types';

type Props = {
  instruction: string
  task: GrammarRaceTask
  selectedAnswer?: string | null
  isAnswerLocked?: boolean
  roundResolved?: boolean
  botHasAnswered?: boolean
}

withDefaults(defineProps<Props>(), {
  selectedAnswer: null,
  isAnswerLocked: false,
  roundResolved: false,
  botHasAnswered: false,
});

defineEmits<{
  answer: [answer: string]
}>();

const renderers = {
  single_choice: GrammarRaceSingleChoiceTask,
};
</script>

<template>
  <component
    :is="renderers[task.type]"
    :instruction="instruction"
    :task="task"
    :selected-answer="selectedAnswer"
    :is-answer-locked="isAnswerLocked"
    :round-resolved="roundResolved"
    :bot-has-answered="botHasAnswered"
    @answer="$emit('answer', $event)"
  ></component>
</template>
