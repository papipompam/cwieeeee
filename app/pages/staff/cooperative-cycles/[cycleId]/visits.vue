<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

type AppointmentStatus = 'DRAFT' | 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'
type AppointmentPeriod = 'MORNING' | 'AFTERNOON' | 'FULL_DAY'

interface AppointmentStudent {
  id: number
  loginId: string
  prefix: string | null
  firstName: string | null
  lastName: string | null
}

interface AppointmentTeacher {
  id: number
  teacherId: string
  prefix: string | null
  firstName: string | null
  lastName: string | null
}

interface SupervisionAppointmentRow {
  id: number
  scheduledDate: string
  period: AppointmentPeriod
  status: AppointmentStatus
  timeNote: string | null
  changeReason: string | null
  cancelReason: string | null
  companyId: number
  companyName: string
  companyAddress: string | null
  province: string | null
  group: {
    id: number
    name: string
  }
  company?: {
    id: number
    name: string
    province: string | null
  }
  students: AppointmentStudent[]
  teachers: AppointmentTeacher[]
}

interface AppointmentsResponse {
  appointments: SupervisionAppointmentRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface SupervisionRound {
  id: number
  roundNo: number
  title: string
}

interface SupervisionGroup {
  id: number
  name: string
  companies: Array<{
    id: number
    companyId: number
    company: { id: number; name: string; province: string | null }
    studentsCount: number
    students: Array<{
      id: number
      loginId: string
      prefix: string | null
      firstName: string | null
      lastName: string | null
      classGroup?: string | null
    }>
  }>
  teachers: Array<{
    id: number
    teacherUserId: number
    teacher: { id: number; prefix: string | null; firstName: string | null; lastName: string | null; loginId: string }
  }>
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<any>>('currentCycle')
const notify = useNotify()

const searchQuery = ref('')
const selectedRoundId = ref<number | undefined>(undefined)
const selectedGroupId = ref<string>('ALL')
const selectedStatus = ref<string>('ALL')
const page = ref(1)
const pageSize = 10

// Fetch Rounds
const { data: roundsData } = await useFetch<{ rounds: SupervisionRound[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`
)

const rounds = computed(() => roundsData.value?.rounds || [])

watch(rounds, (newRounds) => {
  if (newRounds.length > 0 && (!selectedRoundId.value || !newRounds.some(r => r.id === selectedRoundId.value))) {
    selectedRoundId.value = newRounds[0]?.id
  }
}, { immediate: true })

const roundOptions = computed(() => {
  return rounds.value.map(r => ({
    label: `ครั้งที่ ${r.roundNo}: ${r.title}`,
    value: r.id
  }))
})

// Fetch Groups for active round
const { data: groupsData } = await useFetch<{ groups: SupervisionGroup[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/groups`,
  { watch: [selectedRoundId] }
)

const groups = computed<SupervisionGroup[]>(() => groupsData.value?.groups || [])

const groupOptions = computed(() => groups.value.map(g => ({ label: g.name, value: g.id })))

const groupFilterOptions = computed(() => [
  { label: 'ทุกกลุ่ม', value: 'ALL' },
  ...groups.value.map(g => ({ label: g.name, value: String(g.id) }))
])

const statusFilterOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'ร่างนัดหมาย (Draft)', value: 'DRAFT' },
  { label: 'เผยแพร่แล้ว (Published)', value: 'PUBLISHED' },
  { label: 'เลื่อนกำหนดการ (Rescheduled)', value: 'RESCHEDULED' },
  { label: 'เสร็จสิ้น (Completed)', value: 'COMPLETED' },
  { label: 'ยกเลิก (Cancelled)', value: 'CANCELLED' }
]

// Fetch Appointments
const { data, status: fetchStatus, refresh } = await useFetch<AppointmentsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/appointments`,
  {
    query: computed(() => ({
      groupId: selectedGroupId.value !== 'ALL' ? Number(selectedGroupId.value) : undefined,
      status: selectedStatus.value !== 'ALL' ? selectedStatus.value : undefined,
      search: searchQuery.value || undefined,
      page: page.value,
      pageSize
    })),
    watch: [selectedRoundId, selectedGroupId, selectedStatus, page, searchQuery]
  }
)

watch([searchQuery, selectedGroupId, selectedStatus, selectedRoundId], () => {
  page.value = 1
})

const appointments = computed<SupervisionAppointmentRow[]>(() => data.value?.appointments || [])

// Formatters
const periodMap: Record<AppointmentPeriod, string> = {
  MORNING: 'ช่วงเช้า (09:00 - 12:00)',
  AFTERNOON: 'ช่วงบ่าย (13:00 - 16:30)',
  FULL_DAY: 'เต็มวัน'
}

const statusMap: Record<AppointmentStatus, { label: string; color: 'neutral' | 'success' | 'warning' | 'info' | 'error' }> = {
  DRAFT: { label: 'ฉบับร่าง', color: 'neutral' },
  PUBLISHED: { label: 'เผยแพร่แล้ว', color: 'success' },
  RESCHEDULED: { label: 'เลื่อนกำหนดการ', color: 'warning' },
  COMPLETED: { label: 'เสร็จสิ้นแล้ว', color: 'info' },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'error' }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Table Columns
const columns: TableColumn<SupervisionAppointmentRow>[] = [
  {
    id: 'scheduledDate',
    header: 'วันและเวลานิเทศ',
    meta: { class: { th: 'w-44', td: 'w-44' } }
  },
  {
    id: 'group',
    header: 'กลุ่มนิเทศ',
    meta: { class: { th: 'w-36', td: 'w-36' } }
  },
  {
    id: 'company',
    header: 'สถานประกอบการ'
  },
  {
    id: 'participants',
    header: 'นักศึกษา & อาจารย์',
    meta: { class: { th: 'w-60', td: 'w-60' } }
  },
  {
    id: 'status',
    header: 'สถานะ',
    meta: { class: { th: 'w-32', td: 'w-32' } }
  },
  {
    id: 'actions',
    header: 'จัดการ',
    meta: { class: { th: 'w-40 text-end', td: 'w-40 text-end' } }
  }
]

// Selection for Bulk Publish
const selectedAppointmentIds = ref<number[]>([])

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedAppointmentIds.value = appointments.value.filter((a: SupervisionAppointmentRow) => a.status === 'DRAFT').map((a: SupervisionAppointmentRow) => a.id)
  } else {
    selectedAppointmentIds.value = []
  }
}

const isAllDraftsSelected = computed(() => {
  const drafts = appointments.value.filter((a: SupervisionAppointmentRow) => a.status === 'DRAFT')
  return drafts.length > 0 && drafts.every((d: SupervisionAppointmentRow) => selectedAppointmentIds.value.includes(d.id))
})

const isBulkPublishing = ref(false)

const handleBulkPublish = async () => {
  if (selectedAppointmentIds.value.length === 0 || !selectedRoundId.value) return
  isBulkPublishing.value = true
  try {
    const res = await $fetch<{ publishedCount: number; errors: string[] }>(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/appointments/publish-batch`,
      {
        method: 'POST',
        body: { appointmentIds: selectedAppointmentIds.value }
      }
    )
    if (res.errors && res.errors.length > 0) {
      notify.warning(`เผยแพร่ได้ ${res.publishedCount} รายการ, พบข้อผิดพลาด ${res.errors.length} รายการ: ${res.errors[0]}`)
    } else {
      notify.success(`เผยแพร่ตารางนิเทศสำเร็จ ${res.publishedCount} รายการ`)
    }
    selectedAppointmentIds.value = []
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถเผยแพร่ตารางนิเทศได้')
  } finally {
    isBulkPublishing.value = false
  }
}

// Single Publish
const handlePublishSingle = async (appointmentId: number) => {
  if (!selectedRoundId.value) return
  try {
    await $fetch(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/appointments/${appointmentId}/publish`,
      { method: 'POST' }
    )
    notify.success('เผยแพร่นัดหมายสำเร็จ')
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถเผยแพร่นัดหมายได้')
  }
}

// Create Appointment Modal
const isCreateModalOpen = ref(false)
const appointmentForm = ref<{
  groupId: number | undefined
  companyId: number | undefined
  scheduledDate: string
  period: AppointmentPeriod
  timeNote: string
  studentUserIds: number[]
  teacherUserIds: number[]
}>({
  groupId: undefined,
  companyId: undefined,
  scheduledDate: '',
  period: 'MORNING',
  timeNote: '',
  studentUserIds: [],
  teacherUserIds: []
})
const isSavingAppointment = ref(false)

// Companies for the selected group in form
const groupCompaniesOptions = computed(() => {
  if (!appointmentForm.value.groupId) return []
  const g = groups.value.find((gr: SupervisionGroup) => gr.id === appointmentForm.value.groupId)
  if (!g) return []
  return g.companies.map((c: SupervisionGroup['companies'][number]) => ({
    label: `${c.company.name} (${c.company.province || 'ไม่ระบุจังหวัด'})`,
    value: c.companyId
  }))
})

// Teachers for the selected group in form
const groupTeachersList = computed(() => {
  if (!appointmentForm.value.groupId) return []
  const g = groups.value.find((gr: SupervisionGroup) => gr.id === appointmentForm.value.groupId)
  if (!g) return []
  return g.teachers.map((t: SupervisionGroup['teachers'][number]) => ({
    id: t.teacherUserId,
    name: `${t.teacher.prefix || ''}${t.teacher.firstName || ''} ${t.teacher.lastName || ''} (${t.teacher.loginId})`.trim()
  }))
})

// Students for selected company in group
const availableStudentsForCompany = ref<Array<{ id: number; name: string; major: string }>>([])

watch(() => appointmentForm.value.companyId, (newCompanyId) => {
  if (!newCompanyId || !appointmentForm.value.groupId) {
    availableStudentsForCompany.value = []
    appointmentForm.value.studentUserIds = []
    return
  }
  const g = groups.value.find(gr => gr.id === appointmentForm.value.groupId)
  const comp = g?.companies.find(c => c.companyId === newCompanyId)
  if (comp?.students) {
    availableStudentsForCompany.value = comp.students.map(s => ({
      id: s.id,
      name: `${s.prefix || ''}${s.firstName || ''} ${s.lastName || ''} (${s.loginId})`.trim(),
      major: s.classGroup ? `หมู่ ${s.classGroup}` : ''
    }))
    appointmentForm.value.studentUserIds = comp.students.map(s => s.id)
  } else {
    availableStudentsForCompany.value = []
    appointmentForm.value.studentUserIds = []
  }
})

// When group changes in form, reset company and preselect all teachers of that group
watch(() => appointmentForm.value.groupId, (newGroupId) => {
  appointmentForm.value.companyId = undefined
  availableStudentsForCompany.value = []
  appointmentForm.value.studentUserIds = []
  if (!newGroupId) {
    appointmentForm.value.teacherUserIds = []
    return
  }
  const g = groups.value.find((gr: SupervisionGroup) => gr.id === newGroupId)
  if (g) {
    appointmentForm.value.teacherUserIds = g.teachers.map((t: SupervisionGroup['teachers'][number]) => t.teacherUserId)
  }
})

const openCreateModal = () => {
  const defaultGroupId = groups.value[0]?.id
  const defaultTeachers = groups.value[0]?.teachers.map((t: SupervisionGroup['teachers'][number]) => t.teacherUserId) || []
  appointmentForm.value = {
    groupId: defaultGroupId,
    companyId: undefined,
    scheduledDate: new Date().toISOString().split('T')[0] ?? '',
    period: 'MORNING',
    timeNote: '',
    studentUserIds: [],
    teacherUserIds: defaultTeachers
  }
  availableStudentsForCompany.value = []
  isCreateModalOpen.value = true
}

const handleCreateAppointment = async () => {
  if (!appointmentForm.value.groupId) {
    notify.warning('กรุณาเลือกกลุ่มนิเทศ')
    return
  }
  if (!appointmentForm.value.companyId) {
    notify.warning('กรุณาเลือกสถานประกอบการ')
    return
  }
  if (!appointmentForm.value.scheduledDate) {
    notify.warning('กรุณาเลือกวันที่นิเทศ')
    return
  }
  if (!selectedRoundId.value) return

  isSavingAppointment.value = true
  try {
    await $fetch(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/appointments`,
      {
        method: 'POST',
        body: appointmentForm.value
      }
    )
    notify.success('สร้างร่างนัดหมายสำเร็จ')
    isCreateModalOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถสร้างนัดหมายได้')
  } finally {
    isSavingAppointment.value = false
  }
}

// Reschedule Modal
const isRescheduleOpen = ref(false)
const appointmentToReschedule = ref<SupervisionAppointmentRow | null>(null)
const rescheduleForm = ref({
  scheduledDate: '',
  period: 'MORNING' as AppointmentPeriod,
  reason: ''
})
const isRescheduling = ref(false)

const openRescheduleModal = (appointment: SupervisionAppointmentRow) => {
  appointmentToReschedule.value = appointment
  rescheduleForm.value = {
    scheduledDate: appointment.scheduledDate.split('T')[0] ?? '',
    period: appointment.period,
    reason: ''
  }
  isRescheduleOpen.value = true
}

const handleReschedule = async () => {
  if (!rescheduleForm.value.reason.trim()) {
    notify.warning('กรุณาระบุเหตุผลในการเลื่อนนัดหมาย')
    return
  }
  if (!appointmentToReschedule.value || !selectedRoundId.value) return

  isRescheduling.value = true
  try {
    await $fetch(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/appointments/${appointmentToReschedule.value.id}/reschedule`,
      {
        method: 'POST',
        body: rescheduleForm.value
      }
    )
    notify.success('เลื่อนกำหนดการนัดหมายและแจ้งเตือนผู้เกี่ยวข้องแล้ว')
    isRescheduleOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถเลื่อนกำหนดการได้')
  } finally {
    isRescheduling.value = false
  }
}

// Cancel Appointment Modal
const isCancelOpen = ref(false)
const appointmentToCancel = ref<SupervisionAppointmentRow | null>(null)
const cancelReason = ref('')
const isCancelling = ref(false)

const openCancelModal = (appointment: SupervisionAppointmentRow) => {
  appointmentToCancel.value = appointment
  cancelReason.value = ''
  isCancelOpen.value = true
}

const handleCancelAppointment = async () => {
  if (!cancelReason.value.trim()) {
    notify.warning('กรุณาระบุเหตุผลในการยกเลิกนัดหมาย')
    return
  }
  if (!appointmentToCancel.value || !selectedRoundId.value) return

  isCancelling.value = true
  try {
    await $fetch(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/appointments/${appointmentToCancel.value.id}/cancel`,
      {
        method: 'POST',
        body: { reason: cancelReason.value }
      }
    )
    notify.success('ยกเลิกนัดหมายและแจ้งเตือนผู้เกี่ยวข้องแล้ว')
    isCancelOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถยกเลิกนัดหมายได้')
  } finally {
    isCancelling.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header & Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-calendar-days" class="size-5 text-primary" />
          ตารางนิเทศสหกิจศึกษา
        </h2>
        <p class="text-xs text-muted mt-0.5">
          วางแผน สร้างร่างนัดหมาย ตรวจสอบเวลาซ้ำซ้อน และเผยแพร่กำหนดการออกตรวจนิเทศ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
          <USelect
            v-model="selectedRoundId"
            :items="roundOptions"
            class="w-52"
            size="sm"
            :disabled="rounds.length === 0"
          />
        </div>

        <UButton
          label="สร้างนัดหมาย"
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          :disabled="rounds.length === 0"
          @click="openCreateModal"
        />

        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- No rounds alert -->
    <div v-if="rounds.length === 0" class="p-4 rounded-lg bg-info/10 border border-info/30 text-info flex items-center gap-3">
      <UIcon name="i-lucide-info" class="size-5 shrink-0" />
      <div class="text-xs">
        <span class="font-semibold">ยังไม่มีรอบการนิเทศในรอบสหกิจนี้:</span>
        กรุณาสร้างรอบการนิเทศในแท็บ "รอบและกลุ่มนิเทศ" ก่อนเริ่มสร้างนัดหมาย
      </div>
    </div>

    <!-- Filter Row & Bulk Actions -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-muted/5 p-3 rounded-lg border border-default">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="ค้นหาสถานประกอบการ อาจารย์ หรือนักศึกษา..."
          class="w-64"
          size="sm"
        />

        <USelect
          v-model="selectedGroupId"
          :items="groupFilterOptions"
          class="w-40"
          size="sm"
        />

        <USelect
          v-model="selectedStatus"
          :items="statusFilterOptions"
          class="w-48"
          size="sm"
        />

        <UButton
          v-if="searchQuery || selectedGroupId !== 'ALL' || selectedStatus !== 'ALL'"
          label="ล้างตัวกรอง"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="searchQuery = ''; selectedGroupId = 'ALL'; selectedStatus = 'ALL'"
        />
      </div>

      <!-- Bulk Publish Action -->
      <div v-if="selectedAppointmentIds.length > 0" class="flex items-center gap-2">
        <span class="text-xs text-muted">เลือก {{ selectedAppointmentIds.length }} รายการ</span>
        <UButton
          :label="`เผยแพร่ที่เลือก (${selectedAppointmentIds.length})`"
          icon="i-lucide-send"
          color="success"
          size="sm"
          :loading="isBulkPublishing"
          @click="handleBulkPublish"
        />
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="appointments"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <!-- Date / Period Cell -->
          <template #scheduledDate-cell="{ row }">
            <div class="flex items-start gap-2">
              <input
                v-if="row.original.status === 'DRAFT'"
                type="checkbox"
                :checked="selectedAppointmentIds.includes(row.original.id)"
                class="mt-1 size-4 rounded border-default text-primary cursor-pointer"
                @change="(e: any) => {
                  if (e.target.checked) selectedAppointmentIds.push(row.original.id)
                  else selectedAppointmentIds = selectedAppointmentIds.filter(id => id !== row.original.id)
                }"
              />
              <div>
                <div class="font-medium text-highlighted text-xs flex items-center gap-1.5">
                  <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                  {{ formatDate(row.original.scheduledDate) }}
                </div>
                <div class="text-[11px] text-muted mt-0.5">
                  {{ periodMap[row.original.period] || row.original.period }}
                </div>
                <div v-if="row.original.timeNote" class="text-[11px] text-primary/80 mt-0.5 flex items-center gap-1">
                  <UIcon name="i-lucide-clock" class="size-3 shrink-0" />
                  <span>{{ row.original.timeNote }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Group Cell -->
          <template #group-cell="{ row }">
            <div class="text-xs font-medium text-highlighted">
              {{ row.original.group.name }}
            </div>
          </template>

          <!-- Company Cell -->
          <template #company-cell="{ row }">
            <div>
              <div class="font-semibold text-xs text-highlighted">
                {{ row.original.companyName || row.original.company?.name }}
              </div>
              <div class="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3 shrink-0" />
                <span>{{ row.original.province || row.original.company?.province || 'ไม่ระบุจังหวัด' }}</span>
              </div>
              <div v-if="row.original.changeReason" class="mt-1 text-[11px] text-warning bg-warning/10 px-2 py-0.5 rounded">
                เหตุผลที่เลื่อน: {{ row.original.changeReason }}
              </div>
              <div v-if="row.original.cancelReason" class="mt-1 text-[11px] text-error bg-error/10 px-2 py-0.5 rounded">
                เหตุผลที่ยกเลิก: {{ row.original.cancelReason }}
              </div>
            </div>
          </template>

          <!-- Participants Cell -->
          <template #participants-cell="{ row }">
            <div class="space-y-1 text-xs">
              <div class="flex items-center gap-1.5 text-highlighted">
                <UIcon name="i-lucide-graduation-cap" class="size-3.5 text-primary shrink-0" />
                <span class="font-medium">นักศึกษา ({{ row.original.students.length }} คน):</span>
                <span class="text-muted text-[11px] truncate">
                  {{ row.original.students.map(s => `${s.prefix || ''}${s.firstName}`).join(', ') }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 text-highlighted">
                <UIcon name="i-lucide-user" class="size-3.5 text-muted shrink-0" />
                <span class="font-medium">อาจารย์:</span>
                <span class="text-muted text-[11px] truncate">
                  {{ row.original.teachers.map(t => `${t.prefix || ''}${t.firstName}`).join(', ') }}
                </span>
              </div>
            </div>
          </template>

          <!-- Status Cell -->
          <template #status-cell="{ row }">
            <UBadge
              :label="statusMap[row.original.status]?.label || row.original.status"
              :color="statusMap[row.original.status]?.color || 'neutral'"
              variant="subtle"
              size="xs"
            />
          </template>

          <!-- Actions Cell -->
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1">
              <!-- Draft actions -->
              <template v-if="row.original.status === 'DRAFT'">
                <UButton
                  label="เผยแพร่"
                  icon="i-lucide-send"
                  color="success"
                  variant="subtle"
                  size="xs"
                  @click="handlePublishSingle(row.original.id)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="ยกเลิกนัดหมาย"
                  @click="openCancelModal(row.original)"
                />
              </template>

              <!-- Published or Rescheduled actions -->
              <template v-else-if="row.original.status === 'PUBLISHED' || row.original.status === 'RESCHEDULED'">
                <UButton
                  label="เลื่อนนัด"
                  icon="i-lucide-calendar-clock"
                  color="warning"
                  variant="ghost"
                  size="xs"
                  @click="openRescheduleModal(row.original)"
                />
                <UButton
                  label="ยกเลิก"
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="openCancelModal(row.original)"
                />
              </template>

              <span v-else class="text-xs text-muted italic">—</span>
            </div>
          </template>

          <!-- Empty State -->
          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-calendar-days" class="size-8 mx-auto mb-2 text-dimmed" />
              <p class="font-medium text-highlighted">ยังไม่มีข้อมูลตารางนิเทศในเงื่อนไขที่เลือก</p>
              <p class="text-xs text-muted mt-1">
                คลิก "สร้างนัดหมาย" ด้านบนเพื่อเริ่มจัดตารางการตรวจนิเทศ
              </p>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Pagination -->
      <div v-if="data && data.total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default text-xs text-muted">
        <div>
          แสดง {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, data.total) }} จากทั้งหมด {{ data.total }} รายการ
        </div>

        <UPagination
          v-model:page="page"
          :total="data.total"
          :items-per-page="pageSize"
          size="sm"
        />
      </div>
    </div>

    <!-- Modal: Create Appointment -->
    <UModal v-model:open="isCreateModalOpen" title="สร้างนัดหมายตรวจนิเทศ (ฉบับร่าง)" size="lg">
      <template #body>
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-highlighted mb-1">กลุ่มนิเทศ *</label>
              <USelect
                v-model="appointmentForm.groupId"
                :items="groupOptions"
                placeholder="เลือกกลุ่มนิเทศ..."
                class="w-full"
                size="sm"
              />
            </div>

            <div>
              <label class="block font-medium text-highlighted mb-1">สถานประกอบการ *</label>
              <USelect
                v-model="appointmentForm.companyId"
                :items="groupCompaniesOptions"
                placeholder="เลือกสถานประกอบการในกลุ่ม..."
                class="w-full"
                size="sm"
                :disabled="!appointmentForm.groupId"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-highlighted mb-1">วันที่นิเทศ *</label>
              <UInput
                v-model="appointmentForm.scheduledDate"
                type="date"
                class="w-full"
                size="sm"
              />
            </div>

            <div>
              <label class="block font-medium text-highlighted mb-1">ช่วงเวลา *</label>
              <USelect
                v-model="appointmentForm.period"
                :items="[
                  { label: 'ช่วงเช้า (09:00 - 12:00)', value: 'MORNING' },
                  { label: 'ช่วงบ่าย (13:00 - 16:30)', value: 'AFTERNOON' },
                  { label: 'เต็มวัน', value: 'FULL_DAY' }
                ]"
                class="w-full"
                size="sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-highlighted mb-1">รายละเอียดเวลานัดหมาย / ห้องประชุม</label>
            <UInput
              v-model="appointmentForm.timeNote"
              placeholder="เช่น เริ่ม 09:30 น. ห้องประชุม 2 อาคารอำนวยการ"
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Select Students -->
          <div class="p-3 bg-muted/10 rounded-lg border border-default space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-medium text-highlighted">นักศึกษาที่เข้ารับการนิเทศ</label>
              <span class="text-muted text-[11px]">{{ appointmentForm.studentUserIds.length }} คนที่เลือก</span>
            </div>
            <div v-if="availableStudentsForCompany.length > 0" class="space-y-1.5 max-h-36 overflow-y-auto">
              <label
                v-for="std in availableStudentsForCompany"
                :key="std.id"
                class="flex items-center gap-2 p-1.5 rounded hover:bg-muted/20 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  :value="std.id"
                  v-model="appointmentForm.studentUserIds"
                  class="size-4 rounded text-primary"
                />
                <span class="font-medium text-highlighted">{{ std.name }}</span>
                <span v-if="std.major" class="text-muted text-[11px]">({{ std.major }})</span>
              </label>
            </div>
            <div v-else class="text-muted italic text-[11px]">
              {{ appointmentForm.companyId ? 'ไม่พบข้อมูลนักศึกษาในสถานประกอบการนี้' : 'กรุณาเลือกสถานประกอบการก่อน' }}
            </div>
          </div>

          <!-- Select Teachers -->
          <div class="p-3 bg-muted/10 rounded-lg border border-default space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-medium text-highlighted">อาจารย์ผู้นิเทศ</label>
              <span class="text-muted text-[11px]">{{ appointmentForm.teacherUserIds.length }} ท่านที่เลือก</span>
            </div>
            <div v-if="groupTeachersList.length > 0" class="space-y-1.5 max-h-36 overflow-y-auto">
              <label
                v-for="tch in groupTeachersList"
                :key="tch.id"
                class="flex items-center gap-2 p-1.5 rounded hover:bg-muted/20 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  :value="tch.id"
                  v-model="appointmentForm.teacherUserIds"
                  class="size-4 rounded text-primary"
                />
                <span class="font-medium text-highlighted">{{ tch.name }}</span>
              </label>
            </div>
            <div v-else class="text-muted italic text-[11px]">
              กรุณาเลือกกลุ่มนิเทศก่อน
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            @click="isCreateModalOpen = false"
          />
          <UButton
            label="บันทึกร่างนัดหมาย"
            color="primary"
            :loading="isSavingAppointment"
            @click="handleCreateAppointment"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Reschedule Appointment -->
    <UModal v-model:open="isRescheduleOpen" title="เลื่อนกำหนดการนิเทศ">
      <template #body>
        <div v-if="appointmentToReschedule" class="space-y-4 text-xs">
          <div class="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-highlight">
            <div class="font-semibold text-highlighted">สถานประกอบการ: {{ appointmentToReschedule.companyName || appointmentToReschedule.company?.name }}</div>
            <div class="text-[11px] text-muted mt-0.5">
              กำหนดการเดิม: {{ formatDate(appointmentToReschedule.scheduledDate) }} ({{ periodMap[appointmentToReschedule.period] }})
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-highlighted mb-1">กำหนดการใหม่ *</label>
              <UInput
                v-model="rescheduleForm.scheduledDate"
                type="date"
                class="w-full"
                size="sm"
              />
            </div>
            <div>
              <label class="block font-medium text-highlighted mb-1">ช่วงเวลา *</label>
              <USelect
                v-model="rescheduleForm.period"
                :items="[
                  { label: 'ช่วงเช้า (09:00 - 12:00)', value: 'MORNING' },
                  { label: 'ช่วงบ่าย (13:00 - 16:30)', value: 'AFTERNOON' },
                  { label: 'เต็มวัน', value: 'FULL_DAY' }
                ]"
                class="w-full"
                size="sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-highlighted mb-1">เหตุผลในการเลื่อน *</label>
            <UInput
              v-model="rescheduleForm.reason"
              placeholder="ระบุสาเหตุที่ต้องเลื่อนการนิเทศ เพื่อแจ้งอาจารย์และนักศึกษา"
              class="w-full"
              size="sm"
            />
          </div>

          <p class="text-[11px] text-muted italic">
            * เมื่อบันทึก ระบบจะส่งการแจ้งเตือนไปยังนักศึกษาและอาจารย์ผู้นิเทศที่เกี่ยวข้อง
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            @click="isRescheduleOpen = false"
          />
          <UButton
            label="ยืนยันการเลื่อนนัด"
            color="warning"
            :loading="isRescheduling"
            @click="handleReschedule"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Cancel Appointment -->
    <UModal v-model:open="isCancelOpen" title="ยกเลิกการนัดหมายนิเทศ">
      <template #body>
        <div v-if="appointmentToCancel" class="space-y-4 text-xs">
          <div class="p-3 rounded-lg bg-error/10 border border-error/30">
            <div class="font-semibold text-error">คุณต้องการยกเลิกการนัดหมายนี้หรือไม่?</div>
            <div class="text-[11px] text-muted mt-1">
              สถานประกอบการ: {{ appointmentToCancel.companyName || appointmentToCancel.company?.name }} ({{ formatDate(appointmentToCancel.scheduledDate) }})
            </div>
          </div>

          <div>
            <label class="block font-medium text-highlighted mb-1">เหตุผลในการยกเลิก *</label>
            <UInput
              v-model="cancelReason"
              placeholder="ระบุสาเหตุการยกเลิก เพื่อแจ้งอาจารย์และนักศึกษา"
              class="w-full"
              size="sm"
            />
          </div>

          <p class="text-[11px] text-muted italic">
            * การยกเลิกจะส่งแจ้งเตือนไปยังผู้เกี่ยวข้องทุกคนทันที
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="ย้อนกลับ"
            color="neutral"
            variant="outline"
            @click="isCancelOpen = false"
          />
          <UButton
            label="ยืนยันยกเลิกนัดหมาย"
            color="error"
            :loading="isCancelling"
            @click="handleCancelAppointment"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
