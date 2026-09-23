export const indexedDbStores = {
  exercises: 'exercises',
  statistics: 'statistics',
  completionOutbox: 'completionOutbox',
  users: 'users',
  dictionaryWords: 'dictionaryWords',
  dictionaryMetadata: 'dictionaryMetadata',
  syncMetadata: 'syncMetadata',
  notifications: 'notifications',
  grammarRaceSessions: 'grammarRaceSessions',
  grammarRaceOutbox: 'grammarRaceOutbox',
  exerciseProgress: 'exerciseProgress',
} as const;

export type IndexedDbStore = typeof indexedDbStores[keyof typeof indexedDbStores];
