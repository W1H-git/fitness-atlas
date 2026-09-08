<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Exercise } from '../../types/exercise'
import { equipmentLabels, muscleLabels } from '../../types/exercise'
import { useExerciseStore } from '../../stores/exercise.store'
import ExerciseImage from './ExerciseImage.vue'
import AppIcon from '../common/AppIcon.vue'
defineProps<{ exercise: Exercise; index?: number }>()
const store = useExerciseStore()
const levels = { beginner: '新手', intermediate: '中级', advanced: '高级' }
</script>
<template>
  <RouterLink
    :to="'/exercises/' + exercise.id"
    class="exercise-card"
    :aria-label="'查看' + exercise.name"
  >
    <div class="card-image">
      <ExerciseImage :src="store.frameUrl(exercise.frames[0])" :alt="exercise.name + '，图 1'" />
      <span class="card-index">{{ String((index ?? 0) + 1).padStart(2, '0') }}</span>
      <span class="frame-badge">3 帧图解</span>
    </div>
    <div class="card-body">
      <div class="card-heading">
        <h2>{{ exercise.name }}</h2>
        <AppIcon name="arrow" />
      </div>
      <p class="english-name">{{ exercise.nameEn }}</p>
      <div class="card-meta">
        <span class="target-label"
          ><span class="target-dot"></span>{{ muscleLabels[exercise.primaryMuscle] }}</span
        ><span>{{ equipmentLabels[exercise.equipment] }} · {{ levels[exercise.difficulty] }}</span>
      </div>
      <span v-if="exercise.illustrationNotes.length" class="card-note">含图解差异说明</span>
    </div>
  </RouterLink>
</template>
