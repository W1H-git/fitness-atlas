<script setup lang="ts">
withDefaults(defineProps<{ title: string; description: string; symbol?: string }>(), {
  symbol: '∅',
})
</script>
<template>
  <div class="empty-state">
    <span class="empty-symbol" aria-hidden="true">{{ symbol }}</span>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
