export const PUBLIC_ROUTE_PATHS = [
  '/login',
] as const;

const routeTitles: Record<string, string> = {
  '/': 'Перевод слов',
  '/dictionary': 'Словарь',
  '/exercises': 'Упражнения',
  '/login': 'Авторизация',
  '/settings': 'Настройки',
};

export const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTE_PATHS.some(publicPath => publicPath === path);
}

export const getRouteTitle = (path: string): string => {
  return routeTitles[path] ?? 'Перевод слов';
}
