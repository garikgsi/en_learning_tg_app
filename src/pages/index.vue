<script lang="ts" setup>

import {computed, ref, onMounted} from 'vue';
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/types/WordResult.ts";

const onFinish = (result: WordResult) => {

  if (result.isOk) {

    const word = words.value.find(w => w.translate === result.answer);

    if (word) {
      results.value.push({
        ...word, isOk: true
      });
    }

  }

  console.log('result', result)
}

const results = ref([]);

const words = computed(() => {
  return [
    {id: 1, word: 'птица', translate: 'bird'},
    {id: 2, word: 'кошка', translate: 'cat'},
    {id: 3, word: 'школа', translate: 'school'},
    {id: 4, word: 'дом', translate: 'home'},
    {id: 5, word: 'сегодня', translate: 'today'},
    {id: 5, word: 'сегодня', translate: 'today'},
  ]
});

const wordsCount = computed(() => {
  return words.value.length;
})

const totalTimer = ref(0);

const mSecOnWord = ref(5000);

const wordTimer = computed(() => {
  return totalTimer.value % mSecOnWord.value
});

const currentWord = computed(() => Math.floor(totalTimer.value / mSecOnWord.value))

const wordProgressColor = computed(() => {
  return 'success'
});

const timerStep = 100;

onMounted(() => {
  setInterval(()=> {
    totalTimer.value = totalTimer.value + timerStep;
  }, timerStep);
});

</script>

<template>
  <v-responsive class="border rounded" max-height="300">
    <v-app>
      <v-app-bar title="Ежедневное задание"></v-app-bar>

      <v-navigation-drawer>
        <v-list>
          <v-list-item title="Navigation drawer"></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-main>

        <v-container>
          <h1>Слово 1 из 5 | {{totalTimer}} | {{currentWord}}</h1>

<!--          {{totalTimer}}| {{wordTimer}}-->

          <IWord word="птица" translate="bird" @finish="onFinish"></IWord>

          <v-progress-linear :buffer-value="wordTimer" :color="wordProgressColor" :max="mSecOnWord"></v-progress-linear>

        </v-container>
      </v-main>
    </v-app>
  </v-responsive>
</template>


