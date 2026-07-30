<script setup lang="ts">

import {computed, nextTick, ref} from 'vue';
import {normalizeKeyboardInput} from '@/libs/keyboardNormalizer'

export type WordResult = { isOk: boolean, answer: string }
export type WordMistake = { count: number, answer: string }

interface Props {
  modelValue: string
  word: string
  translate: string
  lang?: 'en' | 'ru'
  otherWords?: string[]
  easyMode?: boolean
  disabled?: boolean
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
  color: 'primary',
  otherWords: () => [],
})

const emits = defineEmits<Emits>()
const root = ref<HTMLElement | null>(null);

const disableOtpAutocomplete = (element: HTMLElement) => {
  element
    .querySelectorAll<HTMLInputElement>('.v-otp-input__field')
    .forEach(field => field.setAttribute('autocomplete', 'off'));
}

const vDisableAutocomplete = {
  mounted: disableOtpAutocomplete,
  updated: disableOtpAutocomplete,
}

const normalizeLanguageText = (
  value: string,
  language: 'en' | 'ru',
): string => {
  return language === 'ru'
    ? value.replace(/[^а-яё ]/giu, '')
    : value.replace(/[^a-z ]/giu, '');
}

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
  return normalizedTranslate.value.split(/\s+/);
});

const toFieldIndex = (answerIndex: number) => {
  return Array.from(normalizedTranslate.value.slice(0, answerIndex))
    .filter(letter => !/\s/.test(letter))
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
  const lettersOnly = value.replace(/[^a-zа-яё ]/giu, '');
  const keyboardNormalized = normalizeKeyboardInput(
    lettersOnly,
    normalizedTranslate.value,
  );

  return normalizeLanguageText(
    keyboardNormalized,
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
    const mistakesCount = Array.from(normalizedAnswer).filter((letter, index) => {
      const isChanged = letter !== props.modelValue[index]
      const isWrong = letter.toLowerCase()
        !== normalizedTranslate.value[index]?.toLowerCase()

      return isChanged && isWrong
    }).length

    emits('update:model-value', normalizedAnswer)

    if (mistakesCount > 0) {
      emits('mistake', {
        count: mistakesCount,
        answer: normalizedAnswer,
      })
    }

    if (wrongAnswerIndex >= 0) {
      focusAndSelect(wrongAnswerIndex)
    }
  }
})

const getAnswerWords = (value = answer.value) => {
  const words = value.split(' ');

  return translateWords.value.map((_, index) => words[index] ?? '');
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

  let nextAnswer = lastEnteredWordIndex >= 0
    ? words.slice(0, lastEnteredWordIndex + 1).join(' ')
    : '';

  const isCurrentWordComplete = value.length === translateWords.value[index].length;

  if (
    isCurrentWordComplete
    && index === lastEnteredWordIndex
    && index < translateWords.value.length - 1
  ) {
    nextAnswer += ' ';
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
      .reduce((length, word) => length + word.length + 1, 0);

    await focus(nextWordStart);
    return;
  }

  emits('finish', {
    isOk: normalizedAnswer.toLowerCase()
      === normalizedTranslate.value.toLowerCase(),
    answer: normalizedAnswer
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
  <div ref="root">
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
          v-disable-autocomplete
          :model-value="getWordAnswer(wordIndex)"
          :disabled="disabled"
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

        <v-icon
          v-if="wordIndex < translateWords.length - 1"
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
  flex: 0 1 calc(var(--word-length) * 48px);
  min-width: 0;
  max-width: 100%;
}

.space-icon {
  flex: 0 0 auto;
}

</style>
