<script setup lang="ts">
import { computed } from 'vue'
import { backShapes, frontShapes, muscleRegions } from '../../data/muscle-map'
import type { Muscle } from '../../types/exercise'
import { muscleLabels } from '../../types/exercise'

const props = defineProps<{ muscle?: Muscle; compact?: boolean }>()
const activeRegions = computed(() => (props.muscle ? muscleRegions[props.muscle] : []))
const label = computed(() => (props.muscle ? muscleLabels[props.muscle] : '全身肌群'))
const sides = [
  { name: '正面', shapes: frontShapes },
  { name: '背面', shapes: backShapes },
]
const silhouette =
  'M106 59 L103 69 Q88 74 77 78 Q66 82 61 100 L49 150 L32 207 L30 226 Q33 236 39 230 L46 215 L57 189 L68 158 L79 126 L87 153 L91 179 L86 211 Q80 248 86 282 L89 314 L86 355 L86 387 L78 403 Q76 410 87 410 L102 407 L106 384 L112 357 L111 323 L117 287 L120 246 L123 287 L129 323 L128 357 L134 384 L138 407 L153 410 Q164 410 162 403 L154 387 L154 355 L151 314 L154 282 Q160 248 154 211 L149 179 L153 153 L161 126 L172 158 L183 189 L194 215 L201 230 Q207 236 210 226 L208 207 L191 150 L179 100 Q174 82 163 78 Q152 74 137 69 L134 59'
</script>

<template>
  <figure class="muscle-map" :class="{ 'muscle-map--compact': compact }">
    <div class="body-pair">
      <div v-for="side in sides" :key="side.name" class="body-side">
        <svg
          viewBox="20 0 200 422"
          role="img"
          :aria-label="
            label + '位置示意，' + side.name + (activeRegions.length ? '，红色为主要目标区域' : '')
          "
        >
          <g class="body-outline">
            <path
              d="M103 17 Q107 5 120 5 Q133 5 137 17 L137 35 Q135 52 128 58 L112 58 Q105 52 103 35 Z"
            />
            <path :d="silhouette" />
          </g>
          <g
            v-for="mirror in [false, true]"
            :key="String(mirror)"
            :transform="mirror ? 'translate(240 0) scale(-1 1)' : undefined"
          >
            <path
              v-for="(shape, index) in side.shapes"
              :key="index"
              :d="shape.d"
              class="muscle-region"
              :class="{ 'is-primary': activeRegions.includes(shape.region) }"
              :data-region="shape.region"
              :data-primary="activeRegions.includes(shape.region)"
            />
          </g>
          <path d="M120 65 V190 M89 313 H109 M131 313 H151" class="body-seam" />
        </svg>
        <span>{{ side.name }}</span>
      </div>
    </div>
    <figcaption v-if="muscle && activeRegions.length" class="map-legend">
      <span class="target-dot" aria-hidden="true"></span>
      <span>{{ compact ? '肌群定位' : '主要目标' }} · {{ label }}</span>
    </figcaption>
    <figcaption v-else class="muted small">
      {{ muscle ? label + '属于整体训练指标，不对应单块肌肉。' : '选择肌群，查看对应位置' }}
    </figcaption>
    <p v-if="!compact" class="map-note">简化位置示意，红色不表示发力强度或比例。</p>
  </figure>
</template>
