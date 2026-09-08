<script setup lang="ts">
defineProps<{
  name: 'home' | 'library' | 'calendar' | 'user' | 'search' | 'arrow' | 'filter' | 'close'
}>()
const paths = {
  home: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  library: 'M5 4h14v17H5zM9 4V2m6 2V2M9 9h6m-6 4h6m-6 4h3',
  calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  filter: 'M4 6h16M7 12h10m-7 6h4',
  close: 'm6 6 12 12M18 6 6 18',
}
</script>
<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
