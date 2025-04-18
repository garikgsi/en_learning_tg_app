<script setup lang="ts">

import {computed, onMounted, ref, watch} from "vue";
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/types/WordResult.ts";
import random from "@/libs/random.ts";


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
  variants: string[],
  skipTimes: number,
  hintTimes: number
}

type CreateWordResult = Partial<Omit<WordStat, 'id'>> & Pick<WordStat, 'id'>


const props = defineProps<Props>()

const onFinish = (wordId: number, result: WordResult) => {

  const word = words.value.find(w => w.id === wordId);

  if (word) {
    const res = getWordResult(currentWord.value.id);

    if (result.isOk) {
      startNewWord();
    }

    if (res) {
      res.retries += 1;
      res.isOk = result.isOk;
      res.variants.push(result.answer);

      return;
    }

    createWordResult({
      id: currentWord.value.id,
      retries: 1,
      isOk: result.isOk,
      variants: [result.answer]
    });

  }
}

const getNextWordIndex = () => {
  if (wordsCount.value === 1) {
    return 0;
  }

  const nextIndex = random(0, wordsCount.value - 1, currentWordIndex.value);

  return nextIndex;
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

const wordTimer = ref(0);

const secOnWord = ref(50);

const isTimeout = computed(() => wordTimer.value >= secOnWord.value * 1000)

const currentWordIndex = ref(0);

const currentWord = computed(() => {
  return words.value[currentWordIndex.value];
})

const wordProgressColor = computed(() => {
  return 'success'
});

const intervalTimer = ref();

const timerStep = 100;

const timerPaused = ref(false);

const startTimer = () => {

  wordTimer.value = 0;

  clearInterval(intervalTimer.value);

  intervalTimer.value = setInterval(() => {

    if (!timerPaused.value && wordsCount.value > 0) {
      wordTimer.value = wordTimer.value + timerStep;
    }

  }, timerStep);

}

const pauseTimer = () => {
  timerPaused.value = true;
}

const runTimer = () => {
  timerPaused.value = false;
}


onMounted(() => {
  startNewWord();
});

watch(isTimeout, (isTimedOut) => {

  if (isTimedOut) {
    startNewWord();
  }
});

const startNewWord = () => {

  currentWordIndex.value = getNextWordIndex();

  startTimer();

  answer.value = '';

  otp.value?.reset();

}

const answer = ref('');

const otp = ref(null);

const progressValue = computed(() => wordTimer.value);


const skipWord = () => {
  // const res = getWordResult(currentWord.value.id);
  //
  // if (res) {
  //   res.skipTimes += 1;
  //   return;
  // }
  //
  // createWordResult({
  //   id: currentWord.value.id,
  //   skipTimes: 1
  // });

  startNewWord();
}

const getWordResult = (id) => {
  return results.value.find(r => r.id === id);
}

const getHint = () => {
  const res = getWordResult(currentWord.value.id);

  if (res) {
    res.skipTimes += 1;
    return;
  }

  createWordResult({
    id: currentWord.value.id,
    retries: 1,
  });

  console.log('currentWord.value.translate[answer.value.length]', currentWord.value.translate[answer.value.length], answer.value)

  if (currentWord.value.translate.substring(0, answer.value.length) === answer.value) {

    answer.value = answer.value + currentWord.value.translate[answer.value.length]

    otp.value?.focus();

  }

}


const createWordResult = (result: CreateWordResult) => {
  results.value.push({
    id: result.id,
    retries: result.retries || 0,
    isOk: result.isOk || false,
    variants: result.variants || [],
    skipTimes: result.skipTimes || 0,
    hintTimes: result.hintTimes || 0
  });
}

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

      <v-row>
        <v-col>
          <v-btn color="primary" @click="skipWord">Пропустить</v-btn>
        </v-col>
        <v-col class="text-right">
          <v-btn color="warning" @click="getHint">Подсказка</v-btn>
        </v-col>

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
