export type GrammarRaceGameCode = 'personal_pronouns'
export type GrammarRaceTaskMode = 'phrase' | 'sentence'
export type GrammarRaceSessionStatus =
  | 'active'
  | 'student_won'
  | 'computer_won'
  | 'abandoned'
export type PersonalPronoun = 'he' | 'she' | 'it' | 'we' | 'they'

export type GrammarRaceApiTask = {
  position: number
  prompt: string
  translation: string | null
  correctAnswer: PersonalPronoun
  botAnswer: PersonalPronoun
  botDelayMs: number
}

export type GrammarRaceRound = {
  taskPosition: number
  playerAnswer: PersonalPronoun | null
  playerAnswerMs: number | null
}

export type GrammarRaceSession = {
  id: string
  gameCode: GrammarRaceGameCode
  status: GrammarRaceSessionStatus
  attemptNumber: number
  entryCost: number
  winReward: number
  difficulty: {
    level: number
    mode: GrammarRaceTaskMode
    botErrorPercent: number
    botMinDelayMs: number
    botMaxDelayMs: number
    answerGraceMs: number
  }
  winningScore: number
  options: PersonalPronoun[]
  score: {student: number, computer: number}
  tasks: GrammarRaceApiTask[]
  rounds: Array<GrammarRaceRound & {
    sequence: number
    outcome: 'student' | 'computer' | 'no_score'
    studentScore: number
    computerScore: number
  }>
  startedAt: string
  clientCompletedAt: string | null
  completedAt: string | null
}

export type GrammarRaceStatus = {
  gameCode: GrammarRaceGameCode
  currentLevel: number
  maxLevel: number
  attemptsUsed: number
  attemptsRemaining: number
  nextEntryCost: number | null
  balance: number
  available: number
  activeSession: GrammarRaceSession | null
}

export type CompleteGrammarRacePayload = {
  clientResultId: string
  completedAt: string
  rounds: GrammarRaceRound[]
}

export type AbandonGrammarRacePayload = {
  clientResultId: string
  abandonedAt: string
}

export type PendingGrammarRaceResult = {
  clientResultId: string
  userId: string
  sessionId: string
  gameCode: GrammarRaceGameCode
  operation: 'complete' | 'abandon'
  payload: CompleteGrammarRacePayload | AbandonGrammarRacePayload
  status: 'pending' | 'failed'
  attemptsCount: number
  nextRetryAt: string | null
  lastError: string | null
  createdAt: string
}
