<script setup lang="ts">
import type { WeeklyPlan } from '../../types/training'
import { weekdayLabels } from '../../data/recommendation-rules'
defineProps<{ plan: WeeklyPlan; selected: string; today: string }>()
defineEmits<{ select: [date: string] }>()
</script>
<template>
  <div class="training-week" aria-label="七天训练日历">
    <button
      v-for="(day, index) in plan.days"
      :key="day.date"
      type="button"
      :class="{ 'is-selected': selected === day.date, 'is-rest': day.kind === 'rest' }"
      :aria-pressed="selected === day.date"
      :aria-label="day.date + ' ' + (day.kind === 'rest' ? '休息' : day.label || '训练')"
      @click="$emit('select', day.date)"
    >
      <span>{{ weekdayLabels[index] }} <small v-if="day.date === today">今天</small></span>
      <strong>{{ day.date.slice(5).replace('-', ' / ') }}</strong>
      <span>{{ day.kind === 'rest' ? '○ 休息' : day.label || '训练' }}</span>
      <small v-if="day.kind === 'training'">{{
        day.status === 'completed'
          ? '已完成'
          : day.date < today
            ? '已过去'
            : day.prescriptions.length + ' 个动作'
      }}</small>
    </button>
  </div>
</template>
