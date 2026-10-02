export const exerciseEnCoinReward = (
  typeName: string,
  dueDate: string,
  now = new Date(),
): number => {
  if (typeName === 'weekly') {
    return 5;
  }

  if (!['daily', 'plural'].includes(typeName)) {
    return 0;
  }

  const deadline = new Date(dueDate);
  deadline.setHours(23, 59, 59, 999);

  return now.getTime() <= deadline.getTime() ? 2 : 1;
}
