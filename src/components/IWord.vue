<script setup lang="ts">

import {ref, computed} from 'vue';
import type {WordResult} from "@/components/types/WordResult.ts";

interface Props {
  word: string
  translate: string
  easyMode?: boolean
}
interface Emits {
  'finish': (result: WordResult) => {}
}

const props = withDefaults(defineProps<Props>(), {
  easyMode: true
})

const emits = defineEmits<Emits>()

const answer = ref('');

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
