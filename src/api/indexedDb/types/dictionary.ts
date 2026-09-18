import type {ApiDictionaryWord} from '@/api/types/dictionary';

export type CachedDictionaryWord = {
  key: string
  userId: string
  word: ApiDictionaryWord
}

export type DictionaryCacheMetadata = {
  userId: string
  latestCreatedAt: string | null
  latestUpdatedAt?: string | null
  availableGrade: number | null
  revision: number
  synchronizedAt: string
}
