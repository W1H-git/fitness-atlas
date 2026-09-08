<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { registerUpdateGuard } from '../pwa/update-guards'
import { RouterLink } from 'vue-router'
import { equipmentLabels } from '../types/exercise'
import type { Equipment } from '../types/exercise'
import type { UserProfile, AbilityLevel, Weekday } from '../types/profile'
import { abilityLabels, goalLabels, weekdayLabels } from '../data/recommendation-rules'
import { trainingTemplates } from '../data/training-templates'
import { profileErrors } from '../utils/validate-profile'
import { useProfileStore } from '../stores/profile.store'
import { usePlanStore } from '../stores/plan.store'
import BackupPanel from '../components/training/BackupPanel.vue'
import OfflineDownload from '../components/pwa/OfflineDownload.vue'
import InstallHint from '../components/pwa/InstallHint.vue'
const profileStore = useProfileStore()
const planStore = usePlanStore()
const form = reactive<UserProfile>({
  id: 'local-user',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: Object.keys(equipmentLabels) as Equipment[],
  trainingDays: [1, 3, 5],
})
const loading = ref(true),
  saving = ref(false),
  saved = ref(false),
  error = ref('')
const errors = computed(() => profileErrors(form))
let restoredForm = JSON.stringify(form)
onUnmounted(
  registerUpdateGuard(async () => {
    if (saving.value || JSON.stringify(form) !== restoredForm)
      throw new Error('请先保存档案修改，再更新应用')
  }),
)
onMounted(async () => {
  try {
    await profileStore.load()
    if (profileStore.profile) Object.assign(form, structuredClone(profileStore.profile))
    restoredForm = JSON.stringify(form)
  } catch {
    error.value = '档案加载失败，请刷新重试'
  } finally {
    loading.value = false
  }
})
function changeAbility(event: Event) {
  form.ability = (event.target as HTMLSelectElement).value as AbilityLevel
  form.trainingDays = [...trainingTemplates[form.ability].days]
}
async function save() {
  saved.value = false
  error.value = ''
  if (errors.value.length || !profileStore.ready) return
  saving.value = true
  try {
    await profileStore.save(JSON.parse(JSON.stringify(form)) as UserProfile)
    await planStore.ensure(true)
    if (planStore.error) throw new Error(planStore.error)
    saved.value = true
    restoredForm = JSON.stringify(form)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重试'
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <header class="page-intro">
    <p class="eyebrow">YOUR STARTING POINT</p>
    <h1>我的训练档案</h1>
    <p>让安排适合你的目标、能力与器械。</p>
  </header>
  <p class="training-notice">
    档案、日程与训练记录保存在当前浏览器，刷新后会自动恢复。换设备可通过下方备份迁移。
  </p>
  <RouterLink class="button button--outline" to="/history">查看训练历史与草稿 →</RouterLink>
  <p v-if="loading" role="status">正在读取档案…</p>
  <form v-else class="profile-form" @submit.prevent="save" @input="saved = false">
    <fieldset :disabled="saving || !profileStore.ready">
      <legend>01 / 训练起点</legend>
      <div class="profile-fields">
        <label
          >训练目标<select v-model="form.goal" aria-label="训练目标">
            <option v-for="(label, key) in goalLabels" :key="key" :value="key">{{ label }}</option>
          </select></label
        >
        <label
          >身体能力<select :value="form.ability" aria-label="身体能力" @change="changeAbility">
            <option v-for="(label, key) in abilityLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select></label
        >
      </div>
      <p class="small">调整能力后恢复对应的默认训练日。等级决定起始训练量，不直接决定公斤数。</p>
    </fieldset>
    <fieldset :disabled="saving">
      <legend>02 / 每周训练日</legend>
      <p>
        请选择
        {{
          form.ability === 'beginner' ? '3 天，训练日之间至少休息一天' : '4 天，按上下肢交替安排'
        }}。
      </p>
      <div class="weekday-choices">
        <label v-for="(label, index) in weekdayLabels" :key="label"
          ><input v-model="form.trainingDays" type="checkbox" :value="(index + 1) as Weekday" />{{
            label
          }}</label
        >
      </div>
      <button
        type="button"
        class="text-link"
        @click="form.trainingDays = [...trainingTemplates[form.ability].days]"
      >
        恢复默认训练日
      </button>
    </fieldset>
    <fieldset :disabled="saving">
      <legend>03 / 可用器械</legend>
      <div class="form-actions">
        <button
          type="button"
          class="text-link"
          @click="form.availableEquipment = Object.keys(equipmentLabels) as Equipment[]"
        >
          完整健身房</button
        ><button type="button" class="text-link" @click="form.availableEquipment = ['Bodyweight']">
          仅自重
        </button>
      </div>
      <div class="equipment-choices">
        <label v-for="(label, key) in equipmentLabels" :key="key"
          ><input v-model="form.availableEquipment" type="checkbox" :value="key" />{{
            label
          }}</label
        >
      </div>
    </fieldset>
    <div v-if="errors.length" class="form-error" role="status">
      <p v-for="message in errors" :key="message">{{ message }}</p>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button class="button" :disabled="saving || !!errors.length || !profileStore.ready">
        {{ saving ? '正在生成…' : '保存档案并生成计划' }}
      </button>
      <RouterLink v-if="saved" class="button button--outline" to="/schedule"
        >查看本周日程 →</RouterLink
      >
    </div>
    <p v-if="saved" role="status">档案已更新，本周计划已生成。过去及已完成的日程会保留。</p>
  </form>
  <BackupPanel />
  <OfflineDownload />
  <InstallHint />
</template>
