import type { ExerciseStatisticsItem } from '@/api/types/statistics';

export type StatisticsCalendarExerciseType = 'user' | 'weekly' | 'daily'

export type StatisticsCalendarWord = {
  wordId: number | null
  english: string
  russian: string
  ruVariants: string[]
  enVariants: string[]
  transcription: string | null
  hasErrors: boolean
  isUncompleted: boolean
}

export type StatisticsCalendarGroup = {
  id: string
  typeName: StatisticsCalendarExerciseType
  shortTitle: 'MY' | 'W' | 'D'
  title: string
  start: Date
  end: Date
  allDay: true
  color: string
  count: number
  wordsCount: number
  wordsWithErrors: number
  errorsCount: number
  errorWords: string[]
  words: StatisticsCalendarWord[]
  successPercentage: number
  status: 'completed' | 'uncompleted'
  isOnlyTypeInDay: boolean
  items: ExerciseStatisticsItem[]
}

const exerciseTypeOrder: StatisticsCalendarExerciseType[] = [
  'user',
  'weekly',
  'daily',
];

const exerciseTypeShortTitles: Record<
  StatisticsCalendarExerciseType,
  StatisticsCalendarGroup['shortTitle']
> = {
  user: 'MY',
  weekly: 'W',
  daily: 'D',
};

const toLocalDayKey = (date: Date): string => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const isSameLocalDay = (first: Date, second: Date): boolean => {
  return toLocalDayKey(first) === toLocalDayKey(second);
}

const successColor = (percentage: number): string => {
  if (percentage >= 90) {
    return 'green-lighten-1';
  }

  if (percentage >= 75) {
    return 'green';
  }

  if (percentage >= 50) {
    return 'green-darken-1';
  }

  if (percentage >= 25) {
    return 'green-darken-2';
  }

  return 'green-darken-3';
}

const groupColor = (
  typeName: StatisticsCalendarExerciseType,
  items: ExerciseStatisticsItem[],
  date: Date,
  now: Date,
  successPercentage: number,
): string => {
  if (typeName === 'user') {
    return 'grey-darken-1';
  }

  if (items.some(item => item.status === 'uncompleted')) {
    return isSameLocalDay(date, now)
      ? 'orange-darken-1'
      : 'red-darken-1';
  }

  return successColor(successPercentage);
}

const oldestFirst = (
  first: ExerciseStatisticsItem,
  second: ExerciseStatisticsItem,
): number => {
  const dateDifference = new Date(first.createdAt ?? first.date).getTime()
    - new Date(second.createdAt ?? second.date).getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return (first.completionId ?? first.exerciseId)
    - (second.completionId ?? second.exerciseId);
}

export const buildStatisticsCalendarGroups = (
  items: ExerciseStatisticsItem[],
  now = new Date(),
): StatisticsCalendarGroup[] => {
  const groupedItems = new Map<string, ExerciseStatisticsItem[]>();

  items.forEach(item => {
    if (!exerciseTypeOrder.includes(
      item.type.name as StatisticsCalendarExerciseType,
    )) {
      return;
    }

    const date = new Date(item.date);
    const dayKey = toLocalDayKey(date);
    const statusKey = item.type.name !== 'user' && isSameLocalDay(date, now)
      ? `:${item.status}`
      : '';
    const key = `${dayKey}:${item.type.name}${statusKey}`;
    const group = groupedItems.get(key) ?? [];
    group.push(item);
    groupedItems.set(key, group);
  });

  const groups = [...groupedItems.entries()]
    .map(([id, grouped]) => {
      const sortedItems = [...grouped].sort(oldestFirst);
      const firstItem = sortedItems[0];
      const typeName = firstItem.type.name as StatisticsCalendarExerciseType;
      const date = new Date(firstItem.date);
      const wordsCount = sortedItems.reduce(
        (total, item) => total + item.wordsCount,
        0,
      );
      const wordsWithErrors = sortedItems.reduce(
        (total, item) => total + item.wordsWithErrors,
        0,
      );
      const errorsCount = sortedItems.reduce(
        (total, item) => total + (item.errorsCount ?? item.wordsWithErrors),
        0,
      );
      const errorWords = [...new Set(
        sortedItems.flatMap(item => item.errorWords ?? []),
      )];
      const wordsWithExerciseState = sortedItems.flatMap(item => {
        const itemWords = item.words ?? (item.errorWords ?? []).map(
          english => ({
            wordId: null,
            english,
            russian: '',
            ruVariants: [],
            enVariants: [],
            transcription: null,
            hasErrors: true,
          }),
        );

        return itemWords.map(word => ({
          ...word,
          isUncompleted: item.status === 'uncompleted',
        }));
      });
      const words = [
        ...wordsWithExerciseState.filter(word => word.isUncompleted),
        ...wordsWithExerciseState.filter(
          word => !word.isUncompleted && word.hasErrors,
        ),
        ...wordsWithExerciseState.filter(
          word => !word.isUncompleted && !word.hasErrors,
        ),
      ];
      const successPercentage = wordsCount === 0
        ? 0
        : Math.round(((wordsCount - wordsWithErrors) / wordsCount) * 100);
      const status: StatisticsCalendarGroup['status'] = sortedItems.some(
        item => item.status === 'uncompleted',
      ) ? 'uncompleted' : 'completed';
      const isUncompletedToday = status === 'uncompleted'
        && isSameLocalDay(date, now);

      return {
        id,
        typeName,
        shortTitle: exerciseTypeShortTitles[typeName],
        title: isUncompletedToday
          ? 'Задание на сегодня'
          : firstItem.type.title,
        start: date,
        end: date,
        allDay: true as const,
        color: groupColor(
          typeName,
          sortedItems,
          date,
          now,
          successPercentage,
        ),
        count: sortedItems.length,
        wordsCount,
        wordsWithErrors,
        errorsCount,
        errorWords,
        words,
        successPercentage,
        status,
        isOnlyTypeInDay: false,
        items: sortedItems,
      };
    });

  const typeCountsByDay = groups.reduce<Map<string, number>>(
    (counts, group) => {
      const dayKey = toLocalDayKey(group.start);
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);

      return counts;
    },
    new Map(),
  );

  return groups
    .map(group => ({
      ...group,
      isOnlyTypeInDay: typeCountsByDay.get(toLocalDayKey(group.start)) === 1,
    }))
    .sort((first, second) => {
      const dateDifference = toLocalDayKey(first.start).localeCompare(
        toLocalDayKey(second.start),
      );

      if (dateDifference !== 0) {
        return dateDifference;
      }

      const typeDifference = exerciseTypeOrder.indexOf(first.typeName)
        - exerciseTypeOrder.indexOf(second.typeName);

      if (typeDifference !== 0) {
        return typeDifference;
      }

      return first.status === second.status
        ? 0
        : first.status === 'completed' ? -1 : 1;
    });
}

export const selectStatisticsCalendarExercise = (
  group: StatisticsCalendarGroup,
): ExerciseStatisticsItem | null => {
  if (group.typeName === 'user') {
    return group.items.find(item => item.status === 'uncompleted') ?? null;
  }

  return group.items.find(item => item.status === 'completed')
    ?? group.items.find(item => item.status === 'uncompleted')
    ?? null;
}

export const buildStatisticsExerciseQueue = (
  group: StatisticsCalendarGroup,
): number[] => {
  if (group.typeName === 'user') {
    const exercise = selectStatisticsCalendarExercise(group);

    return exercise ? [exercise.exerciseId] : [];
  }

  return [...new Set(group.items.map(item => item.exerciseId))];
}

export const limitStatisticsCalendarWords = (
  words: StatisticsCalendarWord[],
  limit = 20,
): { words: StatisticsCalendarWord[], hiddenCount: number } => {
  return {
    words: words.slice(0, limit),
    hiddenCount: Math.max(words.length - limit, 0),
  };
}

export const formatStatisticsWordTranslation = (
  word: StatisticsCalendarWord,
): string => {
  const translations = [word.russian, ...(word.ruVariants ?? [])]
    .map(translation => translation.trim())
    .filter(Boolean);
  const normalizedTranslations = new Set<string>();

  return translations
    .filter(translation => {
      const normalized = translation.toLocaleLowerCase('ru-RU');

      if (normalizedTranslations.has(normalized)) {
        return false;
      }

      normalizedTranslations.add(normalized);

      return true;
    })
    .join(', ');
}

export const findUncompletedUserExerciseForDay = (
  groups: StatisticsCalendarGroup[],
  date: Date,
): StatisticsCalendarGroup | null => {
  return groups.find(group => group.typeName === 'user'
    && group.status === 'uncompleted'
    && isSameLocalDay(group.start, date)) ?? null;
}
