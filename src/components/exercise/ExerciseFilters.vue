<script setup lang="ts">
import { ref } from 'vue'
import { equipmentLabels, muscleLabels } from '../../types/exercise'
import { useExerciseStore } from '../../stores/exercise.store'
import AppIcon from '../common/AppIcon.vue'
import MuscleMap from './MuscleMap.vue'
const store = useExerciseStore()
const expanded = ref(false)
</script>
<template>
  <aside class="filter-sidebar" aria-label="动作筛选">
    <button
      class="filter-toggle"
      :aria-expanded="expanded"
      aria-controls="filter-panel"
      @click="expanded = !expanded"
    >
      <span
        ><AppIcon name="filter" />筛选动作
        <small v-if="store.activeFilters">({{ store.activeFilters }})</small></span
      ><span>{{ expanded ? '收起 −' : '展开 +' }}</span>
    </button>
    <div id="filter-panel" class="filter-panel" :class="{ expanded }">
      <div class="filter-heading">
        <h2>筛选动作</h2>
        <button class="text-button" @click="store.resetFilters">重置</button>
      </div>
      <div class="filter-field">
        <label for="muscle-filter">训练肌群</label>
        <select id="muscle-filter" v-model="store.muscle">
          <option value="">全部肌群</option>
          <option v-for="item in store.muscleOptions" :key="item" :value="item">
            {{ muscleLabels[item] }}
          </option>
        </select>
        <p class="field-hint">包含主要与协同肌群</p>
      </div>
      <div class="filter-field">
        <label for="equipment-filter">训练器械</label>
        <select id="equipment-filter" v-model="store.equipment">
          <option value="">全部器械</option>
          <option v-for="item in store.equipmentOptions" :key="item" :value="item">
            {{ equipmentLabels[item] }}
          </option>
        </select>
      </div>
      <div class="filter-field">
        <label for="level-filter">动作难度</label>
        <select id="level-filter" v-model="store.difficulty">
          <option value="">全部难度</option>
          <option value="beginner">新手</option>
          <option value="intermediate">中级</option>
          <option value="advanced">高级</option>
        </select>
      </div>
      <div class="filter-anatomy">
        <span class="eyebrow">BODY MAP / 肌群定位</span
        ><MuscleMap :muscle="store.muscle || undefined" compact />
      </div>
    </div>
  </aside>
</template>
