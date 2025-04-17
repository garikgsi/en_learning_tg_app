<script setup lang="ts">

import {computed, onMounted, ref, watch} from "vue";
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/types/WordResult.ts";


type Word = {
  id: number,
  word: string,
  translate: string
}

type Props = {
  ruList?: Word[],
  enList: Word[]
}

type WordStat = {
  id: number,
  retries: number,
  isOk: boolean,
  variants: string[]
}

const props = defineProps<Props>()

const onFinish = (wordId: number, result: WordResult) => {

  const word = words.value.find(w => w.id === wordId);

  if (word) {
    const res = results.value.find(r => r.id === word.id);

    if (result.isOk) {
      startNewWord();
    }

    if (res) {
      res.retries += 1;
      res.isOk = result.isOk;
      res.variants.push(result.answer);

      return;
    }

    results.value.push({
      id: word.id,
      retries: 1,
      isOk: result.isOk,
      variants: [result.answer]
    })
  }

}

const finishedWords = computed(() => {
  return results.value.filter(w => w.isOk).map(w => w.id);
})

const results = ref<WordStat[]>([]);

const words = computed(() => {
  return props.enList.filter(w => !finishedWords.value.includes(w.id));
});


const wordsCount = computed(() => {
  return words.value.length;
})

const totalTimer = ref(0);

const secOnWord = ref(20);

const wordTimer = computed(() => {
  return totalTimer.value % (secOnWord.value * 1000);
});

const currentWordIndex = computed(() => Math.floor(totalTimer.value / (secOnWord.value * 1000)) % wordsCount.value)

const currentWord = computed(() => {
  return words.value[currentWordIndex.value];
})

const wordProgressColor = computed(() => {
  return 'success'
});

const timerStep = 100;

const timer = ref();

const timerPaused = ref(false);

const startTimer = () => {
  timer.value = setInterval(() => {

    if (!timerPaused.value && wordsCount.value > 0) {
      totalTimer.value = totalTimer.value + timerStep;
    }

  }, timerStep);
}

const stopTimer = () => {

  clearInterval(timer.value);

}

onMounted(() => {
  startTimer();
});

watch(currentWord, (newWord, oldWord) => {
  console.log('new word', newWord, oldWord)

  startNewWord();
});

const startNewWord = () => {

  timerPaused.value = true;

  answer.value = '';

  setTimeout(() => {

    totalTimer.value = 0;

    otp.value?.reset();

    timerPaused.value = false;

  }, 2000);

}

const answer = ref('');

const otp = ref(null);

const progressValue = computed(() => timerPaused.value ? secOnWord * 1000 : wordTimer.value)

</script>

<template>
  <template v-if="enList.length > 0">
    <template v-if="wordsCount > 0">
      <h1>Осталось выполнить заданий: {{ wordsCount }} из {{ enList.length }}</h1>

      <IWord ref="otp" v-model="answer" :word="currentWord.word" :translate="currentWord.translate"
             @finish="(res) => onFinish(currentWord.id, res)" :disabled="timerPaused"></IWord>

      <v-row>
        <v-progress-linear :buffer-value="progressValue" :color="wordProgressColor"
                           :max="secOnWord*1000"></v-progress-linear>
      </v-row>

    </template>
    <v-alert
      v-else
      text="Поздравляю, вы выполнили все задания, получайте свою награду"
      title="Задание выполнено"
      type="success"
    ></v-alert>

  </template>

  <v-alert
    v-else
    text="На сегодня все задания выполнены"
    title="Нет заданий"
    type="primary"
  ></v-alert>

</template>

<style scoped>

</style>
