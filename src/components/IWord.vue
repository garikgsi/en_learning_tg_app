<script setup lang="ts">

import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue';
import {Haptics} from '@capacitor/haptics';
import {vDisableOtpAutocomplete} from '@/directives/disableOtpAutocomplete';
import {getWrappedLineEndIndexes} from '@/libs/wrappedLines';
import {useKeyNormalizer} from '@/use/keyNormalizer';
import type {WordMistake, WordResult} from '@/types/translation';

interface Props {
  modelValue: string
  word: string
  translate: string
  lang?: 'en' | 'ru'
  otherWords?: string[]
  easyMode?: boolean
  disabled?: boolean
  readonly?: boolean
  color?: string
}

interface Emits {
  (e: 'finish', result: WordResult): void,

  (e: 'mistake', mistake: WordMistake): void,

  (e: 'update:model-value', modelValue: string): void
}

const props = withDefaults(defineProps<Props>(), {
  easyMode: true,
  disabled: false,
  readonly: false,
  color: 'answer',
  otherWords: () => [],
})

const {
  normalizeAnswer: normalizeKeyAnswer,
  normalizeLanguageText,
} = useKeyNormalizer();

const emits = defineEmits<Emits>()
const root = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const mistakeVibrationDurationMs = 300;

const vibrateOnMistake = (): void => {
  void Haptics.vibrate({
    duration: mistakeVibrationDurationMs,
  }).catch(() => {
    navigator.vibrate?.(mistakeVibrationDurationMs);
  });
};

const updateWrappedLineHyphens = (): void => {
  const wordInputs = root.value?.querySelectorAll<HTMLElement>('.word-otp');

  wordInputs?.forEach(wordInput => {
    const fields = Array.from(
      wordInput.querySelectorAll<HTMLElement>('.v-field'),
    );

    fields.forEach(field => field.classList.remove('word-line-end'));
    getWrappedLineEndIndexes(fields.map(field => field.offsetTop))
      .forEach(index => fields[index]?.classList.add('word-line-end'));
  });
};

const scheduleWrappedLineHyphensUpdate = (): void => {
  void nextTick(() => requestAnimationFrame(updateWrappedLineHyphens));
};

onMounted(() => {
  if (root.value) {
    resizeObserver = new ResizeObserver(scheduleWrappedLineHyphensUpdate);
    resizeObserver.observe(root.value);
  }

  scheduleWrappedLineHyphensUpdate();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

const answerLanguage = computed<'en' | 'ru'>(() => {
  return props.lang
    ?? (/[а-яё]/iu.test(props.translate) ? 'ru' : 'en');
});

const sourceLanguage = computed<'en' | 'ru'>(() => {
  return answerLanguage.value === 'ru' ? 'en' : 'ru';
});

const normalizedWord = computed(() => {
  return normalizeLanguageText(
    props.word,
    sourceLanguage.value,
  ).trim();
});

const normalizedTranslate = computed(() => {
  return normalizeLanguageText(
    props.translate,
    answerLanguage.value,
  ).trim();
});

const translateWords = computed(() => {
  return normalizedTranslate.value
    .split(/[\s-]+/)
    .filter(Boolean);
});

const translateSeparators = computed(() => {
  return normalizedTranslate.value.match(/[\s-]+/g) ?? [];
});

const wordStartIndexes = computed(() => {
  let startIndex = 0;

  return translateWords.value.map((word, index) => {
    const currentStartIndex = startIndex;
    startIndex += word.length + (translateSeparators.value[index]?.length ?? 0);

    return currentStartIndex;
  });
});

const toFieldIndex = (answerIndex: number) => {
  return Array.from(normalizedTranslate.value.slice(0, answerIndex))
    .filter(letter => !/[\s-]/.test(letter))
    .length;
}

const getField = (index: number) => {
  const fields = root.value?.querySelectorAll<HTMLInputElement>('.v-otp-input__field');
  const fieldIndex = Math.min(
    toFieldIndex(index),
    (fields?.length ?? 1) - 1,
  );

  return fields?.[fieldIndex];
}

const focus = async (index = 0) => {
  await nextTick();

  getField(index)?.focus();
}

const focusAndSelect = async (index: number) => {
  await nextTick();

  requestAnimationFrame(() => {
    const field = getField(index);

    field?.focus();
    field?.setSelectionRange(0, field.value.length);
  });
}

const normalizeAnswer = (value: string) => {
  return normalizeKeyAnswer(
    value,
    normalizedTranslate.value,
    answerLanguage.value,
  );
}

const getWrongAnswerIndex = (value: string) => {
  return Array.from(value).findIndex((letter, index) => {
    return letter.toLowerCase()
      !== normalizedTranslate.value[index]?.toLowerCase()
  })
}

const answer = computed({
  get: () => props.modelValue,
  set: (newValue) => {
    const normalizedAnswer = normalizeAnswer(newValue)
    const wrongAnswerIndex = getWrongAnswerIndex(normalizedAnswer)
    const sanitizedAnswer = wrongAnswerIndex >= 0
      ? normalizedAnswer.slice(0, wrongAnswerIndex + 1)
      : normalizedAnswer
    const mistakesCount = Array.from(normalizedAnswer).filter((letter, index) => {
      const isChanged = letter !== props.modelValue[index]
      const isWrong = letter.toLowerCase()
        !== normalizedTranslate.value[index]?.toLowerCase()

      return isChanged && isWrong
    }).length

    emits('update:model-value', sanitizedAnswer)

    if (mistakesCount > 0) {
      vibrateOnMistake();
      emits('mistake', {
        count: mistakesCount,
        answer: sanitizedAnswer,
      })
    }

    if (wrongAnswerIndex >= 0) {
      focusAndSelect(wrongAnswerIndex)
    }
  }
})

const getAnswerWords = (value = answer.value) => {
  return translateWords.value.map((word, index) => {
    const wordStartIndex = wordStartIndexes.value[index];

    return value.slice(
      wordStartIndex,
      wordStartIndex + word.length,
    );
  });
}

const getWordAnswer = (index: number) => {
  return getAnswerWords()[index];
}

const updateWordAnswer = (index: number, value: string) => {
  const words = getAnswerWords();
  words[index] = value;

  let lastEnteredWordIndex = -1;

  words.forEach((word, wordIndex) => {
    if (word.length > 0) {
      lastEnteredWordIndex = wordIndex;
    }
  });

  const isCurrentWordComplete = value.length === translateWords.value[index].length;
  let nextAnswer = '';

  for (let wordIndex = 0; wordIndex <= lastEnteredWordIndex; wordIndex++) {
    nextAnswer += words[wordIndex];

    const shouldAppendSeparator = wordIndex < lastEnteredWordIndex
      || (
        wordIndex === lastEnteredWordIndex
        && wordIndex === index
        && isCurrentWordComplete
        && wordIndex < translateWords.value.length - 1
      );

    if (shouldAppendSeparator) {
      nextAnswer += translateSeparators.value[wordIndex] ?? '';
    }
  }

  answer.value = nextAnswer;

  return normalizeAnswer(nextAnswer);
}

const isFullFilled = computed(() => {
  return answer.value.length === normalizedTranslate.value.length;
});

// const color = computed(() => {
//
//   if (answer.value.length === 0) {
//     return null
//   }
//
//   if (isFullFilled.value) {
//     if (!isError.value) {
//       return 'success'
//     }
//   }
//
// })

const isError = computed(() => {
  return getWrongAnswerIndex(answer.value) >= 0;
})

const onWordFinish = async (wordIndex: number, wordAnswer: string) => {
  const normalizedAnswer = updateWordAnswer(wordIndex, wordAnswer);
  const answerWords = getAnswerWords(normalizedAnswer);
  const isEveryWordComplete = translateWords.value.every((word, index) => {
    return answerWords[index]?.length === word.length;
  });

  if (!isEveryWordComplete) {
    const nextWordStart = translateWords.value
      .slice(0, wordIndex + 1)
      .reduce((length, word, index) => {
        return length
          + word.length
          + (translateSeparators.value[index]?.length ?? 0);
      }, 0);

    await focus(nextWordStart);
    return;
  }

  const isCorrect = normalizedAnswer.toLowerCase()
    === normalizedTranslate.value.toLowerCase();

  if (!isCorrect) {
    const wrongAnswerIndex = getWrongAnswerIndex(normalizedAnswer);

    if (wrongAnswerIndex >= 0) {
      await focusAndSelect(wrongAnswerIndex);
    }

    return;
  }

  emits('finish', {
    isOk: true,
    answer: normalizedAnswer,
  });
}

const reset = () => {
  emits('update:model-value', '');
  focus();
}

defineExpose({
  reset, focus
})

</script>

<template>
  <div ref="root" v-disable-otp-autocomplete>
    <slot name="header">
      <div class="text-body-2 text-center">
        Напишите перевод слова<br>
      </div>
    </slot>

    <div class="text-h2 text-center">
      {{ normalizedWord }}
    </div>

    <div
      class="phrase-input"
      :class="otherWords.length > 0 ? 'mb-2' : 'mb-8'"
    >
      <template
        v-for="(translateWord, wordIndex) in translateWords"
        :key="`${translateWord}-${wordIndex}`"
      >
        <v-otp-input
          :model-value="getWordAnswer(wordIndex)"
          :disabled="disabled"
          :readonly="readonly"
          :autofocus="wordIndex === 0"
          :color="color"
          :error="isError"
          :style="{'--word-length': `${translateWord.length}`}"
          class="word-otp"
          type="text"
          :length="translateWord.length"
          variant="outlined"
          @update:model-value="updateWordAnswer(wordIndex, $event)"
          @finish="onWordFinish(wordIndex, $event)"
        ></v-otp-input>

        <span
          v-if="translateSeparators[wordIndex]?.includes('-')"
          aria-label="Дефис"
          class="hyphen-separator"
          title="Дефис"
        >-</span>

        <v-icon
          v-else-if="wordIndex < translateWords.length - 1"
          aria-label="Пробел"
          class="space-icon"
          icon="mdi-keyboard-space"
          title="Пробел"
        ></v-icon>
      </template>
    </div>

    <div
      v-if="otherWords.length > 0"
      class="mb-8 text-body-2 text-medium-emphasis text-center"
    >
      ({{ otherWords.join(', ') }})
    </div>

  </div>
</template>

<style scoped>

.phrase-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 4px;
}

.word-otp {
  --letter-gap: 8px;
  --letter-width: 35px;

  flex: 0 0 min(
    100%,
    calc(
      var(--word-length) * var(--letter-width)
      + (var(--word-length) - 1) * var(--letter-gap)
      + 16px
    )
  );
  max-width: 100%;
}

.word-otp :deep(.v-otp-input__content) {
  flex-wrap: wrap;
  gap: var(--letter-gap);
  width: 100%;
  height: auto;
  min-height: 64px;
  max-width: none;
}

.word-otp :deep(.v-field) {
  position: relative;
  flex: 0 0 var(--letter-width);
  width: var(--letter-width);
  height: 48px;
}

.word-otp :deep(.v-field.word-line-end::after) {
  position: absolute;
  top: 50%;
  right: calc(var(--letter-gap) * -0.5);
  z-index: 2;
  color: currentColor;
  font-size: 24px;
  line-height: 1;
  content: '-';
  transform: translate(50%, -55%);
  pointer-events: none;
}

.space-icon {
  flex: 0 0 auto;
}

.hyphen-separator {
  flex: 0 0 auto;
  font-size: 32px;
  line-height: 1;
}

</style>
