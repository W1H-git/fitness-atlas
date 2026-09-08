<script setup lang="ts">
import {
  updateAvailable,
  updating,
  registrationError,
  updateApplication,
  promptVisible,
} from '../../pwa/register'
</script>
<template>
  <aside v-if="updateAvailable && promptVisible" class="update-prompt" aria-label="应用更新">
    <strong>新版本已准备好</strong>
    <p>更新前会保存训练草稿，成功后再刷新。</p>
    <div class="form-actions">
      <button class="button" :disabled="updating" @click="updateApplication">保存并更新</button
      ><button class="button button--outline" :disabled="updating" @click="promptVisible = false">
        稍后
      </button>
    </div>
    <p v-if="registrationError" role="alert">{{ registrationError }}</p>
  </aside>
  <div v-if="updating" class="pwa-updating" role="status" aria-live="polite">
    正在保存并更新，请稍候…
  </div>
</template>
