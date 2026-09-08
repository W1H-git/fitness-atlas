<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import UpdatePrompt from '../pwa/UpdatePrompt.vue'
const route = useRoute()
const licensePath = import.meta.env.BASE_URL + 'licenses/workout-guide/LICENSE-ASSETS'
function focusMain() {
  document.getElementById('main')?.focus({ preventScroll: true })
}
watch(
  () => route.path,
  async () => {
    await nextTick()
    focusMain()
  },
)
</script>
<template>
  <UpdatePrompt />
  <a class="skip-link" :href="'#' + route.fullPath" @click.prevent="focusMain">跳到主要内容</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="Fitness Atlas 首页">
        <span class="wordmark">fa<span>.</span></span>
        <span class="brand-text">FITNESS ATLAS<small>健身动作图鉴</small></span>
      </RouterLink>
      <BottomNav />
      <span class="header-note">认识动作，循序进步</span>
    </div>
  </header>
  <main id="main" class="page-shell" tabindex="-1"><slot /></main>
  <footer class="site-footer page-shell">
    <div><strong>FITNESS ATLAS</strong><span>一步一步，建立你的训练日常。</span></div>
    <p>
      动作图解：<a
        href="https://github.com/everkinetic/data"
        target="_blank"
        rel="noopener noreferrer"
        >Everkinetic</a
      >
      / <a href="https://bryllim.com" target="_blank" rel="noopener noreferrer">Bryl Lim</a> ·
      <a :href="licensePath" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
    </p>
  </footer>
</template>
