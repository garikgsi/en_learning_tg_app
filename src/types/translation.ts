export type WordResult = {
  isOk: boolean
  answer: string
}
export type WordMistake = {
  count: number
  answer: string
}

export type TranslationWord = {
  id: number
  exerciseId: number
  exerciseItemId: number
  wordId: number
  pluralId?: number
  exerciseType?: string
  word: string
  translate: string
  wordVariants: string[]
  translateVariants: string[]
  checkWord: string
}

export type TranslationLanguage = 'en' | 'ru';

export type WordStatistics = {
  id: number
  retries: number
  isOk: boolean
  variants: string[]
  skipTimes: number
  hintTimes: number
  errorTimes: number
}

export type TranslationTask = {
  lang: TranslationLanguage
  list: TranslationWord[]
  results: WordStatistics[]
}

export type TranslationExerciseProgress = {
  version: 1
  exerciseId: number
  exerciseItemIds: number[]
  currentLanguage?: TranslationLanguage
  currentWordIndex: number
  currentWordId: number | null
  answer: string
  errorsOnCurrentAttempt: number
  hintUsageByWord: Record<number, number>
  visitedWordIdsInCycle: number[]
  russianResults: WordStatistics[]
  englishResults: WordStatistics[]
}
