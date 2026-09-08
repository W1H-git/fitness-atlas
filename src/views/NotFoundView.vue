<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '../components/common/EmptyState.vue'
</script>
<template>
  <EmptyState title="这个页面不存在" description="检查网址，或从动作库继续探索。" symbol="404"
    ><RouterLink to="/exercises" class="button">返回动作库</RouterLink></EmptyState
  >
</template>
