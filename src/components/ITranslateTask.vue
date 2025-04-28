<script setup lang="ts">

import {computed, onMounted, ref, watch} from "vue";
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/IWord.vue";
import random from "@/libs/random.ts";


export type Word = {
  id: number,
  word: string,
  translate: string
}

export type WordStat = {
  id: number,
  retries: number,
  isOk: boolean,
  variants: string[],
  skipTimes: number,
  hintTimes: number
}

export type Lang = 'en' | 'ru';

export type CreateWordResult = Partial<Omit<WordStat, 'id'>> & Pick<WordStat, 'id'>

export type Task = {
  lang: Lang,
  list: Word[],
  results: WordStat[]
}

type Props = {
  ruList: Word[],
  enList: Word[]
}

type Emits = {
  'finish': (taskResult: Task) => {}
}

const props = defineProps<Props>();

const emits = defineEmits<Emits>();

const onFinish = (wordId: number, result: WordResult) => {

  const word = words.value.find(w => w.id === wordId);

  if (word) {
    const res = getWordResult(currentWord.value.id);

    if (result.isOk) {
      setTimeout(() => {
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

        startNewWord();

      }, 1000);

    }

  }
}

const getNextWordIndex = () => {
  if ([0, 1].includes(wordsCount.value)) {
    return 0;
  }

  const nextIndex = random(0, wordsCount.value - 1, currentWordIndex.value);

  return nextIndex;
}

const ruResults = ref<WordStat[]>([]);
const enResults = ref<WordStat[]>([]);

const lang = ref<Lang>();

const tasks = computed<Task[]>(() => {
  return [
    {lang: 'ru', list: props.ruList, results: ruResults.value},
    {lang: 'en', list: props.enList, results: enResults.value},
  ];
});

const currentLangResults = computed<WordStat[]>(() => {
  if (lang.value && tasks.value) {
    return tasks.value.find(t => t.lang === lang.value).results;
  }

  return [];
})

const finishedWords = computed(() => {
  return currentLangResults.value.filter(w => w.isOk).map(w => w.id);
});

const currentLangList = computed(() => {
  return tasks.value.find(t => t.lang === lang.value)?.list || [];
});

const words = computed(() => {
  return currentLangList.value.filter(w => !finishedWords.value.includes(w.id));
});

const wordsCount = computed(() => {
  return words.value.length;
})

const wordTimer = ref(0);

const secOnWord = ref(30);

const isTimeout = computed(() => wordTimer.value >= secOnWord.value * 1000)

const currentWordIndex = ref(0);

const currentWord = computed(() => {
  return words.value[currentWordIndex.value];
})

const taskTitle = computed(() => {
  return `Осталось выполнить заданий: ${wordsCount.value} из ${currentLangList.value.length}`
})

const wordProgressColor = computed(() => {
  const progress = wordTimer.value / (secOnWord.value * 1000);

  if (progress > 0.9) {
    return 'error';
  }

  if (progress > 0.7) {
    return 'warning';
  }

  return 'green-darken-3';
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

const isPaused = computed(() => timerPaused.value);

const playPauseIcon = computed(() => isPaused.value ? 'mdi-play' : 'mdi-pause');

const playPause = () => {
  timerPaused.value = !timerPaused.value
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
  const res = getWordResult(currentWord.value.id);

  if (res) {
    res.skipTimes += 1;
  } else {
    createWordResult({
      id: currentWord.value.id,
      skipTimes: 1
    });
  }

  startNewWord();
}

const getWordResult = (id: number) => {
  return currentLangResults.value.find(r => r.id === id);
}

const getHint = () => {

  if (isHintsAvailable.value) {

    const res = getWordResult(currentWord.value.id);

    if (res) {
      res.hintTimes += 1;

    } else {
      createWordResult({
        id: currentWord.value.id,
        hintTimes: 1,
      });
    }

    if (wrongAnswerPos.value === null) {
      answer.value = answer.value + currentWord.value.translate[answer.value.length]
    } else {
      answer.value = answer.value.substring(0, wrongAnswerPos.value) + currentWord.value.translate[wrongAnswerPos.value]
    }

    otp.value?.focus();

  }

}

const currentWordResult = computed(() => {
  return currentLangResults.value.find(r => r.id === currentWord.value.id)
})

const maxHintsOnWord = 2;

const isHintsAvailable = computed(() => {
  if (currentWordResult.value) {
    return (currentWordResult.value.hintTimes || 0) < maxHintsOnWord
  }

  return true;

})

const wrongAnswerPos = computed(() => {
  if (answer.value.length === 0) {
    return null;
  }

  if (currentWord.value.translate.substring(0, answer.value.length) === answer.value) {
    return null;
  }

  for (let i = 1; i < answer.value.length + 1; i++) {
    if (currentWord.value.translate.substring(0, i) !== answer.value.substring(0, i)) {
      return i - 1;
    }
  }

})

const isWordCompleted = computed(() => {
  return answer.value.length === currentWord.value.translate.length && wrongAnswerPos.value === null
})

const otpColor = computed(() => {
  if (wrongAnswerPos.value !== null) {
    return 'error';
  }

  if (isWordCompleted.value) {
    return 'success';
  }

  return null;
})

const createWordResult = (result: CreateWordResult) => {

  const results = tasks.value.find(t => t.lang === lang.value).results;

  if (results) {
    results.push({
      id: result.id,
      retries: result.retries || 0,
      isOk: result.isOk || false,
      variants: result.variants || [],
      skipTimes: result.skipTimes || 0,
      hintTimes: result.hintTimes || 0
    });
  }


}

const selectEnglish = () => {
  lang.value = 'en'
}
const selectRussian = () => {
  lang.value = 'ru'
}

</script>

<template>
  <template v-if="enList.length > 0 || ruList.length > 0">
    <template v-if="wordsCount > 0">
      <v-card :title="taskTitle">
        <v-card-text>
          <IWord v-if="currentWord" ref="otp" v-model="answer" :word="currentWord.word"
                 :translate="currentWord.translate"
                 @finish="(res: WordResult) => onFinish(currentWord.id, res)" :disabled="timerPaused"
                 :color="otpColor"></IWord>
        </v-card-text>
        <v-card-text>
          <v-progress-linear :buffer-value="progressValue"
                             :color="wordProgressColor"
                             :max="secOnWord*1000"
                             :height="22"
                             rounded="lg"
          ></v-progress-linear>
        </v-card-text>
        <v-card-actions>
          <v-row>
            <v-col>
              <v-btn color="primary" @click="skipWord">Пропустить</v-btn>
            </v-col>

            <v-col>
              <v-btn :icon="playPauseIcon" flat rounded @click="playPause"></v-btn>
            </v-col>

            <v-col class="text-right">
              <v-btn :disabled="!isHintsAvailable" color="warning" @click="getHint">Подсказка</v-btn>
            </v-col>

          </v-row>
        </v-card-actions>
      </v-card>

    </template>

    <template v-else>
      <v-card title="Выберем язык"
              subtitle="Выберите язык для повторения"
              text="На выбранном языке будут даны слова, которые вы будете переводить">
        <v-card-actions>
          <v-btn @click="selectEnglish" color="error">English</v-btn>
          <v-btn @click="selectRussian" color="ok">Русский</v-btn>
        </v-card-actions>
      </v-card>
    </template>

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
