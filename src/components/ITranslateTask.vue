<script setup lang="ts">

import {
  computed,
  type ComputedRef,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {storeToRefs} from "pinia";
import IWord from "@/components/IWord.vue";
import type {
  WordMistake,
  WordResult,
} from "@/components/IWord.vue";
import type {Word} from "@/stores/translateStore";
import {useTranslateStore} from "@/stores/translateStore";
import {MAX_HINTS_ON_WORD} from '@/libs/exerciseRules';
import pause from '@/libs/pause';
import {useKeyNormalizer} from '@/use/keyNormalizer';

export type WordStat = {
  id: number,
  retries: number,
  isOk: boolean,
  variants: string[],
  skipTimes: number,
  hintTimes: number,
  errorTimes: number
}

export type Lang = 'en' | 'ru';

export type Task = {
  lang: Lang,
  list: Word[],
  results: WordStat[]
}

type Emits = {
  (e: 'finish', taskResult: Task[]): void
}

const emits = defineEmits<Emits>();
const {enList, ruList} = storeToRefs(useTranslateStore());
const {normalizeAnswer} = useKeyNormalizer();

const wordCompleteSuccessfully = ref(false);

const pauseOnWordsChangeSec = 1;

const intervalTimer = ref();

const timerStep = 100;

const timerPaused = ref(false);
const isUserPaused = ref(false);

const wordTimer = ref(0);

const secOnWord = ref(100);

const currentWordIndex = ref(0);
const currentWordId = ref<number | null>(null);

const answer = ref('');
const isChangingWord = ref(false);
const isShowingSkippedWord = ref(false);
const wordInstanceKey = ref(0);
const errorsOnCurrentAttempt = ref(0);

const otp = ref<InstanceType<typeof IWord> | null>(null);

const sleep = (pauseSec: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, pauseSec * 1000);
  });
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
  if (isChangingWord.value) {
    return;
  }

  const word = words.value.find(w => w.id === wordId);

  if (word) {
    const res = getOrCreateWordResult(word.id);

    if (result.isOk) {
      isChangingWord.value = true;
      const shouldRepeatWord = errorsOnCurrentAttempt.value
        > word.checkWord.length / 2;

      await changeWordPause(pauseOnWordsChangeSec);

      wordTimer.value = 0;

      answer.value = ''

      res.retries += 1;
      res.isOk = !shouldRepeatWord;

      if (shouldRepeatWord) {
        await startNewWord(currentWordIndex.value);
        return;
      }

      currentWordId.value = null;

      if (lang.value === 'ru' && ruUncompletedWords.value !== null && ruUncompletedWords.value > 0) {

        await startNewWord();
        return;

      }

      if (lang.value === 'en' && enUncompletedWords.value !== null && enUncompletedWords.value > 0) {

        await startNewWord();
        return;

      }

      if (ruUncompletedWords.value === 0 && enUncompletedWords.value === 0) {
        emits('finish', tasks.value);
        return;
      }

      if (
        lang.value === 'ru'
        && ruUncompletedWords.value === 0
        && enUncompletedWords.value !== null
        && enUncompletedWords.value > 0
      ) {
        waitForLanguageSelection();
        return;
      }

      if (
        lang.value === 'en'
        && enUncompletedWords.value === 0
        && ruUncompletedWords.value !== null
        && ruUncompletedWords.value > 0
      ) {
        waitForLanguageSelection();
        return;
      }

    }

  }
}

const getNextWordIndex = (exclude?: number) => {
  const currentIndex = Math.max(currentWordIndex.value, 0);

  if (exclude !== undefined || currentWordId.value !== null) {
    return currentIndex + 1 < wordsCount.value ? currentIndex + 1 : 0;
  }

  return Math.min(currentIndex, wordsCount.value - 1);

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
    {lang: 'ru', list: ruList.value, results: ruResults.value},
    {lang: 'en', list: enList.value, results: enResults.value},
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
  if (currentWordId.value !== null) {
    const selectedWord = words.value.find(
      word => word.id === currentWordId.value,
    );

    if (selectedWord) {
      return selectedWord;
    }
  }

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

const isPaused = computed(() => isUserPaused.value);

const playPauseIcon = computed(() => isPaused.value ? 'mdi-play' : 'mdi-pause');

const playPause = () => {
  isUserPaused.value = !isUserPaused.value;
  timerPaused.value = isUserPaused.value;
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

const startNewWord = async (exclude?: number) => {
  isChangingWord.value = true;
  wordInstanceKey.value += 1;
  answer.value = '';
  errorsOnCurrentAttempt.value = 0;

  if (words.value.length > 0) {

    currentWordIndex.value = getNextWordIndex(exclude);
    currentWordId.value = words.value[currentWordIndex.value]?.id ?? null;

    wordCompleteSuccessfully.value = false;

    startTimer();

    // otp.value?.reset();
    await nextTick();
    isChangingWord.value = false;
    await nextTick();
    await otp.value?.focus(0);

  }

}

const updateAnswer = (value: string): void => {
  if (!isChangingWord.value) {
    answer.value = value;
  }
}

const waitForLanguageSelection = (): void => {
  lang.value = undefined;
  currentWordIndex.value = -1;
  currentWordId.value = null;
  answer.value = '';
  isChangingWord.value = false;
}

const progressValue = computed(() => wordTimer.value);


const skipWord = async () => {
  if (!currentWord.value || !lang.value || isChangingWord.value) {
    return;
  }

  isChangingWord.value = true;
  isShowingSkippedWord.value = true;
  timerPaused.value = true;

  const skippedWordIndex = currentWordIndex.value;
  const res = getOrCreateWordResult(currentWord.value.id);

  res.skipTimes += 1;

  answer.value = normalizeAnswer(
    currentWord.value.translate,
    currentWord.value.checkWord,
    lang.value,
  );

  try {
    await pause(5000);
    isShowingSkippedWord.value = false;
    timerPaused.value = isUserPaused.value;
    await startNewWord(skippedWordIndex);
  } finally {
    isShowingSkippedWord.value = false;
    timerPaused.value = isUserPaused.value;
    isChangingWord.value = false;
  }

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

const getOrCreateWordResult = (id: number): WordStat => {
  const existingResult = getWordResult(id);

  if (existingResult) {
    return existingResult;
  }

  const result: WordStat = {
    id,
    retries: 0,
    isOk: false,
    variants: [],
    skipTimes: 0,
    hintTimes: 0,
    errorTimes: 0,
  };

  currentLangResults.value.push(result);

  return currentLangResults.value[currentLangResults.value.length - 1];
}

const addMistakes = async (mistake: WordMistake) => {
  const res = getOrCreateWordResult(currentWord.value.id);
  const enteredLettersCount = Array.from(
    mistake.answer.replace(/\s/g, ''),
  ).length;
  const shouldSaveVariant = mistake.answer.length > 0
    && enteredLettersCount >= MAX_HINTS_ON_WORD;

  errorsOnCurrentAttempt.value += mistake.count;
  res.errorTimes += mistake.count;

  if (
    shouldSaveVariant
    && !res.variants.includes(mistake.answer)
  ) {
    res.variants.push(mistake.answer);
  }
}

const getHint = async () => {

  if (isHintsAvailable.value) {

    const res = getOrCreateWordResult(currentWord.value.id);
    res.hintTimes += 1;

    if (wrongAnswerPos.value === null || wrongAnswerPos.value === undefined) {
      answer.value = answer.value
        + currentWord.value.checkWord[answer.value.length].toUpperCase()
    } else {
      answer.value = answer.value.substring(0, wrongAnswerPos.value)
        + currentWord.value.checkWord[wrongAnswerPos.value].toUpperCase()
    }

    otp.value?.focus(answer.value.length);

  }

}

const currentWordResult = computed(() => {
  return currentLangResults.value.find(r => r.id === currentWord.value.id)
})

const isHintsAvailable = computed(() => {
  if (!currentWord.value) {
    return false;
  }

  if (currentWordResult.value) {
    return (currentWordResult.value?.hintTimes || 0) < MAX_HINTS_ON_WORD;
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
  return currentWordResult.value?.errorTimes || 0;
});

onBeforeUnmount(() => {
  clearInterval(intervalTimer.value);
});

const countErrorsOnExercise = computed(() => {
  return tasks.value.reduce((total, task) => {
    return total + task.results.reduce((taskTotal, result) => {
      return taskTotal + result.errorTimes;
    }, 0);
  }, 0);
});

const wrongAnswerPos = computed(() => {
  if (answer.value.length === 0) {
    return null;
  }

  if (currentWord.value.checkWord.substring(0, answer.value.length).toLowerCase() === answer.value.toLowerCase()) {
    return null;
  }

  for (let i = 1; i < answer.value.length + 1; i++) {
    if (currentWord.value.checkWord.substring(0, i).toLowerCase() !== answer.value.substring(0, i).toLowerCase()) {
      return i - 1;
    }
  }

})

const isWordCompleted = computed(() => {
  if (currentWord.value) {

    return answer.value.length === currentWord.value.checkWord.length
      && wrongAnswerPos.value === null

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

const selectLanguage = async (selectedLanguage: Lang) => {
  lang.value = selectedLanguage;
  currentWordIndex.value = -1;
  currentWordId.value = null;

  await nextTick();
  await startNewWord();
}

const selectEnglish = async () => {
  await selectLanguage('en');
}

const selectRussian = async () => {
  await selectLanguage('ru');
}

const completeBoxData: ComputedRef<{ title: string, type: 'warning' | 'success', icon: string }> = computed(() => {

  if (countHintsOnCurrentWord.value + countErrorsOnCurrentWord.value > 0) {
    return {
      title: `Хорошая работа!`,
      type: 'warning',
      icon: 'mdi-thumb-up'
    };
  }

  return {
    title: `Вы отлично справились!`,
    type: 'success',
    icon: 'mdi-thumb-up'
  };

});

const showCompleteBox = computed(() => wordCompleteSuccessfully.value);

const pauseText = computed(() => lang.value === 'ru' ? 'Похоже, время сделать паузу' : 'Let\'s get a pause');

const isShownPause = computed(() => {
  return isUserPaused.value;
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

      <v-card>

        <template #title>
          <div class="task-title">
            <div class="task-title__text">
              <span class="d-none d-sm-inline">{{ taskTitle }}</span>
              <span class="d-sm-none">
                Слов: {{ wordsCount }}/{{ currentLangList.length }}
              </span>
            </div>

            <v-chip
              v-if="countErrorsOnExercise > 0"
              class="task-title__errors"
              color="error"
              prepend-icon="mdi-alert-circle-outline"
              size="small"
              variant="flat"
            >
              <span class="d-none d-sm-inline">Ошибок: </span>
              {{ countErrorsOnCurrentWord }}/{{ countErrorsOnExercise }}
            </v-chip>
          </div>

        </template>

        <v-card-text>

          <template v-if="isShownPause">

            <v-alert
              class="mt-4"
              icon="mdi-cat"
              color="success"
              :title="pauseText"
            ></v-alert>

          </template>

          <template v-else>

            <IWord v-if="currentWord"
                   :key="`${lang}-${currentWord.id}-${currentWord.checkWord}-${wordInstanceKey}`"
                   ref="otp"
                   :model-value="answer"
                   :word="currentWord.word"
                   :translate="currentWord.checkWord"
                   :other-words="currentWord.otherCheckWords"
                   :lang="lang"
                   :disabled="(timerPaused || isChangingWord) && !isShowingSkippedWord"
                   :readonly="isShowingSkippedWord"
                   :color="otpColor"
                   @update:model-value="updateAnswer"
                   @finish="(res: WordResult) => onFinish(currentWord.id, res)"
                   @mistake="addMistakes"
            >
              <template #header>
                <div class="d-flex justify-space-between">
                  <div class="ma-1 flex-grow-0 flex-shrink-0">
                    <v-btn icon="mdi-skip-forward"
                           :disabled="!isSkipAvailable"
                           color="primary"
                           title="Пропустить"
                           rounded="sm"
                           @click="skipWord">
                    </v-btn>

                  </div>
                  <v-sheet class="ma-1 flex-grow-1 flex-shrink-0">
                    <v-progress-linear v-if="!showCompleteBox"
                                       :buffer-value="progressValue"
                                       :color="wordProgressColor"
                                       :max="secOnWord*1000"
                                       :height="48"
                                       rounded="sm"
                    >
                      напишите перевод слова
                    </v-progress-linear>
                  </v-sheet>
                  <div class="ma-1 flex-grow-0 flex-shrink-1">
                    <v-btn icon="mdi-help"
                           :disabled="!isHintsAvailable"
                           color="warning"
                           title="Подсказка"
                           rounded="sm"
                           @click="getHint">
                    </v-btn>

                  </div>
                </div>

              </template>
            </IWord>
          </template>

        </v-card-text>

        <v-card-text>

          <v-alert
            v-if="showCompleteBox"
            v-bind="completeBoxData"
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
                     rounded="sm"
                     @click="playPause">
              </v-btn>


            </v-col>

            <v-col class="text-right">

              <v-btn class="d-none d-sm-inline" :disabled="!isHintsAvailable" color="warning" @click="getHint">
                Подсказка
              </v-btn>

              <v-btn class="d-xs-block d-sm-none"
                     icon="mdi-help"
                     :disabled="!isHintsAvailable"
                     color="warning"
                     title="Подсказка"
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

.task-title {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.task-title__text {
  grid-column: 2;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.task-title__errors {
  grid-column: 3;
  justify-self: end;
  flex-shrink: 0;
}

</style>
