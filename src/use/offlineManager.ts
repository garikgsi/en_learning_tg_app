import {readonly, ref} from 'vue';
import {useExerciseRepository} from '@/use/exerciseRepository';
import {useStatisticsRepository} from '@/use/statisticsRepository';
import {useDictionaryRepository} from '@/use/dictionaryRepository';

const pendingResults = ref(0);
const failedResults = ref(0);
const isSynchronizing = ref(false);

const exerciseRepository = useExerciseRepository();
const statisticsRepository = useStatisticsRepository();
const dictionaryRepository = useDictionaryRepository();
const prefetchRequests = new Map<string, Promise<void>>();

const twoWeekPeriod = (): {dateFrom: string, dateTo: string} => {
  const now = new Date();
  const day = now.getDay() || 7;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - day + 1);
  currentMonday.setHours(0, 0, 0, 0);

  const dateFrom = new Date(currentMonday);
  dateFrom.setDate(currentMonday.getDate() - 7);

  const dateTo = new Date(currentMonday);
  dateTo.setDate(currentMonday.getDate() + 6);
  dateTo.setHours(23, 59, 59, 999);

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
};

const currentMonthPeriod = (): {
  periodKey: string
  dateFrom: string
  dateTo: string
} => {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    periodKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
};

const updateOutboxSummary = async (userId: string): Promise<void> => {
  const summary = await exerciseRepository.getOutboxSummary(userId);
  pendingResults.value = summary.pending;
  failedResults.value = summary.failed;
};

const sync = async (userId: string): Promise<void> => {
  isSynchronizing.value = true;

  try {
    const summary = await exerciseRepository.syncPending(userId);
    pendingResults.value = summary.pending;
    failedResults.value = summary.failed;
  } finally {
    isSynchronizing.value = false;
  }
};

const prefetch = async (userId: string): Promise<void> => {
  const exercises = twoWeekPeriod();
  const statistics = currentMonthPeriod();
  const requestKey = [
    userId,
    exercises.dateFrom,
    exercises.dateTo,
    statistics.periodKey,
  ].join(':');
  const existingRequest = prefetchRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = Promise.allSettled([
    exerciseRepository.getForPeriod(
      userId,
      exercises.dateFrom,
      exercises.dateTo,
    ),
    statisticsRepository.getForPeriod(
      userId,
      statistics.periodKey,
      statistics.dateFrom,
      statistics.dateTo,
    ),
    dictionaryRepository.synchronize(userId, true),
  ]).then(() => undefined).finally(() => {
    prefetchRequests.delete(requestKey);
  });
  prefetchRequests.set(requestKey, request);

  return request;
};

const initializeForUser = async (
  userId: string,
  connected: boolean,
): Promise<void> => {
  await updateOutboxSummary(userId);

  if (!connected) {
    return;
  }

  await sync(userId);
  await prefetch(userId);
};

export const useOfflineManager = () => ({
  pendingResults: readonly(pendingResults),
  failedResults: readonly(failedResults),
  isSynchronizing: readonly(isSynchronizing),
  initializeForUser,
  sync,
  prefetch,
  updateOutboxSummary,
});
