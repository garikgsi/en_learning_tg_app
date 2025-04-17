<script setup lang="ts">

import {computed, ref} from 'vue';
import type {WordResult} from "@/components/types/WordResult.ts";

interface Props {
  modelValue: string
  word: string
  translate: string
  easyMode?: boolean
}

interface Emits {
  'finish': (result: WordResult) => {}
  'update:model-value': (modelValue: string) => {}
}

const props = withDefaults(defineProps<Props>(), {
  easyMode: true
})

const emits = defineEmits<Emits>()

const answer = computed({
  get: () => props.modelValue,
  set: (newValue) => emits('update:model-value', newValue)
})

const isFullFilled = computed(() => answer.value.length === props.translate.length)

const color = computed(() => {

  if (answer.value.length === 0) {
    return null
  }

  if (isFullFilled.value) {
    if (!isError.value) {
      return 'success'
    }
  }

})

const isError = computed(() => {
  return isFullFilled.value && answer.value.toLowerCase() !== props.translate.toLowerCase()
})

const onFinish = (ans: string) => {

  emits('finish', {isOk: !isError.value, answer: ans})

}

const otp = ref(null);

const reset = () => {
  otp.value?.reset();
  otp.value?.focus();
}

defineExpose({
  reset
})

</script>

<template>
  <div>
    <div class="text-body-2 text-center">
      Напишите перевод слова<br>
    </div>

    <div class="text-body-1 text-center">
      {{ word }}
    </div>

    <v-otp-input
      ref="otp"
      v-model="answer"
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
</template>

<style scoped>

</style>
