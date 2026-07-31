/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import {createRouter, createWebHistory} from 'vue-router/auto'
import {routes} from 'vue-router/auto-routes'
import index from '@/pages/index.vue'
import exercises from '@/pages/exercises.vue'
import {isPublicRoute} from '@/router/routeAccess'
import {useUserStore} from '@/stores/userStore'

const advancedRoutes = [
  {
    path: '/exercises/:exerciseId(\\d+)',
    component: exercises,
    props: true,
  },
  {path: '/:code?', component: index, props: true},
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...routes, ...advancedRoutes],
})

router.beforeEach(async to => {
  const userStore = useUserStore()

  await userStore.restoreSession()

  if (!isPublicRoute(to.path) && !userStore.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!localStorage.getItem('vuetify:dynamic-reload')) {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
