type RouteMetadata = {
  title: string
  icon: string
  showInSideBar: boolean
  isPublic: boolean
  adminOnly?: boolean
}

export const routes: Record<string, RouteMetadata> = {
  '/games/pronoun': {
    title: 'Гонка местоимений',
    icon: 'mdi-flag-checkered',
    showInSideBar: false,
    isPublic: false,
  },
  '/balance': {
    title: 'Баланс',
    icon: 'mdi-wallet-outline',
    showInSideBar: true,
    isPublic: false,
  },
  '/monetization-requests': {
    title: 'Запросы на монетизацию',
    icon: 'mdi-cash-check',
    showInSideBar: true,
    isPublic: false,
    adminOnly: true,
  },
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
  '/games': {
    title: 'Игры',
    icon: 'mdi-gamepad-variant-outline',
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
  '/notifications': {
    title: 'Уведомления',
    icon: 'mdi-bell-outline',
    showInSideBar: true,
    isPublic: false,
  },
  '/users': {
    title: 'Пользователи',
    icon: 'mdi-account-group-outline',
    showInSideBar: true,
    isPublic: false,
    adminOnly: true,
  },
  '/about': {
    title: 'О программе',
    icon: 'mdi-information-outline',
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
    showInSideBar: false,
    isPublic: false,
  },
  '/update': {
    title: 'Обновление приложения',
    icon: 'mdi-cellphone-arrow-down',
    showInSideBar: false,
    isPublic: false,
  },
};

export const isPublicRoute = (path: string): boolean => {
  return routes[path]?.isPublic ?? false;
}

export const getRouteTitle = (path: string): string => {
  if (path === '/statistics/daily/new') return 'Новое дейли-задание';
  if (/^\/dictionary\/words\/\d+\/edit$/.test(path)) {
    return 'Редактирование слова';
  }
  if (/^\/exercises\/\d+$/.test(path)) {
    return routes['/exercises'].title;
  }

  return routes[path]?.title ?? routes['/'].title;
}
