export type DachshundGameRecords = {
  personalBest: number
  globalBest: number
}

export type DachshundGameResult = DachshundGameRecords & {
  gamesPlayed: number
}

export type DachshundGameAudioManifest = {
  locale: 'en-GB'
  version: string
  letters: Record<string, string>
}
