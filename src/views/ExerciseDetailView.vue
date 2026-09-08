<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useExerciseStore } from '../stores/exercise.store'
import { equipmentLabels, muscleLabels } from '../types/exercise'
import ExerciseFrames from '../components/exercise/ExerciseFrames.vue'
import MuscleMap from '../components/exercise/MuscleMap.vue'
import EmptyState from '../components/common/EmptyState.vue'
const route = useRoute()
const store = useExerciseStore()
const exercise = computed(() => store.find(String(route.params.id ?? '')))
const levels = { beginner: '新手', intermediate: '中级', advanced: '高级' }
const measurementLabels = {
  reps: '按次数记录',
  duration: '按时长记录',
  'distance-duration': '按距离与时长记录',
}
onMounted(() => {
  void store.load()
})
watch(
  exercise,
  (item) => {
    if (item) document.title = item.name + ' · 健身动作图鉴'
  },
  { immediate: true },
)
</script>
<template>
  <div class="detail-breadcrumb">
    <RouterLink to="/exercises">← 返回动作库</RouterLink
    ><span v-if="exercise">/ {{ exercise.name }}</span>
  </div>
  <EmptyState v-if="store.status === 'error'" title="动作数据加载失败" :description="store.error"
    ><button class="button" @click="store.retryLoad">重试</button></EmptyState
  >
  <div v-else-if="store.status !== 'ready'" class="loading-state" role="status">正在加载动作…</div>
  <template v-else-if="exercise">
    <div class="detail-title">
      <div>
        <p class="eyebrow">{{ exercise.nameEn }}</p>
        <h1>{{ exercise.name }}</h1>
      </div>
      <div class="detail-tags">
        <span>{{ equipmentLabels[exercise.equipment] }}</span
        ><span>{{ levels[exercise.difficulty] }}</span
        ><span>{{ measurementLabels[exercise.measurement] }}</span>
      </div>
    </div>
    <div class="detail-layout">
      <div class="detail-content">
        <ExerciseFrames :exercise="exercise" />
        <aside
          v-if="exercise.illustrationNotes.length"
          class="illustration-notes"
          aria-label="图解差异说明"
        >
          <h2>图解阅读提示</h2>
          <p v-for="note in exercise.illustrationNotes" :key="note">{{ note }}</p>
        </aside>
        <section class="instruction-section" aria-labelledby="steps-title">
          <div class="section-heading">
            <h2 id="steps-title">如何完成动作</h2>
            <span class="eyebrow">TECHNIQUE</span>
          </div>
          <ol class="step-list">
            <li v-for="(step, index) in exercise.steps" :key="index">
              <span class="step-number">0{{ index + 1 }}</span>
              <div>
                <h3>{{ ['准备姿势', '执行要点', '控制与结束'][index] }}</h3>
                <p>{{ step }}</p>
              </div>
            </li>
          </ol>
        </section>
        <div class="detail-notes-grid">
          <section class="note-card">
            <h2>变式要点</h2>
            <p>{{ exercise.variationNote }}</p>
          </section>
          <section class="note-card">
            <h2>避免这些错误</h2>
            <ul>
              <li v-for="mistake in exercise.commonMistakes" :key="mistake">{{ mistake }}</li>
            </ul>
          </section>
        </div>
        <details class="attribution-details">
          <summary>图解来源与许可</summary>
          <p>
            动作图解由
            <a :href="exercise.attribution.creatorUrl" target="_blank" rel="noopener noreferrer">{{
              exercise.attribution.creator
            }}</a>
            整理，原始姿态来源包含 Everkinetic。以每帧署名为准。
          </p>
          <ul>
            <li v-for="frame in exercise.frames" :key="frame.index">
              图 {{ frame.index }}：<a
                :href="frame.attribution.creatorUrl"
                target="_blank"
                rel="noopener noreferrer"
                >{{ frame.attribution.creator }}</a
              >
              ·
              <a :href="frame.attribution.licenseUrl" target="_blank" rel="noopener noreferrer">{{
                frame.attribution.license
              }}</a
              ><template v-if="frame.attribution.source">
                ·
                <a :href="frame.attribution.source.url" target="_blank" rel="noopener noreferrer"
                  >{{ frame.attribution.source.name }} 原图</a
                >
                <p>{{ frame.attribution.source.changes }}</p></template
              >
            </li>
          </ul>
          <p>本地保留原始 PNG；中文说明与肌群示意图由本应用独立编写。</p>
        </details>
      </div>
      <aside class="target-panel" aria-labelledby="target-title">
        <p class="eyebrow">TARGET MUSCLES</p>
        <h2 id="target-title">这次练哪里？</h2>
        <div class="primary-muscle">
          <span class="target-dot"></span><strong>{{ muscleLabels[exercise.primaryMuscle] }}</strong
          ><span>主要目标</span>
        </div>
        <MuscleMap :muscle="exercise.primaryMuscle" />
        <div class="secondary-muscles">
          <h3>协同肌群</h3>
          <p>
            {{
              exercise.secondaryMuscles.length
                ? exercise.secondaryMuscles.map((muscle) => muscleLabels[muscle]).join(' · ')
                : '暂无单独标注'
            }}
          </p>
        </div>
        <dl class="load-info">
          <dt>负重记录口径</dt>
          <dd>{{ exercise.load.label }}</dd>
          <dt>需要的器械</dt>
          <dd>{{ exercise.requiredEquipment.map((item) => equipmentLabels[item]).join('、') }}</dd>
        </dl>
      </aside>
    </div>
  </template>
  <EmptyState
    v-else
    title="没有找到这个动作"
    description="链接可能不完整，返回动作库重新选择即可。"
    symbol="404"
    ><RouterLink class="button" to="/exercises">浏览动作库</RouterLink></EmptyState
  >
</template>
