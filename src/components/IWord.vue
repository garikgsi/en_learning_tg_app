<script setup lang="ts">

import {computed, ref} from 'vue';
import type {VOtpInput} from 'vuetify/components'

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

  (e: 'update:model-value', modelValue: string): void
}

const props = withDefaults(defineProps<Props>(), {
  easyMode: true,
  disabled: false,
  color: 'primary'
})

const emits = defineEmits<Emits>()

const answer = computed({
  get: () => props.modelValue,
  set: (newValue) => emits('update:model-value', newValue)
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
  return isFullFilled.value && answer.value.toLowerCase() !== props.translate.toLowerCase();
})

const onFinish = (ans: string) => {

  emits('finish', {isOk: !isError.value, answer: ans});

}

const otp = ref<VOtpInput | null>(null);

const reset = () => {
  otp.value?.reset();
  otp.value?.focus();
}

const focus = () => {
  otp.value?.focus();
}

defineExpose({
  reset, focus
})

</script>

<template>
  <div>
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
