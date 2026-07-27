export const PUBLIC_ROUTE_PATHS = [
  '/login',
  '/register',
] as const;

type RouteMetadata = {
  title: string
  icon: string
  showInSideBar: boolean
}

export const routes: Record<string, RouteMetadata> = {
  '/': {
    title: 'Перевод слов',
    icon: 'mdi-translate',
    showInSideBar: false,
  },
  '/exercises': {
    title: 'Упражнения',
    icon: 'mdi-school',
    showInSideBar: true,
  },
  '/dictionary': {
    title: 'Мой словарь',
    icon: 'mdi-book-open-page-variant',
    showInSideBar: true,
  },
  '/login': {
    title: 'Авторизация',
    icon: 'mdi-login',
    showInSideBar: false,
  },
  '/profile': {
    title: 'Профиль',
    icon: 'mdi-account-circle',
    showInSideBar: false,
  },
  '/register': {
    title: 'Регистрация',
    icon: 'mdi-account-plus',
    showInSideBar: false,
  },
  '/settings': {
    title: 'Настройки',
    icon: 'mdi-cog',
    showInSideBar: true,
  },
};

export const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTE_PATHS.some(publicPath => publicPath === path);
}

export const getRouteTitle = (path: string): string => {
  return routes[path]?.title ?? routes['/'].title;
}
