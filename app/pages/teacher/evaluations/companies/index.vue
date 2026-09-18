<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type ScoreKey = 'workAlignmentScore' | 'workScopeScore' | 'learningOpportunityScore' | 'supervisorReadinessScore' | 'studentSupportScore' | 'environmentScore' | 'safetyScore' | 'resourcesScore' | 'welfareScore' | 'travelScore' | 'transportScore' | 'accommodationScore' | 'coordinationScore'
type Evaluation = Record<ScoreKey, number | null> & {
  observations: string | null
  companyNeeds: string | null
  problems: string | null
  recommendations: string | null
  futureRecommendation: string | null
  teacherUser?: { prefix: string | null, firstName: string | null, lastName: string | null }
}
interface Item {
  appointmentId: number
  appointmentStatus: 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED'
  companyName: string
  groupName: string
  roundNo: number
  cycle: { term: number, academicYear: number }
  evaluation: Evaluation | null
}

const { data: items, status, error, refresh } = await useFetch<Item[]>('/api/teacher/company-evaluations')
const notify = useNotify()
const route = useRoute()
const search = ref('')
const filter = ref<'ALL' | 'NOT_STARTED' | 'SUBMITTED'>('ALL')
const selected = ref<Item | null>(null)
const open = ref(false)
const saving = ref(false)
const appointmentId = computed(() => {
  const value = route.query.appointmentId
  const id = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(id) && id > 0 ? id : null
})
const scoreLabels: Array<{ key: ScoreKey, label: string }> = [
  { key: 'workAlignmentScore', label: 'ความสอดคล้องของงานกับสาขา' },
  { key: 'workScopeScore', label: 'ขอบเขตและความท้าทายของงาน' },
  { key: 'learningOpportunityScore', label: 'โอกาสเรียนรู้และพัฒนาทักษะ' },
  { key: 'supervisorReadinessScore', label: 'ความพร้อมของผู้ควบคุมงาน' },
  { key: 'studentSupportScore', label: 'การดูแลและช่วยเหลือนักศึกษา' },
  { key: 'environmentScore', label: 'สภาพแวดล้อมในการทำงาน' },
  { key: 'safetyScore', label: 'ความปลอดภัยและสุขอนามัย' },
  { key: 'resourcesScore', label: 'อุปกรณ์และทรัพยากร' },
  { key: 'welfareScore', label: 'สวัสดิการ/ค่าตอบแทน' },
  { key: 'travelScore', label: 'ความสะดวกและปลอดภัยในการเดินทาง' },
  { key: 'transportScore', label: 'การเข้าถึงขนส่งสาธารณะ' },
  { key: 'accommodationScore', label: 'ความเหมาะสมของที่พัก' },
  { key: 'coordinationScore', label: 'การประสานงานกับมหาวิทยาลัย' }
]
const form = reactive<Record<ScoreKey | 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation', number | null | string>>(Object.fromEntries([...scoreLabels.map(item => [item.key, null]), ['observations', ''], ['companyNeeds', ''], ['problems', ''], ['recommendations', ''], ['futureRecommendation', '']]) as Record<ScoreKey | 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation', number | null | string>)
const state = (item: Item) => item.evaluation ? 'SUBMITTED' : 'NOT_STARTED'
const info = (item: Item) => ({ NOT_STARTED: { label: 'ยังไม่เริ่มประเมิน', color: 'warning' as const }, SUBMITTED: { label: 'ประเมินแล้ว', color: 'success' as const } }[state(item)])
const evaluatorName = (evaluation: Evaluation | null) => evaluation?.teacherUser
  ? `${evaluation.teacherUser.prefix || ''}${evaluation.teacherUser.firstName || ''} ${evaluation.teacherUser.lastName || ''}`.trim()
  : ''
const filtered = computed(() => (items.value ?? []).filter(item => (!appointmentId.value || item.appointmentId === appointmentId.value) && (!search.value || [item.companyName, item.groupName, item.appointmentId].join(' ').toLowerCase().includes(search.value.trim().toLowerCase())) && (filter.value === 'ALL' || state(item) === filter.value)))
const edit = (item: Item) => {
  selected.value = item
  scoreLabels.forEach(score => { form[score.key] = item.evaluation?.[score.key] ?? null })
  ;(['observations', 'companyNeeds', 'problems', 'recommendations', 'futureRecommendation'] as const).forEach(key => { form[key] = item.evaluation?.[key] ?? '' })
  open.value = true
}
const setScore = (key: ScoreKey, value: number, checked: boolean | 'indeterminate') => {
  form[key] = checked ? value : form[key] === value ? null : form[key]
}
const submit = async () => {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/teacher/company-evaluations/${selected.value.appointmentId}`, { method: 'PUT', body: form })
    notify.success(selected.value.evaluation ? 'บันทึกการแก้ไขเรียบร้อยแล้ว' : 'บันทึกแบบประเมินเรียบร้อยแล้ว')
    open.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถบันทึกแบบประเมินได้')
  } finally {
    saving.value = false
  }
}
const columns: TableColumn<Item>[] = [
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { id: 'context', header: 'นัดหมาย / กลุ่ม' },
  { id: 'state', header: 'สถานะ' },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-company-evaluations">
    <template #header><UDashboardNavbar title="ประเมินสถานประกอบการ"><template #leading><UDashboardSidebarCollapse /></template><template #right><AppNotificationBell /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดงานประเมินได้" :description="error.message" />
        <UAlert v-else-if="appointmentId" color="info" variant="subtle" title="งานนิเทศที่เลือก" :description="`แสดงสถานประกอบการจากนัดหมาย #${appointmentId} — ประเมินหรือแก้ไขผลได้ทันที`" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหาบริษัท กลุ่ม หรือนัดหมาย" class="sm:max-w-sm" />
          <div class="flex flex-col gap-3 sm:ml-auto sm:flex-row">
            <USelect v-model="filter" :items="[{ label: 'ทุกสถานะ', value: 'ALL' }, { label: 'ยังไม่เริ่มประเมิน', value: 'NOT_STARTED' }, { label: 'ประเมินแล้ว', value: 'SUBMITTED' }]" value-key="value" class="sm:w-48" />
            <UIButtonRefresh class="self-start" :loading="status === 'pending'" @refresh="refresh" />
          </div>
        </div>
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="filtered" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #context-cell="{ row }">นัดหมาย #{{ row.original.appointmentId }} · {{ row.original.groupName }} · ครั้งที่ {{ row.original.roundNo }}</template>
            <template #state-cell="{ row }"><div class="space-y-1"><UBadge :color="info(row.original).color" variant="subtle">{{ info(row.original).label }}</UBadge><div v-if="evaluatorName(row.original.evaluation)" class="text-xs text-muted">{{ evaluatorName(row.original.evaluation) }}</div></div></template>
            <template #actions-cell="{ row }"><UButton :label="state(row.original) === 'SUBMITTED' ? 'แก้ไขผล' : 'ประเมิน'" color="primary" variant="ghost" size="xs" @click="edit(row.original)" /></template>
            <template #empty><div class="py-12 text-center text-muted">ยังไม่มีสถานประกอบการที่อยู่ในรายการนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="open" :title="selected ? `ประเมิน ${selected.companyName}` : 'ประเมินสถานประกอบการ'">
    <template #body>
      <div v-if="selected" class="space-y-5">
        <p class="text-sm text-muted">บันทึกแล้วสามารถกลับมาแก้ไขได้ตลอด</p>
        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="min-w-full text-sm">
            <thead class="bg-muted/30 text-muted"><tr><th class="min-w-64 px-3 py-2 text-left font-medium">หัวข้อประเมิน</th><th v-for="score in [5, 4, 3, 2, 1]" :key="score" class="w-14 px-2 py-2 text-center font-medium">{{ score }}</th></tr></thead>
            <tbody><tr v-for="item in scoreLabels" :key="item.key" class="border-t border-default"><th scope="row" class="px-3 py-2 text-left font-medium text-highlighted">{{ item.label }}</th><td v-for="score in [5, 4, 3, 2, 1]" :key="score" class="px-2 py-2 text-center"><UCheckbox :model-value="form[item.key] === score" :aria-label="`${item.label}: ${score} คะแนน`" @update:model-value="setScore(item.key, score, $event)" /></td></tr></tbody>
          </table>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField v-for="field in [{ key: 'observations', label: 'ข้อสังเกตจากการนิเทศ' }, { key: 'companyNeeds', label: 'ความต้องการของสถานประกอบการ' }, { key: 'problems', label: 'ปัญหาที่พบ' }, { key: 'recommendations', label: 'ข้อเสนอแนะ' }, { key: 'futureRecommendation', label: 'คำแนะนำสำหรับรุ่นต่อไป' }]" :key="field.key" :label="field.label">
            <UTextarea v-model="form[field.key as 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation'] as string" />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer><div class="flex justify-end"><UButton color="primary" :label="selected?.evaluation ? 'บันทึกการแก้ไข' : 'บันทึกแบบประเมิน'" :loading="saving" @click="submit" /></div></template>
  </UModal>
</template>
