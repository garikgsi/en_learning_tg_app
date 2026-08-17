export type ExerciseType = {
  id: number
  name: string
  title: string
}

export type ExerciseWord = {
  id: number
  ru: string
  en: string
  grade: number
}

export type Exercise = {
  id: number
  userId: string
  type: ExerciseType
  dueDate: string
  items: {
    id: number
    word: ExerciseWord
  }[]
  createdAt: string
}

export type ExerciseItemResultPayload = {
  exercise_item_id: number
  errors_count: number
  hints_count: number
  lang_id: number
  variants: string[]
}

export type CompleteExercisePayload = {
  attempt_id: string
  completed_at: string
  exercise_id: number
  exercise_items_result: ExerciseItemResultPayload[]
}

export type ExerciseCompletion = {
  id: number
  exercise_id: number
  attempt_id: string
  completed_at: string
}
