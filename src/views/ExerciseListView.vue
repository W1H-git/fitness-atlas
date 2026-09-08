<script setup lang="ts">
import { onMounted } from 'vue'
import { useExerciseStore } from '../stores/exercise.store'
import ExerciseCard from '../components/exercise/ExerciseCard.vue'
import ExerciseFilters from '../components/exercise/ExerciseFilters.vue'
import EmptyState from '../components/common/EmptyState.vue'
import AppIcon from '../components/common/AppIcon.vue'
const store = useExerciseStore()
onMounted(() => {
  void store.load()
})
</script>
<template>
  <div class="page-intro catalog-intro">
    <div>
      <p class="eyebrow">THE MOVEMENT LIBRARY</p>
      <h1>动作图鉴<span class="heading-dot">.</span></h1>
      <p class="intro-text">看清每一个动作，找到你的目标肌群。</p>
    </div>
    <div class="catalog-count">
      <strong>{{ store.items.length || '—' }}</strong
      ><span>个动作 · 每个动作 3 帧</span>
    </div>
  </div>
  <div class="catalog-layout">
    <ExerciseFilters />
    <section class="catalog-results" aria-label="动作列表" :aria-busy="store.status === 'loading'">
      <div class="search-box">
        <AppIcon name="search" /><label for="exercise-search" class="sr-only">搜索动作</label
        ><input
          id="exercise-search"
          v-model="store.query"
          type="search"
          placeholder="搜索动作、肌群或器械，如：卧推"
          autocomplete="off"
        /><kbd aria-hidden="true">搜索</kbd>
      </div>
      <div class="results-toolbar">
        <p role="status" aria-live="polite">
          {{
            store.status === 'ready'
              ? '找到 ' + store.results.length + ' 个动作'
              : '正在准备动作图鉴…'
          }}
        </p>
        <button v-if="store.activeFilters" class="text-button" @click="store.resetFilters">
          清空全部筛选</button
        ><span v-else class="small muted">红色标记主要目标</span>
      </div>
      <EmptyState
        v-if="store.status === 'error'"
        title="暂时无法打开动作库"
        :description="store.error"
        ><button class="button" @click="store.retryLoad">重新加载</button></EmptyState
      >
      <div v-else-if="store.status !== 'ready'" class="loading-state" role="status">
        正在加载动作数据…
      </div>
      <EmptyState
        v-else-if="!store.results.length"
        title="没有找到匹配的动作"
        description="换一个关键词，或减少肌群、器械与难度限制。"
        ><button class="button" @click="store.resetFilters">清空筛选</button></EmptyState
      >
      <template v-else>
        <div class="exercise-grid">
          <ExerciseCard
            v-for="(exercise, index) in store.visible"
            :key="exercise.id"
            :exercise="exercise"
            :index="index"
          />
        </div>
        <div class="load-more">
          <span>已展示 {{ store.visible.length }} / {{ store.results.length }} 个动作</span
          ><button
            v-if="store.visible.length < store.results.length"
            class="button button--outline"
            @click="store.showMore"
          >
            加载更多动作 <AppIcon name="arrow" />
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
