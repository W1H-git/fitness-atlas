<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { registerUpdateGuard } from '../../pwa/update-guards'
import { RouterLink } from 'vue-router'
import type { Exercise } from '../../types/exercise'
import { muscleLabels } from '../../types/exercise'
import type { Prescription } from '../../types/training'
import { validatePrescription } from '../../utils/validate-prescription'

const props = defineProps<{
  prescription: Prescription
  exercise: Exercise
  editable?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ save: [value: Prescription] }>()
const editing = ref(false)
onUnmounted(
  registerUpdateGuard(async () => {
    if (editing.value) throw new Error('请先保存或取消正在调整的训练建议，再更新')
  }),
)
const sets = ref(2),
  minimum = ref(8),
  maximum = ref(12),
  rest = ref(120)
const weight = ref<number | string>('')
const error = ref('')
const range = computed(() => {
  const p = props.prescription
  return p.measurement === 'reps'
    ? p.reps.min + '–' + p.reps.max + ' 次'
    : p.measurement === 'duration'
      ? p.seconds.min + '–' + p.seconds.max + ' 秒'
      : p.seconds + ' 秒'
})
const loadText = computed(() => {
  const suggestion = props.prescription.load
  if (suggestion.status === 'needs-calibration') return '待试重'
  const value = suggestion.value
  if (value.kind === 'bodyweight') return '自重'
  if (value.kind === 'none') return '无需负重'
  if (value.kind === 'band') return value.resistanceLabel
  if (value.kind === 'external' || value.kind === 'assistance')
    return (value.kind === 'assistance' ? '辅助 ' : '') + value.kg + ' kg'
  return '无需负重'
})
const weighted = computed(() => ['external', 'assistance'].includes(props.exercise.load.kind))
function startEdit() {
  const p = props.prescription
  sets.value = p.sets
  rest.value = p.restSeconds
  minimum.value =
    p.measurement === 'reps' ? p.reps.min : p.measurement === 'duration' ? p.seconds.min : p.seconds
  maximum.value =
    p.measurement === 'reps' ? p.reps.max : p.measurement === 'duration' ? p.seconds.max : p.seconds
  const load = p.load
  weight.value =
    load.status === 'suggested' &&
    (load.value.kind === 'external' || load.value.kind === 'assistance')
      ? load.value.kg
      : ''
  error.value = ''
  editing.value = true
}
function save() {
  try {
    const value: Prescription = structuredClone(props.prescription)
    value.sets = Number(sets.value)
    value.restSeconds = Number(rest.value)
    if (value.measurement === 'reps')
      value.reps = { min: Number(minimum.value), max: Number(maximum.value) }
    else if (value.measurement === 'duration')
      value.seconds = { min: Number(minimum.value), max: Number(maximum.value) }
    else value.seconds = Number(minimum.value)
    const convention = props.exercise.load
    if (weighted.value && (convention.kind === 'external' || convention.kind === 'assistance')) {
      value.load =
        weight.value === ''
          ? {
              status: 'needs-calibration',
              convention,
              reason: '用户保留待试重，本次尚未确认工作重量。',
            }
          : {
              status: 'suggested',
              value: { kind: convention.kind, basis: convention.basis, kg: Number(weight.value) },
              reason: '用户手动选择的计划重量，未作为实际训练记录。',
              basedOnRecordIds: [],
            }
    }
    validatePrescription(value, props.exercise)
    emit('save', value)
    // Close only after the parent replaces the prescription following a successful save.
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '输入无效'
  }
}
watch(
  () => props.prescription,
  () => {
    editing.value = false
    error.value = ''
  },
)
</script>
<template>
  <article class="prescription-card">
    <div class="prescription-heading">
      <div>
        <span class="target-label">{{ muscleLabels[exercise.primaryMuscle] }}</span>
        <h3>
          <RouterLink :to="'/exercises/' + exercise.id">{{ exercise.name }} ↗</RouterLink>
        </h3>
      </div>
      <button
        v-if="editable && !editing"
        class="text-link"
        type="button"
        :disabled="busy"
        @click="startEdit"
      >
        调整建议
      </button>
    </div>
    <div class="prescription-numbers">
      <strong>{{ prescription.sets }} <small>组</small></strong
      ><strong>{{ range }}</strong
      ><strong>{{ loadText }}</strong>
    </div>
    <p class="small">{{ exercise.load.label }} · 组间休息 {{ prescription.restSeconds }} 秒</p>
    <p>{{ prescription.load.reason }}</p>
    <details>
      <summary>推荐依据</summary>
      <p>{{ prescription.reason }}</p>
      <p
        v-if="prescription.load.status === 'suggested' && prescription.load.basedOnRecordIds.length"
      >
        依据记录：{{ prescription.load.basedOnRecordIds.join('、') }}
      </p>
    </details>
    <form v-if="editing" class="prescription-editor" @submit.prevent="save">
      <label>组数<input v-model="sets" type="number" min="1" max="10" step="1" required /></label>
      <label
        >{{ prescription.measurement === 'reps' ? '次数下限' : '时长下限（秒）'
        }}<input v-model="minimum" type="number" min="1" step="1" required
      /></label>
      <label v-if="prescription.measurement !== 'distance-duration'"
        >{{ prescription.measurement === 'reps' ? '次数上限' : '时长上限（秒）'
        }}<input v-model="maximum" type="number" min="1" step="1" required
      /></label>
      <label
        >休息（秒）<input v-model="rest" type="number" min="15" max="600" step="1" required
      /></label>
      <label v-if="weighted"
        >计划重量（kg）<input
          v-model="weight"
          aria-label="计划重量（kg）"
          type="number"
          min="0"
          max="1000"
          step="any"
          placeholder="留空表示待试重"
        /><small>{{ exercise.load.label }}</small></label
      >
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button class="button" :disabled="busy">保存调整</button
        ><button
          type="button"
          class="button button--outline"
          :disabled="busy"
          @click="editing = false"
        >
          取消
        </button>
      </div>
    </form>
    <slot />
  </article>
</template>
