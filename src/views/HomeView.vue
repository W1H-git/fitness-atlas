<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import MuscleMap from '../components/exercise/MuscleMap.vue'
import AppIcon from '../components/common/AppIcon.vue'
import RecommendationCard from '../components/training/RecommendationCard.vue'
import { usePlanStore } from '../stores/plan.store'
import { useExerciseStore } from '../stores/exercise.store'
const plan = usePlanStore()
const catalog = useExerciseStore()
onMounted(() => {
  void plan.ensure()
  void catalog.load()
})
</script>
<template>
  <section class="home-hero">
    <div>
      <p class="eyebrow">KNOW YOUR MOVEMENT</p>
      <h1>每一次训练，<br />从理解开始<span class="heading-dot">.</span></h1>
      <p class="intro-text">
        302 个动作，三帧看懂细节。<br />找到你的目标肌群，让每一次练习都有方向。
      </p>
      <RouterLink to="/exercises" class="button">探索动作图鉴<AppIcon name="arrow" /></RouterLink>
      <p class="home-footnote">图解 · 肌群定位 · 动作要点</p>
    </div>
    <div class="home-map">
      <div class="section-heading">
        <span class="eyebrow">FOCUS / 目标肌群</span
        ><span class="small">{{
          plan.recommendation?.muscles[0] ? '本次主要目标之一' : '动作示例：胸部'
        }}</span>
      </div>
      <MuscleMap :muscle="plan.recommendation?.muscles[0] || 'Chest'" />
    </div>
  </section>
  <p v-if="plan.loading" role="status">正在准备今日安排…</p>
  <div v-if="plan.error || catalog.error" class="form-error" role="alert">
    {{ plan.error || catalog.error }}
    <button
      class="text-link"
      type="button"
      @click="catalog.error ? catalog.retryLoad() : plan.ensure(true)"
    >
      重新加载
    </button>
  </div>
  <RecommendationCard
    v-if="plan.recommendation?.day"
    :day="plan.recommendation.day"
    :exercises="catalog.items"
    :today="plan.today"
    :busy="plan.loading"
    @save="plan.adjust(plan.today, $event)"
  />
  <section v-else-if="!plan.loading && !plan.error" class="home-today">
    <div>
      <span class="eyebrow">YOUR FIRST STEP</span>
      <h2>从你的训练档案开始</h2>
      <p>选择目标、身体能力和可用器械，得到包含休息日的个人安排。</p>
    </div>
    <RouterLink class="button" to="/profile">设置训练档案 →</RouterLink>
  </section>
  <div class="home-features">
    <article>
      <span>01 / EXPLORE</span>
      <h2>看懂动作</h2>
      <p>静态三帧图解，自主切换，按自己的节奏学习。</p>
    </article>
    <article>
      <span>02 / FOCUS</span>
      <h2>找准目标</h2>
      <p>人体示意图标红主要目标，清楚区分协同肌群。</p>
    </article>
    <article>
      <span>03 / RECOVER</span>
      <h2>安排节奏</h2>
      <p>训练与休息都在计划中，每个建议都有原因。</p>
      <RouterLink class="text-link" to="/schedule">查看本周日程 ↗</RouterLink>
    </article>
  </div>
</template>
