import { createRouter, createWebHistory } from 'vue-router'
import { state } from '../campus/store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/LandingView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    {
      path: '/app',
      name: 'app',
      component: () => import('../campus/CampusApp.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to) {
    // Keep the landing page's in-page anchors (#discover, #about) working.
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// The campus app needs a signed-in identity (a student, admin or guest).
router.beforeEach((to) => {
  if (to.meta.requiresAuth && state.userId === null) return { name: 'login' }
})

export default router
