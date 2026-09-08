<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Exercise } from '../../types/exercise'
import { useExerciseStore } from '../../stores/exercise.store'
import ExerciseImage from './ExerciseImage.vue'
const props = defineProps<{ exercise: Exercise }>()
const store = useExerciseStore()
const active = ref(0)
const controls = ref<HTMLElement | null>(null)
watch(
  () => props.exercise.id,
  () => {
    active.value = 0
  },
)
function move(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  active.value =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? 2
        : (active.value + (event.key === 'ArrowRight' ? 1 : 2)) % 3
  controls.value?.querySelectorAll('button')[active.value]?.focus()
}
</script>
<template>
  <section class="frames-section" aria-label="三帧动作图解">
    <div class="frames-heading">
      <span class="eyebrow">MOVEMENT / 动作图解</span
      ><span class="small muted">静态三帧 · 自主查看</span>
    </div>
    <div class="frames-grid">
      <figure
        v-for="(frame, index) in exercise.frames"
        :key="frame.path"
        class="frame-panel"
        :class="{ 'is-selected': index === active }"
      >
        <ExerciseImage
          :src="store.frameUrl(frame)"
          :alt="exercise.name + '，图 ' + frame.index"
          eager
        />
        <figcaption>
          <span>图 {{ frame.index }}</span
          ><span>{{ String(frame.index).padStart(2, '0') }} / 03</span>
        </figcaption>
      </figure>
    </div>
    <div ref="controls" class="frame-controls" aria-label="选择图解" @keydown="move">
      <button
        v-for="(_, index) in exercise.frames"
        :key="index"
        :aria-pressed="active === index"
        :aria-label="'查看图 ' + (index + 1)"
        @click="active = index"
      >
        图 {{ index + 1 }}
      </button>
    </div>
    <p class="field-hint">图帧按原素材顺序展示；完整动作步骤见下方说明。</p>
  </section>
</template>
