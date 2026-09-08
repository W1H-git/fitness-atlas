<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import type { Exercise } from '../../types/exercise'
import type { Prescription } from '../../types/training'
import type { TrainingDraft } from '../../types/local-data'
import { useTrainingStore } from '../../stores/training.store'
import { useProfileStore } from '../../stores/profile.store'
import { localDate } from '../../utils/local-date'
import { registerUpdateGuard } from '../../pwa/update-guards'
const props = defineProps<{ exercise: Exercise; prescription: Prescription; date: string }>()
const emit = defineEmits<{ committed: [] }>()
const store = useTrainingStore()
const profile = useProfileStore()
const draft = ref<TrainingDraft | null>(null)
const error = ref(''),
  message = ref('')
const busy = ref(false),
  pending = ref(false),
  ready = ref(false)
let queue: Promise<void> = Promise.resolve()
let revision = 0
const completed = computed(() =>
  store.records.some(
    (r) =>
      r.profileId === profile.profile?.id &&
      r.exerciseId === props.exercise.id &&
      r.date === props.date,
  ),
)
const hasDraft = computed(() =>
  store.drafts.some((d) => d.exerciseId === props.exercise.id && d.date === props.date),
)
const weighted = computed(() => ['external', 'assistance'].includes(props.exercise.load.kind))
const copy = () => JSON.parse(JSON.stringify(draft.value)) as TrainingDraft
onMounted(async () => {
  try {
    await store.load()
    ready.value = true
  } catch {
    error.value = '记录加载失败，请刷新重试；当前输入不会覆盖旧数据'
  }
})
async function open() {
  error.value = ''
  busy.value = true
  try {
    draft.value = await store.open(props.exercise.id, props.date, props.prescription)
    message.value = hasDraft.value ? '已恢复草稿' : '填写实际结果，输入后自动保存草稿'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '打开失败'
  } finally {
    busy.value = false
  }
}
watch(
  draft,
  () => {
    if (!draft.value) return
    const value = copy(),
      current = ++revision
    pending.value = true
    message.value = '正在保存草稿…'
    queue = queue.then(async () => {
      try {
        await store.saveDraft(value)
        if (current === revision) {
          error.value = ''
          message.value = '草稿已保存到本机'
          pending.value = false
        }
      } catch {
        if (current === revision) {
          error.value = '草稿保存失败，输入仍在页面中。请重试后再关闭页面'
          message.value = ''
          pending.value = true
        }
      }
    })
  },
  { deep: true, flush: 'sync' },
)
async function retry() {
  if (!draft.value) return
  busy.value = true
  await queue
  try {
    await store.saveDraft(copy())
    error.value = ''
    pending.value = false
    message.value = '草稿已保存到本机'
  } catch {
    error.value = '仍无法保存，请检查浏览器存储空间或权限'
  } finally {
    busy.value = false
  }
}
async function finish() {
  if (!draft.value || busy.value) return
  busy.value = true
  error.value = ''
  await queue
  try {
    await store.complete(copy())
    pending.value = false
    draft.value = null
    message.value = '训练已保存'
    emit('committed')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，输入已保留'
  } finally {
    busy.value = false
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (pending.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(async () => {
  await queue
  return !pending.value
})
const removeUpdateGuard = registerUpdateGuard(async () => {
  await queue
  if (pending.value) await retry()
  if (pending.value) throw new Error('训练草稿尚未保存，已暂停更新；请重试保存')
})
onUnmounted(removeUpdateGuard)
</script>
<template>
  <section class="set-logger" :aria-label="exercise.name + '训练记录'">
    <p v-if="completed" class="record-success">
      ✓ 本次训练已记录 <RouterLink to="/history">查看历史 →</RouterLink>
    </p>
    <button
      v-else-if="!draft && date <= localDate()"
      class="button button--outline"
      type="button"
      :disabled="busy || !ready"
      @click="open"
    >
      {{ hasDraft ? '继续记录' : '记录本次训练' }}
    </button>
    <form v-if="draft && !completed" @submit.prevent="finish">
      <h3>记录实际完成情况</h3>
      <p class="small">
        {{ date }} · {{ exercise.load.label }}。仅提交勾选的组，未勾选的组不计入本次结果。
      </p>
      <fieldset :disabled="busy">
        <label v-if="weighted"
          >器械标识<input
            v-model="draft.equipmentKey"
            aria-label="器械标识"
            maxlength="100"
            placeholder="例如：学校健身房划船机 A"
        /></label>
        <label v-if="weighted"
          >可用重量档位（kg）<input
            v-model="draft.availableWeights"
            aria-label="可用重量档位（kg）"
            placeholder="例如：10, 12, 14；可留空"
          /><small>用逗号分隔，只填写这台器械实际可选的重量。</small></label
        >
        <div class="logger-rows">
          <div v-for="(row, index) in draft.rows" :key="row.id" class="logger-row">
            <strong>第 {{ index + 1 }} 组</strong>
            <label v-if="exercise.measurement === 'reps'"
              >实际次数<input
                v-model="row.reps"
                type="number"
                min="1"
                step="1"
                :aria-label="'第' + (index + 1) + '组实际次数'"
            /></label>
            <label v-else
              >实际时长（秒）<input
                v-model="row.seconds"
                type="number"
                min="1"
                step="1"
                :aria-label="'第' + (index + 1) + '组实际时长'"
            /></label>
            <label v-if="exercise.measurement === 'distance-duration'"
              >距离（米）<input
                v-model="row.meters"
                type="number"
                min="0"
                step="any"
                :aria-label="'第' + (index + 1) + '组距离'"
            /></label>
            <label v-if="weighted"
              >实际重量（kg）<input
                v-model="row.kg"
                type="number"
                min="0"
                max="1000"
                step="any"
                :aria-label="'第' + (index + 1) + '组实际重量'"
            /></label>
            <label v-if="exercise.load.kind === 'band'"
              >弹力带等级<input
                v-model="row.resistanceLabel"
                :aria-label="'第' + (index + 1) + '组弹力带等级'"
            /></label>
            <label
              >还能完成几次<input
                v-model="row.remainingReps"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="不确定可留空"
                :aria-label="'第' + (index + 1) + '组剩余能力'"
            /></label>
            <label class="completed-check"
              ><input
                v-model="row.completed"
                type="checkbox"
                :aria-label="'第' + (index + 1) + '组已完成'"
              />已完成</label
            >
          </div>
        </div>
        <label
          >训练备注<textarea
            v-model="draft.notes"
            maxlength="2000"
            aria-label="训练备注"
            rows="2"
          ></textarea>
        </label>
      </fieldset>
      <button class="button" :disabled="busy">{{ busy ? '正在保存…' : '完成并保存训练' }}</button>
    </form>
    <p v-if="message" class="small" role="status">{{ message }}</p>
    <div v-if="error" class="form-error" role="alert">
      {{ error }}
      <button v-if="draft" type="button" class="text-link" :disabled="busy" @click="retry">
        重试保存草稿
      </button>
    </div>
  </section>
</template>
