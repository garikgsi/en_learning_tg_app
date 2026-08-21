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
  TranslationLanguage,
  TranslationTask,
  WordMistake,
  WordResult,
  WordStatistics,
} from '@/types/translation';
import {useTranslateStore} from "@/stores/translateStore";
import {useDictionaryStore} from '@/stores/dictionaryStore';
import {MAX_HINTS_ON_WORD} from '@/libs/exerciseRules';
import pause from '@/libs/pause';
import {useKeyNormalizer} from '@/use/keyNormalizer';

type Emits = {
  (e: 'finish', taskResult: TranslationTask[]): void
}

const emits = defineEmits<Emits>();
const {wordList, reversedWordList} = storeToRefs(useTranslateStore());
const dictionaryStore = useDictionaryStore();
const {isAnswerLetterCorrect, normalizeAnswer} = useKeyNormalizer();

const wordCompleteSuccessfully = ref(false);

const pauseOnWordsChangeSec = 1;
const skippedWordDisplayMs = 5000;

const intervalTimer = ref();

const timerStep = 100;

const timerPaused = ref(false);

const wordTimer = ref(0);

const secOnWord = ref(100);

const currentWordIndex = ref(0);
const currentWordId = ref<number | null>(null);

const answer = ref('');
const isChangingWord = ref(false);
const isShowingSkippedWord = ref(false);
const wordInstanceKey = ref(0);
const errorsOnCurrentAttempt = ref(0);
const hintUsageByWord = ref<Record<number, number>>({});
const visitedWordIdsInCycle = ref<Set<number>>(new Set());

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

const russianRemainingWordCount = computed(() => {
  const russianTask = tasks.value.find(task => task.lang === 'ru');

  if (russianTask) {
    return russianTask.list.length
      - russianTask.results.filter(result => result.isOk).length;
  }

  return null;
})

const englishRemainingWordCount = computed(() => {
  const englishTask = tasks.value.find(task => task.lang === 'en');

  if (englishTask) {
    return englishTask.list.length
      - englishTask.results.filter(result => result.isOk).length;
  }

  return null;
})

const onFinish = async (wordId: number, result: WordResult) => {
  if (isChangingWord.value) {
    return;
  }

  const word = remainingWords.value.find(item => item.id === wordId);

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

      if (currentLanguage.value === 'ru' && russianRemainingWordCount.value !== null && russianRemainingWordCount.value > 0) {

        await startNewWord();
        return;

      }

      if (currentLanguage.value === 'en' && englishRemainingWordCount.value !== null && englishRemainingWordCount.value > 0) {

        await startNewWord();
        return;

      }

      if (russianRemainingWordCount.value === 0 && englishRemainingWordCount.value === 0) {
        emits('finish', tasks.value);
        return;
      }

      if (
        currentLanguage.value === 'ru'
        && russianRemainingWordCount.value === 0
        && englishRemainingWordCount.value !== null
        && englishRemainingWordCount.value > 0
      ) {
        waitForLanguageSelection();
        return;
      }

      if (
        currentLanguage.value === 'en'
        && englishRemainingWordCount.value === 0
        && russianRemainingWordCount.value !== null
        && russianRemainingWordCount.value > 0
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
    return currentIndex + 1 < remainingWordsCount.value ? currentIndex + 1 : 0;
  }

  return Math.min(currentIndex, remainingWordsCount.value - 1);

}

const russianResults = ref<WordStatistics[]>([]);
const englishResults = ref<WordStatistics[]>([]);

const currentLanguage = ref<TranslationLanguage>();

const tasks = computed<TranslationTask[]>(() => {
  return [
    {lang: 'ru', list: reversedWordList.value, results: russianResults.value},
    {lang: 'en', list: wordList.value, results: englishResults.value},
  ];
});

const currentResults = computed<WordStatistics[]>(() => {
  if (currentLanguage.value && tasks.value) {
    return tasks.value.find(
      task => task.lang === currentLanguage.value,
    )?.results || [];
  }

  return [];
})

const finishedWords = computed(() => {
  return currentResults.value
    .filter(result => result.isOk)
    .map(result => result.id);
});

const currentWordList = computed(() => {
  return tasks.value.find(
    task => task.lang === currentLanguage.value,
  )?.list || [];
});

const remainingWords = computed(() => {
  return currentWordList.value.filter(word => {
    return !finishedWords.value.includes(word.id);
  });
});

const remainingWordsCount = computed(() => {
  return remainingWords.value.length;
})

const timerDurationMs = computed(() => {
  return isShowingSkippedWord.value
    ? skippedWordDisplayMs
    : secOnWord.value * 1000;
});

const isTimeout = computed(() => {
  return !isShowingSkippedWord.value
    && wordTimer.value >= timerDurationMs.value;
});

const currentWord = computed(() => {
  if (currentWordId.value !== null) {
    const selectedWord = remainingWords.value.find(
      word => word.id === currentWordId.value,
    );

    if (selectedWord) {
      return selectedWord;
    }
  }

  return remainingWords.value[currentWordIndex.value];
})

const taskTitle = computed(() => {
  return `Осталось слов: ${remainingWordsCount.value} из ${currentWordList.value.length}`
})

const wordProgressColor = computed(() => {
  const progress = wordTimer.value / timerDurationMs.value;

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

    if (!timerPaused.value && remainingWordsCount.value > 0) {
      wordTimer.value = wordTimer.value + timerStep;
    }

  }, timerStep);

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

  if (remainingWords.value.length > 0) {
    const isCycleComplete = remainingWords.value.every(word => {
      return visitedWordIdsInCycle.value.has(word.id);
    });

    if (isCycleComplete) {
      hintUsageByWord.value = {};
      visitedWordIdsInCycle.value = new Set();
    }

    currentWordIndex.value = getNextWordIndex(exclude);
    currentWordId.value = remainingWords.value[currentWordIndex.value]?.id ?? null;

    if (currentWordId.value !== null) {
      visitedWordIdsInCycle.value.add(currentWordId.value);
    }

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
  currentLanguage.value = undefined;
  currentWordIndex.value = -1;
  currentWordId.value = null;
  answer.value = '';
  isChangingWord.value = false;
}

const progressValue = computed(() => wordTimer.value);
const timerText = computed(() => {
  return isShowingSkippedWord.value
    ? 'Запомните перевод слова'
    : 'Напишите перевод слова';
});


const skipWord = async () => {
  if (!currentWord.value || !currentLanguage.value || isChangingWord.value) {
    return;
  }

  isChangingWord.value = true;
  isShowingSkippedWord.value = true;
  timerPaused.value = false;
  wordTimer.value = 0;

  const skippedWordIndex = currentWordIndex.value;
  const res = getOrCreateWordResult(currentWord.value.id);

  res.skipTimes += 1;
  hintUsageByWord.value[currentWord.value.id] = 0;

  answer.value = normalizeAnswer(
    currentWord.value.translate,
    currentWord.value.checkWord,
    currentLanguage.value,
  );

  try {
    await pause(skippedWordDisplayMs);
    isShowingSkippedWord.value = false;
    timerPaused.value = false;
    await startNewWord(skippedWordIndex);
  } finally {
    isShowingSkippedWord.value = false;
    timerPaused.value = false;
    isChangingWord.value = false;
  }

}

const isSkipAvailable = computed(() => {
  if (isChangingWord.value || isShowingSkippedWord.value) {
    return false;
  }

  if (isWordCompleted.value) {
    return false;
  }

  if (remainingWordsCount.value === 1) {
    return false;
  }

  return true;
})

const getWordResult = (id: number) => {
  return currentResults.value.find(result => result.id === id);
}

const getOrCreateWordResult = (id: number): WordStatistics => {
  const existingResult = getWordResult(id);

  if (existingResult) {
    return existingResult;
  }

  const result: WordStatistics = {
    id,
    retries: 0,
    isOk: false,
    variants: [],
    skipTimes: 0,
    hintTimes: 0,
    errorTimes: 0,
  };

  currentResults.value.push(result);

  return currentResults.value[currentResults.value.length - 1];
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
    hintUsageByWord.value[currentWord.value.id]
      = (hintUsageByWord.value[currentWord.value.id] ?? 0) + 1;

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
  return currentResults.value.find(result => result.id === currentWord.value.id)
})

const isHintsAvailable = computed(() => {
  if (
    !currentWord.value
    || isShowingSkippedWord.value
    || isChangingWord.value
  ) {
    return false;
  }

  if (wordCompleteSuccessfully.value) {
    return false;
  }

  return (hintUsageByWord.value[currentWord.value.id] ?? 0)
    < MAX_HINTS_ON_WORD;

})

const isAudioAvailable = computed(() => {
  return currentWord.value !== undefined
    && !wordCompleteSuccessfully.value
    && !isShowingSkippedWord.value
    && !isChangingWord.value;
});

const playCurrentWordAudio = async (): Promise<void> => {
  if (!isAudioAvailable.value || !currentWord.value) {
    return;
  }

  await dictionaryStore.playWordAudio(currentWord.value.wordId);
};

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

  if (!currentLanguage.value || !currentWord.value) {
    return null;
  }

  for (const [index, letter] of Array.from(answer.value).entries()) {
    if (!isAnswerLetterCorrect(
      letter,
      currentWord.value.checkWord[index] ?? '',
      currentLanguage.value,
    )) {
      return index;
    }
  }

  return null;
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

const selectLanguage = async (selectedLanguage: TranslationLanguage) => {
  currentLanguage.value = selectedLanguage;
  currentWordIndex.value = -1;
  currentWordId.value = null;
  hintUsageByWord.value = {};
  visitedWordIdsInCycle.value = new Set();

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

const areAllTasksCompleted = computed(() => {
  if (englishRemainingWordCount.value !== null && englishRemainingWordCount.value > 0) {
    return false;
  }

  if (russianRemainingWordCount.value !== null && russianRemainingWordCount.value > 0) {
    return false;
  }

  return true;
})

</script>

<template>

  <template
    v-if="!areAllTasksCompleted">

    <template v-if="remainingWordsCount > 0">

      <v-card>

        <template #title>
          <div class="task-title">
            <div class="task-title__text">
              <span class="d-none d-sm-inline">{{ taskTitle }}</span>
              <span class="d-sm-none">
                Слов: {{ remainingWordsCount }}/{{ currentWordList.length }}
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

          <IWord v-if="currentWord"
                   :key="`${currentLanguage}-${currentWord.id}-${currentWord.checkWord}-${wordInstanceKey}`"
                   ref="otp"
                   :model-value="answer"
                   :word="currentWord.word"
                   :translate="currentWord.checkWord"
                   :other-words="currentWord.otherCheckWords"
                   :lang="currentLanguage"
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
                    <v-btn icon="mdi-debug-step-over"
                           :disabled="!isSkipAvailable"
                           color="primary"
                           title="Пропустить"
                           rounded="sm"
                           @click="skipWord">
                    </v-btn>

                  </div>
                  <v-sheet class="ma-1 flex-grow-1 flex-shrink-0">
                    <div
                      v-if="!showCompleteBox"
                      :aria-label="timerText"
                      class="word-timer"
                    >
                      <v-progress-linear
                        :buffer-value="progressValue"
                        :color="wordProgressColor"
                        :max="timerDurationMs"
                        :height="48"
                        rounded="sm"
                      ></v-progress-linear>
                      <span class="word-timer__label">{{ timerText }}</span>
                    </div>
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
                     icon="mdi-debug-step-over"
                     :disabled="!isSkipAvailable"
                     color="primary"
                     title="Пропустить"
                     rounded="sm"
                     @click="skipWord">
              </v-btn>
            </v-col>

            <v-col class="text-center">

              <v-btn
                class="d-none d-sm-inline"
                :disabled="!isAudioAvailable"
                :loading="dictionaryStore.audioLoadingWordId === currentWord?.wordId"
                prepend-icon="mdi-play"
                @click="playCurrentWordAudio"
              >
                Озвучить
              </v-btn>

              <v-btn class="d-xs-block d-sm-none"
                     icon="mdi-play"
                     :disabled="!isAudioAvailable"
                     :loading="dictionaryStore.audioLoadingWordId === currentWord?.wordId"
                     color="warning"
                     title="Озвучить английское слово"
                     rounded="sm"
                     @click="playCurrentWordAudio">
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

      <v-card v-if="!!englishRemainingWordCount && englishRemainingWordCount > 0 && !!russianRemainingWordCount && russianRemainingWordCount > 0"
              title="Выберем язык"
              subtitle="Выберите язык для повторения"
              text="На выбранном языке нужно будет писать перевод заданных слов">
        <v-card-actions>
          <v-btn :disabled="englishRemainingWordCount === 0" @click="selectEnglish" color="error">English</v-btn>
          <v-btn :disabled="russianRemainingWordCount === 0" @click="selectRussian" color="primary">Русский</v-btn>
        </v-card-actions>
      </v-card>

      <v-card v-else-if="!!englishRemainingWordCount && englishRemainingWordCount > 0 && russianRemainingWordCount === 0"
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

.word-timer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.word-timer :deep(.v-progress-linear) {
  position: absolute;
  inset: 0;
}

.word-timer__label {
  position: relative;
  z-index: 1;
  padding: 0 8px;
  text-align: center;
  pointer-events: none;
}

</style>
