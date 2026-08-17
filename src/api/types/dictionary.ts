export type ApiDictionaryWord = {
  id: number
  ru: string
  en: string
  grade: number
  createdAt: string
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
  is_active: boolean
}

export type DictionarySyncResponse = {
  items: ApiDictionaryWord[]
  latestCreatedAt: string | null
  availableGrade: number
  isFullSync: boolean
  page: number
  perPage: number
  lastPage: number
}

export type DictionaryPageResponse = {
  items: ApiDictionaryWord[]
  total: number
  page: number
  perPage: number
  lastPage: number
  availableGrade: number
}
