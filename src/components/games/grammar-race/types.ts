import type {
  GrammarRaceTaskOption,
  GrammarRaceTaskType,
} from '@/api/types/grammarRace';

export type GrammarRaceTask = {
  id: string
  position?: number
  type: GrammarRaceTaskType
  payload: {
    text: string
    translation: string | null
    instruction?: string
    feedback?: {
      correctText: string
      translation?: string
      explanation: string
    }
  }
  options: readonly GrammarRaceTaskOption[]
  correctAnswer: string
  botAnswer?: string
  botDelayMs?: number
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
  minGrade: number
  instruction: string
  requiresMistakeReview?: boolean
  tasks: readonly GrammarRaceTask[]
  rules: GrammarRaceRules
}

export type GrammarRaceAnswerState = 'idle' | 'correct' | 'incorrect'

export type GrammarRaceResult = 'win' | 'loss'
