<script setup lang="ts">

import {computed, type ComputedRef, onMounted, ref, watch} from "vue";
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/IWord.vue";
import type {VOtpInput} from 'vuetify/components'

// import random from "@/libs/random.ts";


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
  (e: 'finish', taskResult: Task[]): void
}

const props = defineProps<Props>();

const emits = defineEmits<Emits>();

const wordCompleteSuccessfully = ref(false);

const pauseOnWordsChangeSec = 3;

const intervalTimer = ref();

const timerStep = 100;

const timerPaused = ref(false);

const wordTimer = ref(0);

const secOnWord = ref(100);

const currentWordIndex = ref(0);

const answer = ref('');

const otp = ref<VOtpInput | null>(null);

const maxHintsOnWord = 2;

const sleep = (pauseSec: number) => {
  return new Promise((resolve) => setTimeout(resolve, pauseSec * 1000));
}

const changeWordPause = async (pauseSec: number) => {

  timerPaused.value = true;

  wordCompleteSuccessfully.value = true;

  await sleep(pauseSec);

  wordCompleteSuccessfully.value = false;

  timerPaused.value = false;

}

const ruUncompletedWords = computed(() => {
  const ruTask = tasks.value.find(t => t.lang === 'ru');

  if (ruTask) {
    return ruTask.list.length - ruTask.results.filter(r => r.isOk).length;
  }

  return null;
})

const enUncompletedWords = computed(() => {
  const enTask = tasks.value.find(t => t.lang === 'en');

  if (enTask) {
    return enTask.list.length - enTask.results.filter(r => r.isOk).length;
  }

  return null;
})

const onFinish = async (wordId: number, result: WordResult) => {

  const word = words.value.find(w => w.id === wordId);

  if (word) {
    const res = getWordResult(word.id);

    if (result.isOk) {

      await changeWordPause(pauseOnWordsChangeSec);

      wordTimer.value = 0;

      answer.value = ''

      if (res) {
        res.retries += 1;
        res.isOk = result.isOk;
        res.variants.push(result.answer);

      }

      await createWordResult({
        id: wordId,
        retries: 1,
        isOk: result.isOk,
        variants: [result.answer]
      });


      if (lang.value === 'ru' && ruUncompletedWords.value && ruUncompletedWords.value > 0) {

        startNewWord();
        return;

      }

      if (lang.value === 'en' && enUncompletedWords.value && enUncompletedWords.value > 0) {

        startNewWord();
        return;

      }

      if (ruUncompletedWords.value === 0 && enUncompletedWords.value === 0) {
        emits('finish', tasks.value);
        return;
      }

    }

  }
}

const getNextWordIndex = (exclude?: number) => {

  return (wordsCount.value - 1) > (currentWordIndex.value + 1) ? currentWordIndex.value + 1 : 0;

  // console.log('currentWord', currentWord.value)
  // console.log('exclude', exclude)
  // console.log('wordsCount', wordsCount.value)
  // console.log('words.length', words.value.length)
  //
  // const nextIndex = wordsCount.value < 2 ? 0 : random(0, wordsCount.value - 1, exclude);
  //
  // console.log('nextIndex', nextIndex, words.value[nextIndex])
  //
  // return nextIndex;
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
    return tasks.value.find(t => t.lang === lang.value)?.results || [];
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

const isTimeout = computed(() => wordTimer.value >= secOnWord.value * 1000)

const currentWord = computed(() => {
  return words.value[currentWordIndex.value];
})

const taskTitle = computed(() => {
  return `Осталось слов: ${wordsCount.value} из ${currentLangList.value.length}`
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
  startNewWord(0);

  startTimer()
});

watch(isTimeout, (isTimedOut) => {

  if (isTimedOut) {
    startNewWord();
  }

});

const startNewWord = (exclude?: number) => {

  if (words.value.length > 0) {

    currentWordIndex.value = getNextWordIndex(exclude);

    wordCompleteSuccessfully.value = false;

    startTimer();

    answer.value = '';

    // otp.value?.reset();
    otp.value?.focus();

  }

}

const progressValue = computed(() => wordTimer.value);


const skipWord = async () => {
  const res = getWordResult(currentWord.value.id);

  if (res) {
    res.skipTimes += 1;
  } else {
    await createWordResult({
      id: currentWord.value.id,
      skipTimes: 1
    });
  }

  startNewWord(currentWordIndex.value);
}

const isSkipAvailable = computed(() => {
  if (isWordCompleted.value) {
    return false;
  }

  if (wordsCount.value === 1) {
    return false;
  }

  return true;
})

const getWordResult = (id: number) => {
  return currentLangResults.value.find(r => r.id === id);
}

const getHint = async () => {

  if (isHintsAvailable.value) {

    const res = getWordResult(currentWord.value.id);

    if (res) {
      res.hintTimes += 1;

    } else {
      await createWordResult({
        id: currentWord.value.id,
        hintTimes: 1,
      });
    }

    if (wrongAnswerPos.value === null || !wrongAnswerPos.value) {
      answer.value = answer.value + currentWord.value.translate[answer.value.length].toUpperCase()
    } else {
      answer.value = answer.value.substring(0, wrongAnswerPos.value) + currentWord.value.translate[wrongAnswerPos.value].toUpperCase()
    }

    otp.value?.focus();

  }

}

const currentWordResult = computed(() => {
  return currentLangResults.value.find(r => r.id === currentWord.value.id)
})

const isHintsAvailable = computed(() => {
  if (!currentWord.value) {
    return false;
  }

  if (answer.value.length === currentWord.value.translate.length - 1) {
    return false;
  }

  if (currentWordResult.value) {
    return (currentWordResult.value?.hintTimes || 0) < maxHintsOnWord;
  }

  if (wordCompleteSuccessfully.value) {
    return false;
  }

  return true;

})

const isPauseAvailable = computed(() => {

  if (wordCompleteSuccessfully.value) {
    return false;
  }

  return true;

})

const countHintsOnCurrentWord = computed(() => {
  return currentWordResult.value?.hintTimes || 0;
});

const countErrorsOnCurrentWord = computed(() => {
  const variants = (currentWordResult.value?.variants || []).length;

  if (variants > 1) {
    return variants - 1;
  }

  return 0;
});

const wrongAnswerPos = computed(() => {
  if (answer.value.length === 0) {
    return null;
  }

  if (currentWord.value.translate.substring(0, answer.value.length).toLowerCase() === answer.value.toLowerCase()) {
    return null;
  }

  for (let i = 1; i < answer.value.length + 1; i++) {
    if (currentWord.value.translate.substring(0, i).toLowerCase() !== answer.value.substring(0, i).toLowerCase()) {
      return i - 1;
    }
  }

})

const isWordCompleted = computed(() => {
  if (currentWord.value) {

    return answer.value.length === currentWord.value.translate.length && wrongAnswerPos.value === null

  }

  return false;
})

const otpColor = computed(() => {
  if (wrongAnswerPos.value !== null) {
    return 'error';
  }

  if (isWordCompleted.value) {
    return 'success';
  }

})

const createWordResult = async (result: CreateWordResult) => {

  const results = tasks.value.find(t => t.lang === lang.value)?.results;

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
  lang.value = 'en';
}
const selectRussian = () => {
  lang.value = 'ru';
}

const completeBoxData: ComputedRef<{ text: string, title: string, type: 'warning' | 'success' }> = computed(() => {

  if (countHintsOnCurrentWord.value + countErrorsOnCurrentWord.value > 0) {
    return {
      text: 'Замечательно!',
      title: `Хорошая работа! Перевод слова ${currentWord.value.word} - ${currentWord.value.translate}`,
      type: 'warning'
    };
  }

  return {
    text: 'Отлично!',
    title: `Вы отлично справились! Перевод слова ${currentWord.value.word} - ${currentWord.value.translate}`,
    type: 'success'
  };

});

const showCompleteBox = computed(() => wordCompleteSuccessfully.value);

const pauseText = computed(() => lang.value === 'ru' ? 'Похоже, время сделать паузу' : 'Let\'s get a pause');

const isShownPause = computed(() => {
  return timerPaused.value === true && isWordCompleted.value === false
})

const isTasksUncompletedTotally = computed(() => {
  if (enUncompletedWords.value !== null && enUncompletedWords.value > 0) {
    return false;
  }

  if (ruUncompletedWords.value !== null && ruUncompletedWords.value > 0) {
    return false;
  }

  return true;
})

</script>

<template>

  <template
    v-if="!isTasksUncompletedTotally">

    <template v-if="wordsCount > 0">
      <!--
      wordsCount={{ wordsCount }}
      wordTimer={{ wordTimer }}
      currentWord={{ currentWord }} | {{ JSON.stringify(currentWord) }}
      -->
      <v-card>

        <template #title>
          <div class="text-center">
            {{taskTitle}}
          </div>

        </template>

        <v-card-text>

          <template v-if="isShownPause">

            <div class="text-h4 text-green-darken-2">{{ pauseText }}

              <v-btn
                class="ma-2"
                color="green-darken-2"
                icon="mdi-cat"
                variant="text"
              ></v-btn>
            </div>

          </template>

          <template v-else>

            <IWord v-if="currentWord"
                   ref="otp"
                   v-model="answer"
                   :word="currentWord.word"
                   :translate="currentWord.translate"
                   :disabled="timerPaused"
                   :color="otpColor"
                   @finish="(res: WordResult) => onFinish(currentWord.id, res)"
            >
              <template #header>
                <v-row>
                  <v-col cols="1">
                    <v-btn icon="mdi-skip-forward"
                           :disabled="!isSkipAvailable"
                           color="primary"
                           title="Пропустить"
                           flat
                           rounded="sm"
                           @click="skipWord">
                    </v-btn>

                  </v-col>
                  <v-col>
                    <v-progress-linear v-if="!showCompleteBox"
                                       :buffer-value="progressValue"
                                       :color="wordProgressColor"
                                       :max="secOnWord*1000"
                                       :height="52"
                                       rounded="sm"
                    >
                      напишите перевод слова
                    </v-progress-linear>
                  </v-col>
                  <v-col cols="1" class="text-right">
                    <v-btn :icon="playPauseIcon"
                           :disabled="!isPauseAvailable"
                           color="warning"
                           :title="isPaused ? 'Дальше' : 'Пауза'"
                           flat
                           rounded="sm"
                           @click="playPause">
                    </v-btn>

                  </v-col>
                </v-row>

              </template>
            </IWord>
          </template>

        </v-card-text>

        <v-card-text>

          <v-alert
            v-if="showCompleteBox"
            v-bind="completeBoxData"
            variant="text"
          ></v-alert>

        </v-card-text>
        <v-card-actions>
          <v-row>
            <v-col>
              <v-btn class="d-none d-sm-block" :disabled="!isSkipAvailable" color="primary" @click="skipWord">
                Пропустить
              </v-btn>

              <v-btn class="d-xs-block d-sm-none"
                     icon="mdi-skip-forward"
                     :disabled="!isSkipAvailable"
                     color="primary"
                     title="Пропустить"
                     flat
                     rounded="sm"
                     @click="skipWord">
              </v-btn>
            </v-col>

            <v-col class="text-center">

              <v-btn class="d-none d-sm-inline" :disabled="!isPauseAvailable" @click="playPause">
                {{ isPaused ? 'Дальше' : 'Пауза' }}
              </v-btn>

              <v-btn class="d-xs-block d-sm-none"
                     :icon="playPauseIcon"
                     :disabled="!isPauseAvailable"
                     color="warning"
                     :title="isPaused ? 'Дальше' : 'Пауза'"
                     flat
                     rounded="sm"
                     @click="playPause">
              </v-btn>


            </v-col>

            <v-col class="text-right">

              <v-btn class="d-none d-sm-inline" :disabled="!isSkipAvailable" color="warning" @click="getHint">
                Подсказка
              </v-btn>

              <v-btn class="d-xs-block d-sm-none"
                     icon="mdi-help"
                     :disabled="!isHintsAvailable"
                     color="warning"
                     title="Подсказка"
                     flat
                     rounded="sm"
                     @click="getHint">
              </v-btn>

            </v-col>

          </v-row>
        </v-card-actions>
      </v-card>

    </template>

    <template v-else>

      <v-card v-if="!!enUncompletedWords && enUncompletedWords > 0 && !!ruUncompletedWords && ruUncompletedWords > 0"
              title="Выберем язык"
              subtitle="Выберите язык для повторения"
              text="На выбранном языке нужно будет писать перевод заданных слов">
        <v-card-actions>
          <v-btn :disabled="enUncompletedWords === 0" @click="selectEnglish" color="error">English</v-btn>
          <v-btn :disabled="ruUncompletedWords === 0" @click="selectRussian" color="primary">Русский</v-btn>
        </v-card-actions>
      </v-card>

      <v-card v-else-if="!!enUncompletedWords && enUncompletedWords > 0 && ruUncompletedWords === 0"
              title="А теперь давайте по английски"
              subtitle="Я буду писать слова по-русски"
              text="Вам предстоит писать перевод русских слов по-английски">
        <v-card-actions>
          <v-btn @click="selectEnglish" color="error">Поехали!</v-btn>
        </v-card-actions>
      </v-card>

      <v-card v-else
              title="А теперь давайте по-русски"
              subtitle="Я буду писать слова по-английски"
              text="Вам предстоит писать перевод английских слов по-русски">
        <v-card-actions>
          <v-btn @click="selectRussian" color="primary">Поехали!</v-btn>
        </v-card-actions>
      </v-card>

    </template>

  </template>

  <v-alert
    v-else
    text="На сегодня все задания выполнены"
    title="Нет заданий"
    type="info"
  ></v-alert>

</template>

<style scoped>

</style>
