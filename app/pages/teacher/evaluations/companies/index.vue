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
const filterOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'ยังไม่เริ่มประเมิน', value: 'NOT_STARTED' },
  { label: 'ประเมินแล้ว', value: 'SUBMITTED' }
]
const hasFilters = computed(() => Boolean(search.value) || filter.value !== 'ALL')
const clearFilters = () => {
  search.value = ''
  filter.value = 'ALL'
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
    <template #header>
      <AppDashboardNavbar title="ประเมินสถานประกอบการ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><AppNotificationBell /></template>
      </AppDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดงานประเมินได้" :description="error.message" />
        <UAlert v-else-if="appointmentId" color="info" variant="subtle" title="งานนิเทศที่เลือก" :description="`แสดงสถานประกอบการจากนัดหมาย #${appointmentId} — ประเมินหรือแก้ไขผลได้ทันที`" />

        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div>
              <h3 class="text-lg font-bold text-ink">ประเมินสถานประกอบการ</h3>
              <p class="mt-1 text-sm leading-6 text-muted">รายการสถานประกอบการที่อยู่ในความดูแลของท่าน รองรับการค้นหา กรองสถานะ และบันทึกผลการประเมิน</p>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <UInput
                v-model="search"
                type="search"
                size="xl"
                icon="i-lucide-search"
                placeholder="ค้นหาบริษัท กลุ่ม หรือนัดหมาย"
                class="w-full sm:max-w-sm lg:w-80"
                aria-label="ค้นหาสถานประกอบการ"
              />
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:ml-auto">
                <USelect
                  v-model="filter"
                  :items="filterOptions"
                  value-key="value"
                  size="xl"
                  class="w-full sm:w-48"
                  aria-label="กรองตามสถานะ"
                />
                <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
              </div>
            </div>

            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="search" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ search }}”
              </span>
              <span v-if="filter !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ filterOptions.find(o => o.value === filter)?.label }}
              </span>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearFilters">
                ล้างทั้งหมด
              </UButton>
            </div>
          </div>

          <div v-if="status === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
            <div v-for="row in 4" :key="row" class="grid grid-cols-[1.5fr_1fr_6rem_5rem] gap-4 max-md:grid-cols-[1fr_5rem]">
              <USkeleton class="h-10" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
            </div>
          </div>

          <div v-else-if="error" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-triangle-alert"
              title="ไม่สามารถโหลดงานประเมินได้"
              :description="error.message || 'เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง'"
              class="min-h-64"
            >
              <template #actions>
                <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="() => refresh()">
                  ลองอีกครั้ง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <div v-else-if="!filtered.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-building"
              :title="hasFilters ? 'ไม่พบสถานประกอบการที่ตรงกับตัวกรอง' : 'ยังไม่มีสถานประกอบการที่อยู่ในรายการนิเทศของคุณ'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'รายการจะแสดงเมื่อเจ้าหน้าที่จัดกลุ่มนิเทศและมอบหมายสถานประกอบการให้คุณ'"
              class="min-h-64"
            >
              <template #actions>
                <UButton v-if="hasFilters" size="xl" color="neutral" variant="outline" @click="clearFilters">
                  ล้างตัวกรอง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <div v-else class="w-full overflow-x-auto">
            <UTable
              :data="filtered"
              :columns="columns"
              class="min-w-full"
              :ui="{ base: 'w-full min-w-180' }"
            >
              <template #companyName-cell="{ row }">
                <p class="font-medium text-ink">{{ row.original.companyName }}</p>
              </template>
              <template #context-cell="{ row }">
                <div>
                  <p class="font-medium text-ink">นัดหมาย #{{ row.original.appointmentId }} · ครั้งที่ {{ row.original.roundNo }}</p>
                  <p class="mt-0.5 text-xs text-muted">{{ row.original.groupName }} · {{ row.original.cycle.term }}/{{ row.original.cycle.academicYear }}</p>
                </div>
              </template>
              <template #state-cell="{ row }">
                <div class="space-y-1">
                  <UBadge :color="info(row.original).color" variant="subtle" size="sm">
                    {{ info(row.original).label }}
                  </UBadge>
                  <p v-if="evaluatorName(row.original.evaluation)" class="text-xs text-muted">
                    {{ evaluatorName(row.original.evaluation) }}
                  </p>
                </div>
              </template>
              <template #actions-header>
                <span class="block text-right">จัดการ</span>
              </template>
              <template #actions-cell="{ row }">
                <div class="flex items-center justify-end">
                  <UButton
                    :label="state(row.original) === 'SUBMITTED' ? 'แก้ไขผล' : 'ประเมิน'"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-clipboard-pen"
                    @click="edit(row.original)"
                  />
                </div>
              </template>
            </UTable>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="open" :title="selected ? `ประเมิน ${selected.companyName}` : 'ประเมินสถานประกอบการ'">
    <template #body>
      <div v-if="selected" class="space-y-5">
        <div>
          <p class="text-sm text-ink font-medium">{{ selected.companyName }} · นัดหมาย #{{ selected.appointmentId }}</p>
          <p class="mt-0.5 text-xs text-muted">บันทึกแล้วสามารถกลับมาแก้ไขได้ตลอด</p>
        </div>
        <div class="overflow-x-auto rounded-panel border border-divider">
          <table class="min-w-full text-sm">
            <thead class="bg-surface text-muted">
              <tr>
                <th class="min-w-64 px-3 py-2 text-left font-medium">หัวข้อประเมิน</th>
                <th v-for="score in [5, 4, 3, 2, 1]" :key="score" class="w-14 px-2 py-2 text-center font-medium">{{ score }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in scoreLabels" :key="item.key" class="border-t border-divider">
                <th scope="row" class="px-3 py-2 text-left font-medium text-ink">{{ item.label }}</th>
                <td v-for="score in [5, 4, 3, 2, 1]" :key="score" class="px-2 py-2 text-center">
                  <UCheckbox
                    :model-value="form[item.key] === score"
                    size="sm"
                    :aria-label="`${item.label}: ${score} คะแนน`"
                    @update:model-value="setScore(item.key, score, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-for="field in [{ key: 'observations', label: 'ข้อสังเกตจากการนิเทศ' }, { key: 'companyNeeds', label: 'ความต้องการของสถานประกอบการ' }, { key: 'problems', label: 'ปัญหาที่พบ' }, { key: 'recommendations', label: 'ข้อเสนอแนะ' }, { key: 'futureRecommendation', label: 'คำแนะนำสำหรับรุ่นต่อไป' }]"
            :key="field.key"
            :label="field.label"
          >
            <UTextarea
              v-model="form[field.key as 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation'] as string"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton size="xl" color="neutral" variant="ghost" @click="open = false">ยกเลิก</UButton>
        <UButton
          size="xl"
          color="primary"
          :label="selected?.evaluation ? 'บันทึกการแก้ไข' : 'บันทึกแบบประเมิน'"
          :loading="saving"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
