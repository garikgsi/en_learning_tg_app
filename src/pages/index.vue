<script lang="ts" setup>

import {computed, ref, onMounted, watch} from 'vue';
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/types/WordResult.ts";

type WordStat = {
  id: number,
  retries: number,
  isOk: boolean,
  variants: string[]
}

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

const list = computed(() => {
  return [
    {id: 1, word: 'птица', translate: 'bird'},
    {id: 2, word: 'кошка', translate: 'cat'},
    {id: 3, word: 'школа', translate: 'school'},
    {id: 4, word: 'дом', translate: 'home'},
    {id: 5, word: 'сегодня', translate: 'today'},
    {id: 6, word: 'завтра', translate: 'tomorrow'},
  ];
})

const words = computed(() => {
  return list.value.filter(w => !finishedWords.value.includes(w.id));
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

    if (!timerPaused.value) {
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

  setTimeout(() => {

    totalTimer.value = 0;

    otp.value?.reset();

    timerPaused.value = false;

  }, 2000);

}

const answer = ref('');

const otp = ref(null);

</script>

<template>
  <v-responsive class="border rounded" max-height="300">
    <v-app>
      <v-app-bar title="Ежедневное задание"></v-app-bar>

      <v-navigation-drawer>
        <v-list>
          <v-list-item title="Navigation drawer"></v-list-item>
        </v-list>
        {{ results }}
      </v-navigation-drawer>

      <v-main>

        <v-container>

          <template v-if="wordsCount > 0">
            <h1>Осталось выполнить заданий: {{ wordsCount }}</h1>

            <IWord ref="otp" v-model="answer" :word="currentWord.word" :translate="currentWord.translate"
                   @finish="(res) => onFinish(currentWord.id, res)"></IWord>

            <v-progress-linear :buffer-value="wordTimer" :color="wordProgressColor"
                               :max="secOnWord*1000"></v-progress-linear>
          </template>
          <v-alert
            v-else
            text="Поздравляю, вы выполнили все задания, получайте свою награду"
            title="Задание выполнено"
            type="success"
          ></v-alert>

        </v-container>

      </v-main>
    </v-app>
  </v-responsive>
</template>


