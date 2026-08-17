import type {ApiDictionaryWord} from '@/api/types/dictionary';

export type CachedDictionaryWord = {
  key: string
  userId: string
  word: ApiDictionaryWord
}

export type DictionaryCacheMetadata = {
  userId: string
  latestCreatedAt: string | null
  availableGrade: number
  synchronizedAt: string
}
