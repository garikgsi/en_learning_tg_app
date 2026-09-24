export type GrammarRaceGameCode =
  | 'personal_pronouns'
  | 'possessive_pronouns'
  | 'articles'
  | 'to_be'
export type GrammarRaceTaskMode = 'phrase' | 'sentence'
export type GrammarRacePlayMode = 'competitive' | 'training'
export type GrammarRaceTaskType = 'single_choice'
export type GrammarRaceSessionStatus =
  | 'active'
  | 'student_won'
  | 'computer_won'
  | 'abandoned'
export type GrammarRaceAnswer = string

export type GrammarRaceTaskOption = {
  id: string
  label: string
}

export type GrammarRaceApiTask = {
  position: number
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
  options: GrammarRaceTaskOption[]
  correctAnswer: GrammarRaceAnswer
  botAnswer: GrammarRaceAnswer
  botDelayMs: number
}

export type GrammarRaceRound = {
  taskPosition: number
  playerAnswer: GrammarRaceAnswer | null
  playerAnswerMs: number | null
  secondPlayerAnswer: GrammarRaceAnswer | null
  secondPlayerAnswerMs: number | null
}

export type GrammarRaceSession = {
  id: string
  gameCode: GrammarRaceGameCode
  playMode: GrammarRacePlayMode
  status: GrammarRaceSessionStatus
  attemptNumber: number | null
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
  minGrade: number
  isAvailable: boolean
  reactionTimeMultiplier: number
  currentLevel: number
  maxLevel: number
  winningScore: number
  attemptsUsed: number
  attemptsRemaining: number
  nextEntryCost: number | null
  balance: number
  available: number
  activeSession: GrammarRaceSession | null
}

export type GrammarRaceAchievement = {
  gameCode: GrammarRaceGameCode
  gameTitle: string
  rankTitle: string
  route: string
  minGrade: number
  isAvailable: boolean
  currentLevel: number
  maxLevel: number
  medalTier: number
  isMaxLevel: boolean
  gamesPlayed: number
  gamesWon: number
  gamesAtLevel: number
  winsAtLevel: number
  progressPercent: number
}

export type GrammarRaceAchievementsResponse = {
  items: GrammarRaceAchievement[]
  levelUp: {
    minimumGames: number
    minimumWinRatePercent: number
  }
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
