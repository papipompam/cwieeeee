<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type EvaluationStatus = 'DRAFT' | 'SUBMITTED'
interface Item {
  appointmentId: number
  appointmentStatus: 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED'
  companyName: string
  groupName: string
  roundNo: number
  cycle: { term: number, academicYear: number }
  student: { id: number, studentId: string, name: string, position: string | null }
  evaluation: ({ status: EvaluationStatus, responsibilityScore: number | null, disciplineScore: number | null, communicationScore: number | null, knowledgeScore: number | null, workQualityScore: number | null, problemSolvingScore: number | null, strengths: string | null, problems: string | null, recommendations: string | null, followUp: string | null }) | null
}
type ScoreKey = 'responsibilityScore' | 'disciplineScore' | 'communicationScore' | 'knowledgeScore' | 'workQualityScore' | 'problemSolvingScore'

const { data: items, status, error, refresh } = await useFetch<Item[]>('/api/teacher/student-evaluations')
const notify = useNotify()
const search = ref('')
const filter = ref<'ALL' | 'WAITING' | 'NOT_STARTED' | EvaluationStatus>('ALL')
const selected = ref<Item | null>(null)
const open = ref(false)
const saving = ref(false)
const form = reactive<Record<ScoreKey | 'strengths' | 'problems' | 'recommendations' | 'followUp', number | null | string>>({ responsibilityScore: null, disciplineScore: null, communicationScore: null, knowledgeScore: null, workQualityScore: null, problemSolvingScore: null, strengths: '', problems: '', recommendations: '', followUp: '' })
const scoreLabels: Array<{ key: ScoreKey, label: string }> = [
  { key: 'responsibilityScore', label: 'ความรับผิดชอบและตรงต่อเวลา' }, { key: 'disciplineScore', label: 'วินัยและจรรยาบรรณในการทำงาน' }, { key: 'communicationScore', label: 'การสื่อสารและทำงานร่วมกับผู้อื่น' }, { key: 'knowledgeScore', label: 'การประยุกต์ใช้ความรู้กับงาน' }, { key: 'workQualityScore', label: 'คุณภาพและความก้าวหน้าของงาน' }, { key: 'problemSolvingScore', label: 'การเรียนรู้และแก้ไขปัญหา' }
]
const evaluationState = (item: Item) => item.appointmentStatus !== 'COMPLETED' ? 'WAITING' : item.evaluation?.status ?? 'NOT_STARTED'
const filtered = computed(() => (items.value ?? []).filter(item => {
  const keyword = search.value.trim().toLowerCase()
  return (!keyword || [item.student.studentId, item.student.name, item.companyName, item.student.position, item.groupName, item.appointmentId].filter(Boolean).join(' ').toLowerCase().includes(keyword)) && (filter.value === 'ALL' || evaluationState(item) === filter.value)
}))
const statusInfo = (item: Item) => ({ WAITING: { label: 'รอนิเทศเสร็จ', color: 'neutral' as const }, NOT_STARTED: { label: 'ยังไม่เริ่มประเมิน', color: 'warning' as const }, DRAFT: { label: 'กำลังประเมิน', color: 'info' as const }, SUBMITTED: { label: 'ประเมินครบแล้ว', color: 'success' as const } }[evaluationState(item)])
const openForm = (item: Item) => {
  selected.value = item
  scoreLabels.forEach(({ key }) => { form[key] = item.evaluation?.[key] ?? null })
  ;(['strengths', 'problems', 'recommendations', 'followUp'] as const).forEach(key => { form[key] = item.evaluation?.[key] ?? '' })
  open.value = true
}
const setScore = (key: ScoreKey, value: string | number | null) => { form[key] = value === '' || value === null ? null : Number(value) }
const save = async (submit: boolean) => {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/teacher/student-evaluations/${selected.value.appointmentId}/${selected.value.student.id}`, { method: 'PUT', body: { ...form, submit } })
    notify.success(submit ? 'ส่งแบบประเมินเรียบร้อยแล้ว' : 'บันทึกร่างแบบประเมินแล้ว')
    open.value = false
    await refresh()
  } catch (err: any) { notify.error(err?.data?.message || err?.message || 'ไม่สามารถบันทึกแบบประเมินได้') } finally { saving.value = false }
}
const columns: TableColumn<Item>[] = [{ id: 'student', header: 'นักศึกษา' }, { accessorKey: 'companyName', header: 'สถานประกอบการ' }, { id: 'context', header: 'นัดหมาย / กลุ่ม' }, { id: 'state', header: 'สถานะ' }, { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }]
</script>

<template>
  <UDashboardPanel id="teacher-student-evaluations"><template #header><UDashboardNavbar title="ประเมินนักศึกษา"><template #leading><UDashboardSidebarCollapse /></template><template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template></UDashboardNavbar></template><template #body><div class="space-y-4 p-4 sm:p-6"><UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดงานประเมินได้" :description="error.message" /><div class="flex flex-col gap-3 sm:flex-row"><UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหารหัส ชื่อ บริษัท หรือตำแหน่ง" class="sm:max-w-sm" /><USelect v-model="filter" :items="[{ label: 'ทุกสถานะ', value: 'ALL' }, { label: 'รอนิเทศเสร็จ', value: 'WAITING' }, { label: 'ยังไม่เริ่มประเมิน', value: 'NOT_STARTED' }, { label: 'กำลังประเมิน', value: 'DRAFT' }, { label: 'ประเมินครบแล้ว', value: 'SUBMITTED' }]" value-key="value" class="sm:w-48" /></div><div class="overflow-hidden rounded-lg border border-default bg-default"><UTable :data="filtered" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }"><template #student-cell="{ row }"><div><p class="font-medium text-highlighted">{{ row.original.student.name }}</p><p class="text-xs text-muted">{{ row.original.student.studentId }} · {{ row.original.student.position || 'ไม่ระบุตำแหน่ง' }}</p></div></template><template #context-cell="{ row }"><div><p>นัดหมาย #{{ row.original.appointmentId }} · ครั้งที่ {{ row.original.roundNo }}</p><p class="text-xs text-muted">{{ row.original.groupName }} · {{ row.original.cycle.term }}/{{ row.original.cycle.academicYear }}</p></div></template><template #state-cell="{ row }"><UBadge :color="statusInfo(row.original).color" variant="subtle">{{ statusInfo(row.original).label }}</UBadge></template><template #actions-cell="{ row }"><UButton v-if="evaluationState(row.original) !== 'WAITING'" :label="evaluationState(row.original) === 'SUBMITTED' ? 'ดูผล' : 'ประเมิน'" color="primary" variant="ghost" size="xs" @click="openForm(row.original)" /></template><template #empty><div class="py-12 text-center text-muted">ยังไม่มีนักศึกษาที่อยู่ในรายการนิเทศของคุณ</div></template></UTable></div></div></template></UDashboardPanel>
  <UModal v-model:open="open" :title="selected ? `ประเมิน ${selected.student.name}` : 'ประเมินนักศึกษา'"><template #body><div v-if="selected" class="space-y-5"><p class="text-sm text-muted">{{ selected.companyName }} · นัดหมาย #{{ selected.appointmentId }}</p><div v-for="item in scoreLabels" :key="item.key" class="grid gap-2 sm:grid-cols-[1fr_7rem] sm:items-center"><label :for="item.key" class="text-sm font-medium text-highlighted">{{ item.label }}</label><UInput :id="item.key" type="number" min="1" max="5" :model-value="form[item.key] as number | null" :disabled="selected.evaluation?.status === 'SUBMITTED'" @update:model-value="setScore(item.key, $event)" /></div><UFormField v-for="field in [{ key: 'strengths', label: 'จุดเด่น' }, { key: 'problems', label: 'ปัญหาที่พบ' }, { key: 'recommendations', label: 'ข้อเสนอแนะ' }, { key: 'followUp', label: 'สิ่งที่ต้องติดตามครั้งถัดไป' }]" :key="field.key" :label="field.label"><UTextarea v-model="form[field.key as 'strengths' | 'problems' | 'recommendations' | 'followUp'] as string" :disabled="selected.evaluation?.status === 'SUBMITTED'" /></UFormField></div></template><template #footer><div v-if="selected?.evaluation?.status !== 'SUBMITTED'" class="flex justify-end gap-2"><UButton color="neutral" variant="soft" label="บันทึกร่าง" :loading="saving" @click="save(false)" /><UButton color="primary" label="ส่งแบบประเมิน" :loading="saving" @click="save(true)" /></div></template></UModal>
</template>
