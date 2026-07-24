import {computed, ref} from 'vue'
import {defineStore} from 'pinia'

export type Word = {
  id: number
  word: string
  translate: string
}

export const useTranslateStore = defineStore('translate', () => {
  const enList = ref<Word[]>([])
  const isLoading = ref(false)

  const ruList = computed<Word[]>(() => {
    return enList.value.map(word => ({
      id: word.id,
      word: word.translate,
      translate: word.word
    }))
  })

  const loadWords = async (code?: string) => {
    console.log('loading words list with code', code)

    isLoading.value = true

    try {
      await new Promise(resolve => setTimeout(resolve, 10))

      enList.value = [
        {id: 1, word: 'птица', translate: 'bird'},
        {id: 2, word: 'кошка', translate: 'cat'},
        {id: 3, word: 'школа', translate: 'school'},
        {id: 4, word: 'дом', translate: 'home'},
        {id: 5, word: 'сегодня', translate: 'today'},
        {id: 6, word: 'завтра', translate: 'tomorrow'}
      ]
    } finally {
      isLoading.value = false
    }
  }

  return {
    enList,
    ruList,
    isLoading,
    loadWords
  }
})
