<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlanDay, Prescription } from '../../types/training'
import type { Exercise, Muscle } from '../../types/exercise'
import { muscleLabels } from '../../types/exercise'
import MuscleMap from '../exercise/MuscleMap.vue'
import PrescriptionPanel from './PrescriptionPanel.vue'
import SetLogger from './SetLogger.vue'
import { usePlanStore } from '../../stores/plan.store'
const planStore = usePlanStore()
const props = defineProps<{ day: PlanDay; exercises: Exercise[]; today: string; busy?: boolean }>()
defineEmits<{ save: [value: Prescription] }>()
const focus = ref<Muscle>()
const byId = computed(() => new Map(props.exercises.map((exercise) => [exercise.id, exercise])))
watch(
  () => props.day,
  (day) => {
    focus.value = day.kind === 'training' ? day.muscles[0] : undefined
  },
  { immediate: true },
)
</script>
<template>
  <section class="recommendation-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ day.date }} / {{ day.date === today ? 'TODAY' : 'YOUR PLAN' }}</p>
        <h2>{{ day.kind === 'rest' ? '今天，好好恢复' : day.label || '今日训练' }}</h2>
      </div>
      <span v-if="day.kind === 'training'" class="small">{{
        day.status === 'completed'
          ? '已完成'
          : day.date < today
            ? '已过去 · 不自动补练'
            : '计划训练'
      }}</span>
    </div>
    <div v-if="day.kind === 'rest'" class="rest-panel">
      <span aria-hidden="true">○</span>
      <p>{{ day.reason }}</p>
      <p class="small">可以轻松散步、保持日常活动，按自己的状态安排。</p>
    </div>
    <template v-else>
      <p>依据本周训练日与恢复间隔安排；漏练不会叠加到次日。</p>
      <div v-if="day.muscles.length" class="training-focus">
        <MuscleMap :muscle="focus" compact />
        <div>
          <p class="eyebrow">主要目标 · 点击查看标红位置</p>
          <div class="muscle-choices">
            <button
              v-for="muscle in day.muscles"
              :key="muscle"
              type="button"
              :aria-pressed="focus === muscle"
              @click="focus = muscle"
            >
              {{ muscleLabels[muscle] }}
            </button>
          </div>
          <p class="small">逐个展示本次动作的主要发力部位，协同肌群见动作详情。</p>
        </div>
      </div>
      <p v-for="warning in day.warnings" :key="warning" class="training-notice">{{ warning }}</p>
      <div v-if="day.missingSlots?.length" class="training-notice" role="status">
        <strong>部分动作暂未安排</strong>
        <ul>
          <li v-for="(missing, index) in day.missingSlots" :key="index">{{ missing }}</li>
        </ul>
        <p>可以调整可用器械或训练日期；无需用不合适的动作凑数。</p>
      </div>
      <div class="prescription-list">
        <template
          v-for="prescription in day.prescriptions"
          :key="day.date + prescription.exerciseId"
        >
          <PrescriptionPanel
            v-if="byId.has(prescription.exerciseId)"
            :prescription="prescription"
            :exercise="byId.get(prescription.exerciseId)!"
            :editable="day.date >= today && day.status === 'planned'"
            :busy="busy"
            @save="$emit('save', $event)"
          >
            <SetLogger
              :exercise="byId.get(prescription.exerciseId)!"
              :prescription="prescription"
              :date="day.date"
              @committed="planStore.reload()"
            />
          </PrescriptionPanel>
        </template>
      </div>
    </template>
  </section>
</template>
