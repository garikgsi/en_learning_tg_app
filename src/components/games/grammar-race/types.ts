export type GrammarRaceTask = {
  id: string
  position?: number
  prompt: string
  translation?: string | null
  choices: readonly string[]
  correctAnswer: string
  botAnswer?: string
  botDelayMs?: number
  explanation?: string
}

export type GrammarRaceRules = {
  targetScore: number
  freeGamesPerDay: number
  paidGamesPerDay: number
  paidGameCost: number
  winReward: number
}

export type GrammarRaceDefinition = {
  id: string
  groupTitle: string
  rankTitle: string
  title: string
  description: string
  instruction: string
  tasks: readonly GrammarRaceTask[]
  rules: GrammarRaceRules
}

export type GrammarRaceAnswerState = 'idle' | 'correct' | 'incorrect'

export type GrammarRaceResult = 'win' | 'loss'
