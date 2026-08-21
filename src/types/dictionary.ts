export type DictionaryWord = {
  id: number
  english: string
  russian: string
  transcription: string | null
  grade: number
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
  isSelectedForRepetition: boolean
}
