<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type AppointmentStatus = 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface Appointment {
  id: number
  companyName: string
  companyAddress: string | null
  province: string | null
  scheduledDate: string
  period: string
  timeNote: string | null
  status: AppointmentStatus
  changeReason: string | null
  cancelReason: string | null
  group: { id: number, name: string }
  round: { id: number, roundNo: number, cooperativeCycle: { id: number, term: number, academicYear: number } }
  companyContact: { contactPerson: string, phone: string | null, email: string | null }
  students: Array<{ studentId: string, name: string, position: string | null }>
  teachers: Array<{ teacherId: string, name: string, phone: string | null }>
  travelPlans: Array<{ travelDate: string, startLocation: string }>
}

const { data: appointments, status, error, refresh } = await useFetch<Appointment[]>('/api/teacher/appointments')

const search = ref('')
const statusFilter = ref<'ALL' | AppointmentStatus>('ALL')
const roundFilter = ref<number | null>(null)
const groupFilter = ref<number | null>(null)
const page = ref(1)
const pageSize = 10
const detailOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'รอการนิเทศ', value: 'PUBLISHED' },
  { label: 'เลื่อนนัด', value: 'RESCHEDULED' },
  { label: 'นิเทศเสร็จแล้ว', value: 'COMPLETED' },
  { label: 'ยกเลิก', value: 'CANCELLED' }
]

const rounds = computed(() => Array.from(new Map((appointments.value ?? []).map(item => [item.round.id, item.round])).values()))
const groups = computed(() => Array.from(new Map((appointments.value ?? []).map(item => [item.group.id, item.group])).values()))
const roundOptions = computed(() => [{ label: 'ทุกครั้งที่นิเทศ', value: null }, ...rounds.value.map(round => ({ label: `ครั้งที่ ${round.roundNo} · ${round.cooperativeCycle.term}/${round.cooperativeCycle.academicYear}`, value: round.id }))])
const groupOptions = computed(() => [{ label: 'ทุกกลุ่มนิเทศ', value: null }, ...groups.value.map(group => ({ label: group.name, value: group.id }))])

const filteredAppointments = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (appointments.value ?? []).filter((appointment) => {
    const searchable = [
      appointment.id,
      appointment.companyName,
      appointment.companyAddress,
      appointment.province,
      appointment.group.name,
      ...appointment.students.flatMap(student => [student.studentId, student.name]),
      ...appointment.teachers.flatMap(teacher => [teacher.teacherId, teacher.name])
    ].filter(Boolean).join(' ').toLowerCase()

    return (!keyword || searchable.includes(keyword))
      && (statusFilter.value === 'ALL' || appointment.status === statusFilter.value)
      && (!roundFilter.value || appointment.round.id === roundFilter.value)
      && (!groupFilter.value || appointment.group.id === groupFilter.value)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAppointments.value.length / pageSize)))
const paginatedAppointments = computed(() => filteredAppointments.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const hasFilters = computed(() => Boolean(search.value) || statusFilter.value !== 'ALL' || roundFilter.value !== null || groupFilter.value !== null)
const pageStart = computed(() => filteredAppointments.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredAppointments.value.length))

watch([search, statusFilter, roundFilter, groupFilter], () => { page.value = 1 })
watch(totalPages, () => { page.value = Math.min(page.value, totalPages.value) })

const clearFilters = () => {
  search.value = ''
  statusFilter.value = 'ALL'
  roundFilter.value = null
  groupFilter.value = null
}

const openDetail = (appointment: Appointment) => {
  selectedAppointment.value = appointment
  detailOpen.value = true
}

const formatThaiDate = (value: string) => new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
const periodLabel = (period: string) => period === 'AFTERNOON' ? 'ช่วงบ่าย' : period === 'FULL_DAY' ? 'เต็มวัน' : 'ช่วงเช้า'
const statusBadge = (appointmentStatus: AppointmentStatus) => ({
  PUBLISHED: { label: 'รอการนิเทศ', color: 'info' as const },
  RESCHEDULED: { label: 'เลื่อนนัด', color: 'warning' as const },
  COMPLETED: { label: 'นิเทศเสร็จแล้ว', color: 'success' as const },
  CANCELLED: { label: 'ยกเลิก', color: 'neutral' as const }
}[appointmentStatus])

const columns: TableColumn<Appointment>[] = [
  { accessorKey: 'id', header: 'นัดหมาย', meta: { class: { th: 'w-24', td: 'w-24 font-medium tabular-nums' } } },
  { id: 'schedule', header: 'วันและเวลา', meta: { class: { th: 'w-44', td: 'w-44' } } },
  { id: 'round', header: 'รอบ / กลุ่ม', meta: { class: { th: 'w-48', td: 'w-48' } } },
  { id: 'company', header: 'สถานประกอบการ', meta: { class: { th: 'min-w-56', td: 'min-w-56' } } },
  { id: 'students', header: 'นักศึกษา', meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end tabular-nums' } } },
  { id: 'status', header: 'สถานะ', meta: { class: { th: 'w-36', td: 'w-36' } } },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-visits">
    <template #header>
      <UDashboardNavbar title="ตารางนิเทศของฉัน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดตารางนิเทศได้" :description="error.message" />

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหานัดหมาย บริษัท กลุ่ม หรือนักศึกษา" class="w-full sm:max-w-sm" aria-label="ค้นหาตารางนิเทศ" />
          <USelect v-model="roundFilter" :items="roundOptions" value-key="value" class="w-full sm:w-52" aria-label="กรองตามครั้งที่นิเทศ" />
          <USelect v-model="groupFilter" :items="groupOptions" value-key="value" class="w-full sm:w-48" aria-label="กรองตามกลุ่มนิเทศ" />
          <USelect v-model="statusFilter" :items="statusOptions" value-key="value" class="w-full sm:w-44" aria-label="กรองตามสถานะ" />
          <UButton v-if="hasFilters" color="neutral" variant="ghost" label="ล้างตัวกรอง" @click="clearFilters" />
        </div>

        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="paginatedAppointments" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #id-cell="{ row }"><span>#{{ row.original.id }}</span></template>
            <template #schedule-cell="{ row }"><div><p class="text-sm font-medium text-highlighted">{{ formatThaiDate(row.original.scheduledDate) }}</p><p class="text-xs text-muted">{{ periodLabel(row.original.period) }}<template v-if="row.original.timeNote"> · {{ row.original.timeNote }}</template></p></div></template>
            <template #round-cell="{ row }"><div><p class="text-sm text-highlighted">ครั้งที่ {{ row.original.round.roundNo }} · {{ row.original.round.cooperativeCycle.term }}/{{ row.original.round.cooperativeCycle.academicYear }}</p><p class="text-xs text-muted">{{ row.original.group.name }}</p></div></template>
            <template #company-cell="{ row }"><div><p class="text-sm font-medium text-highlighted">{{ row.original.companyName }}</p><p class="text-xs text-muted">{{ row.original.province || row.original.companyAddress || 'ไม่ระบุพื้นที่' }}</p></div></template>
            <template #students-cell="{ row }">{{ row.original.students.length }} คน</template>
            <template #status-cell="{ row }"><UBadge :color="statusBadge(row.original.status).color" variant="subtle" size="sm">{{ statusBadge(row.original.status).label }}</UBadge></template>
            <template #actions-cell="{ row }"><UButton label="รายละเอียด" color="neutral" variant="ghost" size="xs" @click="openDetail(row.original)" /></template>
            <template #empty><div class="space-y-2 py-12 text-center text-muted"><UIcon name="i-lucide-calendar-days" class="mx-auto size-9 text-dimmed" /><p>ไม่พบตารางนิเทศ</p><p class="text-xs">รายการจะแสดงเมื่อเจ้าหน้าที่มอบหมายและเผยแพร่ตารางให้คุณ</p></div></template>
          </UTable>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span v-if="filteredAppointments.length">แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredAppointments.length }} รายการ</span><span v-else>ไม่พบรายการ</span>
          <UPagination v-if="filteredAppointments.length > pageSize" v-model:page="page" :total="filteredAppointments.length" :items-per-page="pageSize" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="detailOpen" :title="selectedAppointment ? `นัดหมาย #${selectedAppointment.id}` : 'รายละเอียดนัดหมาย'">
    <template #body>
      <div v-if="selectedAppointment" class="space-y-5 text-sm">
        <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-base font-semibold text-highlighted">{{ selectedAppointment.companyName }}</p><p class="mt-1 text-muted">{{ selectedAppointment.companyAddress || selectedAppointment.province || 'ไม่ระบุที่อยู่' }}</p></div><UBadge :color="statusBadge(selectedAppointment.status).color" variant="subtle">{{ statusBadge(selectedAppointment.status).label }}</UBadge></div>
        <div class="grid gap-3 rounded-lg bg-muted/30 p-4 sm:grid-cols-2"><div><p class="text-xs text-muted">วันและเวลา</p><p class="mt-1 font-medium text-highlighted">{{ formatThaiDate(selectedAppointment.scheduledDate) }} · {{ periodLabel(selectedAppointment.period) }}</p></div><div><p class="text-xs text-muted">รอบ / กลุ่มนิเทศ</p><p class="mt-1 font-medium text-highlighted">ครั้งที่ {{ selectedAppointment.round.roundNo }} · {{ selectedAppointment.group.name }}</p></div></div>
        <div v-if="selectedAppointment.timeNote || selectedAppointment.changeReason || selectedAppointment.cancelReason" class="space-y-2"><p v-if="selectedAppointment.timeNote"><span class="text-muted">หมายเหตุเวลา: </span>{{ selectedAppointment.timeNote }}</p><p v-if="selectedAppointment.changeReason"><span class="text-muted">เหตุผลการเลื่อน: </span>{{ selectedAppointment.changeReason }}</p><p v-if="selectedAppointment.cancelReason"><span class="text-muted">เหตุผลการยกเลิก: </span>{{ selectedAppointment.cancelReason }}</p></div>
        <div><h3 class="font-medium text-highlighted">อาจารย์ตามแผน</h3><ul class="mt-2 space-y-1 text-muted"><li v-for="teacher in selectedAppointment.teachers" :key="teacher.teacherId">{{ teacher.name }} <span v-if="teacher.phone">· {{ teacher.phone }}</span></li></ul></div>
        <div><h3 class="font-medium text-highlighted">นักศึกษา</h3><ul class="mt-2 divide-y divide-default rounded-lg border border-default"><li v-for="student in selectedAppointment.students" :key="student.studentId" class="flex items-center justify-between gap-3 p-3"><div><p class="font-medium text-highlighted">{{ student.name }}</p><p class="text-xs text-muted">{{ student.studentId }}</p></div><span class="text-xs text-muted">{{ student.position || 'ไม่ระบุตำแหน่ง' }}</span></li></ul></div>
        <div v-if="selectedAppointment.travelPlans.length"><h3 class="font-medium text-highlighted">แผนการเดินทาง</h3><ul class="mt-2 space-y-1 text-muted"><li v-for="plan in selectedAppointment.travelPlans" :key="`${plan.travelDate}-${plan.startLocation}`">{{ formatThaiDate(plan.travelDate) }} · เริ่มจาก {{ plan.startLocation }}</li></ul></div>
        <div><h3 class="font-medium text-highlighted">ผู้ติดต่อสถานประกอบการ</h3><p class="mt-1 text-muted">{{ selectedAppointment.companyContact.contactPerson }}<template v-if="selectedAppointment.companyContact.phone"> · {{ selectedAppointment.companyContact.phone }}</template><template v-if="selectedAppointment.companyContact.email"> · {{ selectedAppointment.companyContact.email }}</template></p></div>
      </div>
    </template>
  </UModal>
</template>
