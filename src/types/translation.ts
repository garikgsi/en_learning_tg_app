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
  word: string
  translate: string
  wordVariants: string[]
  checkWord: string
  otherCheckWords: string[]
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
