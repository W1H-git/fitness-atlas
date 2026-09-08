<script setup lang="ts">
import { ref } from 'vue'
import { installEvent, installed } from '../../pwa/install'
const error = ref('')
const dev = import.meta.env.DEV
async function install() {
  try {
    const event = installEvent.value
    if (!event) return
    await event.prompt()
    await event.userChoice
    installEvent.value = null
  } catch {
    error.value = '请使用浏览器菜单中的安装或添加到主屏幕'
  }
}
</script>
<template>
  <section v-if="!dev" class="install-panel">
    <h2>{{ installed ? '已在独立窗口中使用' : '像 App 一样打开' }}</h2>
    <button v-if="installEvent" class="button button--outline" @click="install">
      安装健身动作图鉴
    </button>
    <p v-else-if="!installed">
      iPhone／iPad：在 Safari 分享菜单中选择“添加到主屏幕”。Android
      或电脑：查看浏览器菜单中的“安装应用”或“添加到主屏幕”；是否提供取决于浏览器支持。
    </p>
    <p v-if="error" role="status">{{ error }}</p>
  </section>
</template>
