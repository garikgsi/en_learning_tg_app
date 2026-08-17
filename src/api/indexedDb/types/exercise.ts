import type {CompleteExercisePayload} from '@/api/types/exercise';

export type PendingCompletionStatus = 'pending' | 'failed';

export type PendingCompletion = {
  attemptId: string
  userId: string
  exerciseId: number
  payload: CompleteExercisePayload
  status: PendingCompletionStatus
  attemptsCount: number
  nextRetryAt: string | null
  lastError: string | null
  createdAt: string
}
