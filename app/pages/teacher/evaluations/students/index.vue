<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface Item {
  appointmentId: number
  appointmentStatus: 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED'
  companyName: string
  groupName: string
  roundNo: number
  cycle: { term: number, academicYear: number }
  student: { id: number, studentId: string, name: string, position: string | null }
  evaluation: ({ responsibilityScore: number | null, disciplineScore: number | null, communicationScore: number | null, knowledgeScore: number | null, workQualityScore: number | null, problemSolvingScore: number | null, strengths: string | null, problems: string | null, recommendations: string | null, followUp: string | null }) | null
}
type ScoreKey = 'responsibilityScore' | 'disciplineScore' | 'communicationScore' | 'knowledgeScore' | 'workQualityScore' | 'problemSolvingScore'

const { data: items, status, error, refresh } = await useFetch<Item[]>('/api/teacher/student-evaluations')
const notify = useNotify()
const route = useRoute()
const search = ref('')
const filter = ref<'ALL' | 'NOT_STARTED' | 'SUBMITTED'>('ALL')
const appointmentId = computed(() => {
  const value = route.query.appointmentId
  const id = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(id) && id > 0 ? id : null
})
const selected = ref<Item | null>(null)
const open = ref(false)
const saving = ref(false)
const form = reactive<Record<ScoreKey | 'strengths' | 'problems' | 'recommendations' | 'followUp', number | null | string>>({ responsibilityScore: null, disciplineScore: null, communicationScore: null, knowledgeScore: null, workQualityScore: null, problemSolvingScore: null, strengths: '', problems: '', recommendations: '', followUp: '' })
const scoreLabels: Array<{ key: ScoreKey, label: string }> = [
  { key: 'responsibilityScore', label: 'ความรับผิดชอบและตรงต่อเวลา' },
  { key: 'disciplineScore', label: 'วินัยและจรรยาบรรณในการทำงาน' },
  { key: 'communicationScore', label: 'การสื่อสารและทำงานร่วมกับผู้อื่น' },
  { key: 'knowledgeScore', label: 'การประยุกต์ใช้ความรู้กับงาน' },
  { key: 'workQualityScore', label: 'คุณภาพและความก้าวหน้าของงาน' },
  { key: 'problemSolvingScore', label: 'การเรียนรู้และแก้ไขปัญหา' }
]
const evaluationState = (item: Item) => item.evaluation ? 'SUBMITTED' : 'NOT_STARTED'
const filtered = computed(() => (items.value ?? []).filter((item) => {
  const keyword = search.value.trim().toLowerCase()
  return (!appointmentId.value || item.appointmentId === appointmentId.value)
    && (!keyword || [item.student.studentId, item.student.name, item.companyName, item.student.position, item.groupName, item.appointmentId].filter(Boolean).join(' ').toLowerCase().includes(keyword))
    && (filter.value === 'ALL' || evaluationState(item) === filter.value)
}))
const statusInfo = (item: Item) => ({ NOT_STARTED: { label: 'ยังไม่เริ่มประเมิน', color: 'warning' as const }, SUBMITTED: { label: 'ประเมินแล้ว', color: 'success' as const } }[evaluationState(item)])
const openForm = (item: Item) => {
  selected.value = item
  scoreLabels.forEach(({ key }) => { form[key] = item.evaluation?.[key] ?? null })
  ;(['strengths', 'problems', 'recommendations', 'followUp'] as const).forEach(key => { form[key] = item.evaluation?.[key] ?? '' })
  open.value = true
}
const setScore = (key: ScoreKey, value: number, checked: boolean | 'indeterminate') => {
  form[key] = checked ? value : form[key] === value ? null : form[key]
}
const submit = async () => {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/teacher/student-evaluations/${selected.value.appointmentId}/${selected.value.student.id}`, { method: 'PUT', body: form })
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
  { id: 'student', header: 'นักศึกษา' },
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { id: 'context', header: 'นัดหมาย / กลุ่ม' },
  { id: 'state', header: 'สถานะ' },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-student-evaluations">
    <template #header><UDashboardNavbar title="ประเมินนักศึกษา"><template #leading><UDashboardSidebarCollapse /></template><template #right><AppNotificationBell /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดงานประเมินได้" :description="error.message" />
        <UAlert v-else-if="appointmentId" color="info" variant="subtle" title="งานนิเทศที่เลือก" :description="`แสดงนักศึกษาจากนัดหมาย #${appointmentId} — ประเมินหรือแก้ไขผลได้ทันที`" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหารหัส ชื่อ บริษัท หรือตำแหน่ง" class="sm:max-w-sm" />
          <div class="flex flex-col gap-3 sm:ml-auto sm:flex-row">
            <USelect v-model="filter" :items="[{ label: 'ทุกสถานะ', value: 'ALL' }, { label: 'ยังไม่เริ่มประเมิน', value: 'NOT_STARTED' }, { label: 'ประเมินแล้ว', value: 'SUBMITTED' }]" value-key="value" class="sm:w-48" />
            <UIButtonRefresh class="self-start" :loading="status === 'pending'" @refresh="refresh" />
          </div>
        </div>
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="filtered" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #student-cell="{ row }"><div><p class="font-medium text-highlighted">{{ row.original.student.name }}</p><p class="text-xs text-muted">{{ row.original.student.studentId }} · {{ row.original.student.position || 'ไม่ระบุตำแหน่ง' }}</p></div></template>
            <template #context-cell="{ row }"><div><p>นัดหมาย #{{ row.original.appointmentId }} · ครั้งที่ {{ row.original.roundNo }}</p><p class="text-xs text-muted">{{ row.original.groupName }} · {{ row.original.cycle.term }}/{{ row.original.cycle.academicYear }}</p></div></template>
            <template #state-cell="{ row }"><UBadge :color="statusInfo(row.original).color" variant="subtle">{{ statusInfo(row.original).label }}</UBadge></template>
            <template #actions-cell="{ row }"><UButton :label="evaluationState(row.original) === 'SUBMITTED' ? 'แก้ไขผล' : 'ประเมิน'" color="primary" variant="ghost" size="xs" @click="openForm(row.original)" /></template>
            <template #empty><div class="py-12 text-center text-muted">ยังไม่มีนักศึกษาที่อยู่ในรายการนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="open" :title="selected ? `ประเมิน ${selected.student.name}` : 'ประเมินนักศึกษา'">
    <template #body>
      <div v-if="selected" class="space-y-5">
        <div><p class="text-sm text-muted">{{ selected.companyName }} · นัดหมาย #{{ selected.appointmentId }}</p><p class="mt-1 text-sm text-muted">บันทึกแล้วสามารถกลับมาแก้ไขได้ตลอด</p></div>
        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="min-w-full text-sm">
            <thead class="bg-muted/30 text-muted"><tr><th class="min-w-64 px-3 py-2 text-left font-medium">หัวข้อประเมิน</th><th v-for="score in [5, 4, 3, 2, 1]" :key="score" class="w-14 px-2 py-2 text-center font-medium">{{ score }}</th></tr></thead>
            <tbody><tr v-for="item in scoreLabels" :key="item.key" class="border-t border-default"><th scope="row" class="px-3 py-2 text-left font-medium text-highlighted">{{ item.label }}</th><td v-for="score in [5, 4, 3, 2, 1]" :key="score" class="px-2 py-2 text-center"><UCheckbox :model-value="form[item.key] === score" :aria-label="`${item.label}: ${score} คะแนน`" @update:model-value="setScore(item.key, score, $event)" /></td></tr></tbody>
          </table>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField v-for="field in [{ key: 'strengths', label: 'จุดเด่น' }, { key: 'problems', label: 'ปัญหาที่พบ' }, { key: 'recommendations', label: 'ข้อเสนอแนะ' }, { key: 'followUp', label: 'สิ่งที่ต้องติดตามครั้งถัดไป' }]" :key="field.key" :label="field.label">
            <UTextarea v-model="form[field.key as 'strengths' | 'problems' | 'recommendations' | 'followUp'] as string" />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer><div class="flex justify-end"><UButton color="primary" :label="selected?.evaluation ? 'บันทึกการแก้ไข' : 'บันทึกแบบประเมิน'" :loading="saving" @click="submit" /></div></template>
  </UModal>
</template>
