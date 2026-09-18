<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type AppointmentStatus = 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'
type AppointmentPeriod = 'MORNING' | 'AFTERNOON' | 'FULL_DAY'

interface AppointmentPerson { id: number; prefix: string | null; firstName: string | null; lastName: string | null }
interface SupervisionAppointmentRow {
  id: number
  scheduledDate: string
  period: AppointmentPeriod
  status: AppointmentStatus
  timeNote: string | null
  changeReason: string | null
  cancelReason: string | null
  companyName: string
  province: string | null
  group: { id: number; name: string }
  students: AppointmentPerson[]
  teachers: AppointmentPerson[]
}
interface AppointmentsResponse { appointments: SupervisionAppointmentRow[]; total: number; page: number; pageSize: number; totalPages: number }
interface SupervisionRound { id: number; roundNo: number; title: string }
interface SupervisionGroup { id: number; name: string }

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const searchQuery = ref('')
const selectedRoundId = ref<number>()
const selectedGroupId = ref('ALL')
const selectedStatus = ref('ALL')
const page = ref(1)
const pageSize = 10

const { data: roundsData } = await useFetch<{ rounds: SupervisionRound[] }>(() => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`)
const rounds = computed(() => roundsData.value?.rounds || [])
watch(rounds, (items) => {
  if (items.length && !items.some(item => item.id === selectedRoundId.value)) selectedRoundId.value = items[0]?.id
}, { immediate: true })
const roundOptions = computed(() => rounds.value.map(round => ({ label: `ครั้งที่ ${round.roundNo}: ${round.title}`, value: round.id })))

const { data: groupsData } = await useFetch<{ groups: SupervisionGroup[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/groups`,
  { watch: [selectedRoundId] }
)
const groups = computed(() => groupsData.value?.groups || [])
const groupFilterOptions = computed(() => [{ label: 'ทุกกลุ่ม', value: 'ALL' }, ...groups.value.map(group => ({ label: group.name, value: String(group.id) }))])
const statusFilterOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'เผยแพร่แล้ว', value: 'PUBLISHED' },
  { label: 'เลื่อนกำหนดการ', value: 'RESCHEDULED' },
  { label: 'ประเมินเสร็จแล้ว', value: 'COMPLETED' },
  { label: 'ยกเลิกแล้ว', value: 'CANCELLED' }
]

const { data, status: fetchStatus, refresh } = await useFetch<AppointmentsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/appointments`,
  {
    query: computed(() => ({
      groupId: selectedGroupId.value === 'ALL' ? undefined : Number(selectedGroupId.value),
      status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
      search: searchQuery.value || undefined,
      page: page.value,
      pageSize,
      excludeDrafts: 'true'
    })),
    watch: [selectedRoundId, selectedGroupId, selectedStatus, page, searchQuery]
  }
)
watch([searchQuery, selectedGroupId, selectedStatus, selectedRoundId], () => { page.value = 1 })

const appointments = computed(() => data.value?.appointments || [])
const periodMap: Record<AppointmentPeriod, string> = { MORNING: 'ช่วงเช้า', AFTERNOON: 'ช่วงบ่าย', FULL_DAY: 'เต็มวัน' }
const statusMap: Record<AppointmentStatus, { label: string; color: 'success' | 'warning' | 'info' | 'error' }> = {
  PUBLISHED: { label: 'เผยแพร่แล้ว', color: 'success' },
  RESCHEDULED: { label: 'เลื่อนกำหนดการ', color: 'warning' },
  COMPLETED: { label: 'ประเมินเสร็จแล้ว', color: 'info' },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'error' }
}
const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
const personName = (person: AppointmentPerson) => `${person.prefix || ''}${person.firstName || ''} ${person.lastName || ''}`.trim()
const clearFilters = () => { searchQuery.value = ''; selectedGroupId.value = 'ALL'; selectedStatus.value = 'ALL' }
const columns: TableColumn<SupervisionAppointmentRow>[] = [
  { id: 'scheduledDate', header: 'วันและเวลานิเทศ', meta: { class: { th: 'w-40', td: 'w-40' } } },
  { id: 'group', header: 'กลุ่มนิเทศ', meta: { class: { th: 'w-36', td: 'w-36' } } },
  { id: 'company', header: 'สถานประกอบการ' },
  { id: 'participants', header: 'นักศึกษาและอาจารย์', meta: { class: { th: 'w-60', td: 'w-60' } } },
  { id: 'status', header: 'สถานะ', meta: { class: { th: 'w-36', td: 'w-36' } } }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="flex items-center gap-2 text-base font-semibold text-highlighted"><UIcon name="i-lucide-calendar-days" class="size-5 text-primary" />ตารางนิเทศสหกิจศึกษา</h2>
        <p class="mt-0.5 text-xs text-muted">แสดงกำหนดการที่บันทึกจากหน้าจัดกลุ่มนิเทศ เพื่อใช้ติดตามข้อมูลและสถานะ</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
        <USelect v-model="selectedRoundId" :items="roundOptions" class="w-52" :disabled="rounds.length === 0" />
        <UIButtonRefresh :loading="fetchStatus === 'pending'" @refresh="refresh" />
      </div>
    </div>

    <UAlert v-if="rounds.length === 0" color="info" variant="subtle" icon="i-lucide-info" title="ยังไม่มีรอบนิเทศ" description="สร้างรอบและจัดกลุ่มพร้อมกำหนดการนิเทศจากหน้า “จัดกลุ่มและมอบหมายอาจารย์นิเทศ” ก่อน" />

    <div v-else class="flex flex-wrap items-center gap-2">
      <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="ค้นหาสถานประกอบการ อาจารย์ หรือนักศึกษา..." class="w-72" aria-label="ค้นหาตารางนิเทศ" />
      <USelect v-model="selectedGroupId" :items="groupFilterOptions" class="w-44" aria-label="กรองตามกลุ่มนิเทศ" />
      <USelect v-model="selectedStatus" :items="statusFilterOptions" class="w-44" aria-label="กรองตามสถานะ" />
      <UButton v-if="searchQuery || selectedGroupId !== 'ALL' || selectedStatus !== 'ALL'" label="ล้างตัวกรอง" color="neutral" variant="ghost" @click="clearFilters" />
    </div>

    <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable :data="appointments" :columns="columns" :loading="fetchStatus === 'pending'" class="min-w-full">
          <template #scheduledDate-cell="{ row }">
            <div class="text-xs"><div class="font-medium text-highlighted">{{ formatDate(row.original.scheduledDate) }}</div><div class="mt-0.5 text-muted">{{ periodMap[row.original.period] }}</div><div v-if="row.original.timeNote" class="mt-1 text-[11px] text-muted">{{ row.original.timeNote }}</div></div>
          </template>
          <template #group-cell="{ row }"><span class="text-xs font-medium text-highlighted">{{ row.original.group.name }}</span></template>
          <template #company-cell="{ row }">
            <div class="text-xs"><div class="font-semibold text-highlighted">{{ row.original.companyName }}</div><div class="mt-0.5 flex items-center gap-1 text-[11px] text-muted"><UIcon name="i-lucide-map-pin" class="size-3" />{{ row.original.province || 'ไม่ระบุจังหวัด' }}</div><div v-if="row.original.changeReason" class="mt-1 text-[11px] text-warning">เหตุผลที่เลื่อน: {{ row.original.changeReason }}</div><div v-if="row.original.cancelReason" class="mt-1 text-[11px] text-error">เหตุผลที่ยกเลิก: {{ row.original.cancelReason }}</div></div>
          </template>
          <template #participants-cell="{ row }"><div class="space-y-1 text-xs"><div><span class="font-medium text-highlighted">นักศึกษา:</span> <span class="text-muted">{{ row.original.students.map(personName).join(', ') || '—' }}</span></div><div><span class="font-medium text-highlighted">อาจารย์:</span> <span class="text-muted">{{ row.original.teachers.map(personName).join(', ') || '—' }}</span></div></div></template>
          <template #status-cell="{ row }"><UBadge :label="statusMap[row.original.status]?.label || row.original.status" :color="statusMap[row.original.status]?.color || 'info'" variant="subtle" /></template>
          <template #empty><div class="py-12 text-center text-muted"><UIcon name="i-lucide-calendar-days" class="mx-auto mb-2 size-8 text-dimmed" /><p class="font-medium text-highlighted">ยังไม่มีตารางนิเทศในเงื่อนไขที่เลือก</p><p class="mt-1 text-xs">กำหนดการจะถูกสร้างเมื่อบันทึกกลุ่มนิเทศ</p></div></template>
        </UTable>
      </div>
      <div v-if="data && data.total > 0" class="flex flex-col items-center justify-between gap-3 border-t border-default px-4 py-3 text-xs text-muted sm:flex-row"><span>แสดง {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, data.total) }} จาก {{ data.total }} รายการ</span><UPagination v-model:page="page" :total="data.total" :items-per-page="pageSize" size="sm" /></div>
    </div>
  </div>
</template>
