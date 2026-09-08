import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
      meta: { title: '训练历史' },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '今日' },
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: () => import('../views/ExerciseListView.vue'),
      meta: { title: '动作库' },
    },
    {
      path: '/exercises/:id',
      name: 'exercise',
      component: () => import('../views/ExerciseDetailView.vue'),
      meta: { title: '动作详情' },
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: () => import('../views/ScheduleView.vue'),
      meta: { title: '训练日程' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { title: '我的档案' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})
router.afterEach((to) => {
  document.title = String(to.meta.title ?? '首页') + ' · 健身动作图鉴'
})
