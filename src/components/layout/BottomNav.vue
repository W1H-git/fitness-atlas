<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../common/AppIcon.vue'
const route = useRoute()
const links = [
  { to: '/', label: '今日', icon: 'home' },
  { to: '/exercises', label: '动作库', icon: 'library' },
  { to: '/schedule', label: '日程', icon: 'calendar' },
  { to: '/profile', label: '我的', icon: 'user' },
] as const
</script>
<template>
  <nav class="main-nav" aria-label="主导航">
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="nav-link"
      :class="{
        'is-current':
          link.to === '/'
            ? route.path === '/'
            : route.path.startsWith(link.to) ||
              (link.to === '/profile' && route.path === '/history'),
      }"
    >
      <AppIcon :name="link.icon" /><span>{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>
