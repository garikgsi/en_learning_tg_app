export type DictionaryWord = {
  id: number
  english: string
  englishVariants: string[]
  russian: string
  russianVariants: string[]
  transcription: string | null
  grade: number
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
  isSelectedForRepetition: boolean
}
