<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { usePlanStore } from '../stores/plan.store'
import { useExerciseStore } from '../stores/exercise.store'
import WeekCalendar from '../components/training/WeekCalendar.vue'
import RecommendationCard from '../components/training/RecommendationCard.vue'
const store = usePlanStore()
const catalog = useExerciseStore()
const selected = ref(store.today)
const day = computed(() => store.plan?.days.find((item) => item.date === selected.value))
watch(
  () => store.today,
  (date) => {
    selected.value = date
  },
)
onMounted(() => {
  void store.ensure()
  void catalog.load()
})
</script>
<template>
  <header class="page-intro">
    <p class="eyebrow">TRAIN / RECOVER / REPEAT</p>
    <h1>一周，有练有歇</h1>
    <p>七天的节奏，让训练和恢复各就其位。</p>
  </header>
  <p v-if="store.loading" role="status">正在准备训练计划…</p>
  <div v-if="store.error || catalog.error" class="form-error" role="alert">
    {{ store.error || catalog.error }}
    <button
      type="button"
      class="text-link"
      @click="catalog.error ? catalog.retryLoad() : store.ensure(true)"
    >
      重新加载
    </button>
  </div>
  <template v-if="store.plan">
    <div class="section-heading">
      <p>本周 {{ store.plan.weekStart }} 起 · 规则 {{ store.plan.ruleVersion }}</p>
      <RouterLink class="text-link" to="/profile">修改档案 ↗</RouterLink>
    </div>
    <WeekCalendar
      :plan="store.plan"
      :selected="selected"
      :today="store.today"
      @select="selected = $event"
    />
    <RecommendationCard
      v-if="day"
      :day="day"
      :today="store.today"
      :exercises="catalog.items"
      :busy="store.loading"
      @save="store.adjust(day!.date, $event)"
    />
    <p class="small">计划与手动调整已保存在本机。重新生成会根据实际记录更新未完成的建议。</p>
    <RouterLink class="text-link" to="/history">查看训练历史与草稿 →</RouterLink>
    <button
      class="button button--outline"
      type="button"
      :disabled="store.loading"
      @click="store.ensure(true)"
    >
      重新生成未完成日程
    </button>
  </template>
  <section v-else-if="!store.loading && !store.error" class="rest-panel">
    <h2>先设置你的训练档案</h2>
    <p>选择目标、能力和器械后，这里会展示真实的七天安排。</p>
    <RouterLink class="button" to="/profile">设置训练档案 →</RouterLink>
  </section>
</template>
