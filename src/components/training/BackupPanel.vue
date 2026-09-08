<script setup lang="ts">
import { ref } from 'vue'
import { useServicesStore } from '../../stores/services.store'
import type { BackupData } from '../../types/local-data'
const services = useServicesStore()
const preview = ref<BackupData | null>(null),
  error = ref(''),
  message = ref('')
const busy = ref(false)
async function exportData() {
  busy.value = true
  error.value = ''
  try {
    const text = await (await services.get()).backup.export()
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'fitness-atlas-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    message.value = '备份已生成，请保留下载的 JSON 文件'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '导出失败'
  } finally {
    busy.value = false
  }
}
async function select(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  preview.value = null
  error.value = ''
  message.value = ''
  if (!file) return
  busy.value = true
  try {
    if (file.size > 20_000_000) throw new Error('文件超过20 MB')
    preview.value = await (await services.get()).backup.preview(await file.text())
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '备份读取失败'
  } finally {
    busy.value = false
    input.value = ''
  }
}
async function restore() {
  if (!preview.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await (await services.get()).backup.restore(JSON.parse(JSON.stringify(preview.value)))
    window.location.reload()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '恢复失败，原数据未修改'
    busy.value = false
  }
}
</script>
<template>
  <section class="backup-panel">
    <h2>数据备份与恢复</h2>
    <p>档案与训练保存在当前浏览器中。换设备时，可用 JSON 文件迁移；先导出再清理浏览器数据。</p>
    <div class="form-actions">
      <button class="button button--outline" :disabled="busy" @click="exportData">
        导出 JSON 备份
      </button>
      <label class="button button--outline"
        >选择备份文件<input
          class="sr-only"
          type="file"
          accept=".json,application/json"
          aria-label="选择备份文件"
          :disabled="busy"
          @change="select"
      /></label>
    </div>
    <div v-if="preview" class="training-notice">
      <h3>恢复预览</h3>
      <p>
        {{ preview.profile ? '1 份档案' : '无档案' }} · {{ preview.plans.length }} 周计划 ·
        {{ preview.records.length }} 条训练记录 · {{ preview.drafts.length }} 份草稿
      </p>
      <p>备份时间：{{ preview.exportedAt }}。确认后替换当前数据并刷新页面。</p>
      <div class="form-actions">
        <button class="button" :disabled="busy" @click="restore">确认替换本机数据</button
        ><button class="button button--outline" :disabled="busy" @click="preview = null">
          取消恢复
        </button>
      </div>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  </section>
</template>
