<script setup lang="ts">

import {computed, nextTick, ref} from 'vue';
import type {VOtpInput} from 'vuetify/components'
import {normalizeKeyboardInput} from '@/libs/keyboardNormalizer'

export type WordResult = { isOk: boolean, answer: string }

interface Props {
  modelValue: string
  word: string
  translate: string
  easyMode?: boolean
  disabled?: boolean
  color?: string
}

interface Emits {
  (e: 'finish', result: WordResult): void,

  (e: 'mistake', count: number): void,

  (e: 'update:model-value', modelValue: string): void
}

const props = withDefaults(defineProps<Props>(), {
  easyMode: true,
  disabled: false,
  color: 'primary'
})

const emits = defineEmits<Emits>()
const otp = ref<VOtpInput | null>(null);
const root = ref<HTMLElement | null>(null);

const getField = (index: number) => {
  const fields = root.value?.querySelectorAll<HTMLInputElement>('.v-otp-input__field');
  const fieldIndex = Math.min(index, (fields?.length ?? 1) - 1);

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
  return normalizeKeyboardInput(value, props.translate)
}

const getWrongAnswerIndex = (value: string) => {
  return Array.from(value).findIndex((letter, index) => {
    return letter.toLowerCase() !== props.translate[index]?.toLowerCase()
  })
}

const answer = computed({
  get: () => props.modelValue,
  set: (newValue) => {
    const normalizedAnswer = normalizeAnswer(newValue)
    const wrongAnswerIndex = getWrongAnswerIndex(normalizedAnswer)
    const mistakesCount = Array.from(normalizedAnswer).filter((letter, index) => {
      const isChanged = letter !== props.modelValue[index]
      const isWrong = letter.toLowerCase() !== props.translate[index]?.toLowerCase()

      return isChanged && isWrong
    }).length

    emits('update:model-value', normalizedAnswer)

    if (mistakesCount > 0) {
      emits('mistake', mistakesCount)
    }

    if (wrongAnswerIndex >= 0) {
      focusAndSelect(wrongAnswerIndex)
    }
  }
})

const isFullFilled = computed(() => answer.value.length === props.translate.length)

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

const onFinish = (ans: string) => {
  const normalizedAnswer = normalizeAnswer(ans)

  emits('finish', {
    isOk: normalizedAnswer.toLowerCase() === props.translate.toLowerCase(),
    answer: normalizedAnswer
  });

}

const reset = () => {
  otp.value?.reset();
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
      {{ word }}
    </div>

    <div>
      <v-otp-input
        ref="otp"
        v-model="answer"
        :disabled="disabled"
        autofocus
        :color="color"
        :error="isError"
        class="mb-8"
        type="text"
        :length="translate.length"
        variant="outlined"
        @finish="onFinish"
      ></v-otp-input>
    </div>


  </div>
</template>

<style scoped>

</style>
