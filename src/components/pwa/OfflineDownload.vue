<script setup lang="ts">
import { onMounted } from 'vue'
import { useOfflineStore } from '../../stores/offline.store'
import { shellReady, registrationError, checkForUpdate } from '../../pwa/register'
const store = useOfflineStore()
const dev = import.meta.env.DEV
onMounted(() => {
  void store.check()
})
</script>
<template>
  <section class="offline-panel">
    <p class="eyebrow">TAKE IT WITH YOU</p>
    <h2>离线动作图鉴</h2>
    <p v-if="dev">
      当前是开发预览。离线与安装功能请在生产预览中体验（npm run build 后运行 npm run preview）。
    </p>
    <p v-else-if="!store.supported">
      此环境不支持离线缓存，请使用支持此功能的浏览器并通过 HTTPS 访问。
    </p>
    <template v-else>
      <p>
        {{ store.online ? '当前在线' : '当前离线' }} ·
        {{ shellReady ? '应用已可离线打开' : '应用缓存准备中' }}
      </p>
      <p>下载全部 906 帧图解，约 31 MB。文字目录随应用缓存，图片可按需浏览或一次下载。</p>
      <progress :value="store.cached" :max="store.total" aria-label="图解缓存进度"></progress>
      <p role="status">
        {{ store.cached }} / {{ store.total }} 帧 ·
        {{
          store.busy
            ? '正在下载'
            : store.checking
              ? '正在检查'
              : store.complete
                ? '完整图鉴已缓存，可离线查看'
                : '尚未缓存完整图鉴'
        }}
      </p>
      <div class="form-actions">
        <button
          v-if="!store.complete"
          class="button"
          :disabled="store.busy || store.checking"
          @click="store.download"
        >
          {{ store.error || store.cached ? '继续下载／重试' : '下载全部图解' }}
        </button>
        <button v-if="store.busy" class="button button--outline" @click="store.cancel">
          暂停下载
        </button>
        <button
          class="button button--outline"
          :disabled="store.busy || store.checking"
          @click="store.check"
        >
          检查缓存
        </button>
        <button class="text-link" @click="checkForUpdate">检查应用更新</button>
      </div>
      <p class="small">首次访问需联网。浏览器清理缓存后需要重新下载；下载进度以实际缓存为准。</p>
    </template>
    <p v-if="store.error || registrationError" class="form-error" role="alert">
      {{ store.error || registrationError }}
    </p>
  </section>
</template>
