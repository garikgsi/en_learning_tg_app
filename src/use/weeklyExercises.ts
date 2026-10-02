import type {ExerciseStatisticsItem} from '@/api/types/statistics';

const exerciseTime = (exercise: ExerciseStatisticsItem): number => {
  return new Date(exercise.createdAt || exercise.date).getTime();
}

export const selectWeeklyUncompletedExercises = (
  items: ExerciseStatisticsItem[],
): ExerciseStatisticsItem[] => {
  return items
    .filter(item => item.status === 'uncompleted')
    .sort((first, second) => {
      const dueDateDifference = new Date(first.date).getTime()
        - new Date(second.date).getTime();

      return dueDateDifference || exerciseTime(first) - exerciseTime(second);
    });
}
