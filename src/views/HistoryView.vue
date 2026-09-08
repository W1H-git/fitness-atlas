<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useTrainingStore } from '../stores/training.store'
import { useExerciseStore } from '../stores/exercise.store'
import SetLogger from '../components/training/SetLogger.vue'
import BackupPanel from '../components/training/BackupPanel.vue'
import { useProfileStore } from '../stores/profile.store'
import { prescribeExercise } from '../algorithms/prescribe-exercise'
import type { TrainingSet } from '../types/training'
const training = useTrainingStore(),
  catalog = useExerciseStore(),
  profile = useProfileStore()
const loading = ref(true),
  error = ref('')
const records = computed(() =>
  [...training.records].sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
)
function loadText(set: TrainingSet) {
  const value = set.load
  if (value.kind === 'external' || value.kind === 'assistance')
    return (value.kind === 'assistance' ? '辅助 ' : '') + value.kg + ' kg'
  return value.kind === 'band'
    ? value.resistanceLabel
    : value.kind === 'bodyweight'
      ? '自重'
      : '不计负重'
}
onMounted(async () => {
  try {
    await Promise.all([training.load(true), catalog.load()])
    if (catalog.error) throw new Error(catalog.error)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败'
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <header class="page-intro">
    <p class="eyebrow">YOUR PROGRESS</p>
    <h1>训练历史</h1>
    <p>记录实际完成的每一组，作为下一次推荐的依据。</p>
  </header>
  <p v-if="loading" role="status">正在读取本地记录…</p>
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  <template v-else-if="!loading">
    <section v-if="training.drafts.length && profile.profile" class="history-drafts">
      <h2>未完成草稿 · {{ training.drafts.length }}</h2>
      <article v-for="draft in training.drafts" :key="draft.id" class="prescription-card">
        <h3>{{ catalog.find(draft.exerciseId)?.name }} · {{ draft.date }}</h3>
        <SetLogger
          v-if="catalog.find(draft.exerciseId)"
          :exercise="catalog.find(draft.exerciseId)!"
          :date="draft.date"
          :prescription="
            prescribeExercise(catalog.find(draft.exerciseId)!, profile.profile, [], draft.date)
          "
        />
      </article>
    </section>
    <p v-if="!records.length" class="rest-panel">
      还没有完成记录。到日程中打开训练日，点击“记录本次训练”。
    </p>
    <article v-for="record in records" :key="record.id" class="history-record prescription-card">
      <div class="section-heading">
        <h2>
          <RouterLink :to="'/exercises/' + record.exerciseId">{{
            catalog.find(record.exerciseId)?.name || record.exerciseId
          }}</RouterLink>
        </h2>
        <span>{{ record.date }}</span>
      </div>
      <p class="small">
        {{ record.equipmentKey }} · {{ catalog.find(record.exerciseId)?.load.label }}
      </p>
      <ul>
        <li v-for="(set, index) in record.sets" :key="set.id">
          第 {{ index + 1 }} 组：{{
            set.measurement === 'reps' ? set.reps + ' 次' : set.seconds + ' 秒'
          }}<template v-if="set.measurement === 'distance-duration'">
            / {{ set.meters }} 米</template
          >
          · {{ loadText(set) }} · 剩余能力
          {{ set.remainingReps === null ? '未填写' : set.remainingReps + ' 次' }}
        </li>
      </ul>
      <p v-if="record.notes">备注：{{ record.notes }}</p>
    </article>
  </template>
  <BackupPanel />
</template>
