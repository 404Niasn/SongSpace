import { createRouter, createWebHistory } from 'vue-router'
import { hasSession } from '@/game/cloud'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.name !== 'login' && !hasSession()) return { name: 'login' }
})

export default router
