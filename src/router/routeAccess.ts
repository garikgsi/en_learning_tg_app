type RouteMetadata = {
  title: string
  icon: string
  showInSideBar: boolean
  isPublic: boolean
}

export const routes: Record<string, RouteMetadata> = {
  '/': {
    title: 'Перевод слов',
    icon: 'mdi-translate',
    showInSideBar: false,
    isPublic: false,
  },
  '/exercises': {
    title: 'Упражнения',
    icon: 'mdi-school',
    showInSideBar: true,
    isPublic: false,
  },
  '/dictionary': {
    title: 'Мой словарь',
    icon: 'mdi-book-open-page-variant',
    showInSideBar: true,
    isPublic: false,
  },
  '/statistics': {
    title: 'Статистика',
    icon: 'mdi-calendar-check',
    showInSideBar: true,
    isPublic: false,
  },
  '/login': {
    title: 'Авторизация',
    icon: 'mdi-login',
    showInSideBar: false,
    isPublic: true,
  },
  '/profile': {
    title: 'Профиль',
    icon: 'mdi-account-circle',
    showInSideBar: false,
    isPublic: false,
  },
  '/register': {
    title: 'Регистрация',
    icon: 'mdi-account-plus',
    showInSideBar: false,
    isPublic: true,
  },
  '/settings': {
    title: 'Настройки',
    icon: 'mdi-cog',
    showInSideBar: true,
    isPublic: false,
  },
};

export const isPublicRoute = (path: string): boolean => {
  return routes[path]?.isPublic ?? false;
}

export const getRouteTitle = (path: string): string => {
  return routes[path]?.title ?? routes['/'].title;
}
