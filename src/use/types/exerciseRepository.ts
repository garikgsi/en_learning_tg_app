import type {ExerciseItemResultPayload} from '@/api/types/exercise';

export type NewExerciseCompletion = {
  exerciseId: number
  itemResults: ExerciseItemResultPayload[]
}
export type CompletionSyncSummary = {
  sent: number
  pending: number
  failed: number
}
