export type ExerciseStatisticsItem = {
  exerciseId: number
  completionId: number | null
  status: 'completed' | 'uncompleted'
  date: string
  type: {
    id: number
    name: string
    title: string
  }
  wordsCount: number
  wordsWithErrors: number
  successPercentage: number
}

export type UserExerciseStatistics = {
  userId: string
  userName: string
  learnedWords: number
  wordsToRepeat: number
  completedExercises: number
}

export type ExerciseStatisticsChartPeriod = {
  dateFrom: string
  dateTo: string
  users: UserExerciseStatistics[]
}

export type ExerciseStatisticsCharts = {
  week: ExerciseStatisticsChartPeriod
  month: ExerciseStatisticsChartPeriod
}

export type AttentionWord = {
  wordId: number
  russian: string
  english: string
  errorPercentage: number
  isSelectedForRepetition: boolean
}

export type ExerciseStatisticsResponse = {
  items: ExerciseStatisticsItem[]
  charts: ExerciseStatisticsCharts
  attentionWords: AttentionWord[]
}
