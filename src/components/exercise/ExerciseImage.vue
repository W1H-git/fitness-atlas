<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
const props = withDefaults(defineProps<{ src: string; alt: string; eager?: boolean }>(), {
  eager: false,
})
const failed = ref(false)
const offline = ref(!navigator.onLine)
const reconnect = () => {
  offline.value = !navigator.onLine
  if (!offline.value) failed.value = false
}
onMounted(() => {
  window.addEventListener('online', reconnect)
  window.addEventListener('offline', reconnect)
})
onUnmounted(() => {
  window.removeEventListener('online', reconnect)
  window.removeEventListener('offline', reconnect)
})
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>
<template>
  <div class="exercise-image">
    <img
      v-if="!failed"
      :src="src"
      :alt="alt"
      width="512"
      height="512"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @error="failed = true"
    />
    <div v-else class="image-fallback" role="status">
      <span aria-hidden="true">▧</span>
      <p>图解暂时无法加载</p>
      <small v-if="offline">当前离线，这张图解尚未缓存。</small>
      <small>{{ alt }}</small>
    </div>
  </div>
</template>
