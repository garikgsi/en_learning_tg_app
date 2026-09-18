export type ApiDictionaryWord = {
  id: number
  ru: string
  en: string
  ruVariants: string[]
  enVariants: string[]
  transcription: string | null
  grade: number
  createdAt: string
  repeatCount: number
  successfulRepeatCount: number
  failedRepeatCount: number
  is_active: boolean
}

export type DictionaryLookupResponse = {
  russian: string
  english: string
  transcription: string | null
  existingWords: ApiDictionaryWord[]
}

export type DictionaryStorePayload = {
  russian: string
  english: string
  transcription: string | null
}

export type DictionaryStoreResponse = {
  item: ApiDictionaryWord
  wasCreated: boolean
}

export type DictionaryUpdatePayload = Omit<DictionaryStorePayload, 'transcription'> & {
  russianVariants: string[]
  englishVariants: string[]
}

export type DictionaryWordResponse = {
  item: ApiDictionaryWord
}

export type DictionarySyncResponse = {
  items: ApiDictionaryWord[]
  latestCreatedAt: string | null
  latestUpdatedAt?: string | null
  availableGrade: number | null
  revision: number
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
  availableGrade: number | null
}
