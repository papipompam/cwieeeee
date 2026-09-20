<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type AppointmentStatus = 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'
type StudentScoreKey = 'responsibilityScore' | 'disciplineScore' | 'communicationScore' | 'knowledgeScore' | 'workQualityScore' | 'problemSolvingScore'
type CompanyScoreKey = 'workAlignmentScore' | 'workScopeScore' | 'learningOpportunityScore' | 'supervisorReadinessScore' | 'studentSupportScore' | 'environmentScore' | 'safetyScore' | 'resourcesScore' | 'welfareScore' | 'travelScore' | 'transportScore' | 'accommodationScore' | 'coordinationScore'
type StudentEvaluation = Record<StudentScoreKey, number | null> & { strengths: string | null, problems: string | null, recommendations: string | null, followUp: string | null }
type CompanyEvaluation = Record<CompanyScoreKey, number | null> & { observations: string | null, companyNeeds: string | null, problems: string | null, recommendations: string | null, futureRecommendation: string | null }

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

interface StudentEvaluationItem {
  appointmentId: number
  companyName: string
  student: { id: number, studentId: string, name: string, position: string | null }
  evaluation: StudentEvaluation | null
}

interface CompanyEvaluationItem {
  appointmentId: number
  companyName: string
  evaluation: CompanyEvaluation | null
}

const { data: appointments, status, error, refresh } = await useFetch<Appointment[]>('/api/teacher/appointments')
const { data: studentEvaluationItems, refresh: refreshStudentEvaluations } = await useFetch<StudentEvaluationItem[]>('/api/teacher/student-evaluations')
const { data: companyEvaluationItems, refresh: refreshCompanyEvaluations } = await useFetch<CompanyEvaluationItem[]>('/api/teacher/company-evaluations')

const route = useRoute()
const notify = useNotify()
const search = ref('')
const statusFilter = ref<'ALL' | AppointmentStatus>('ALL')
const roundFilter = ref<number | null>(null)
const groupFilter = ref<number | null>(null)
const page = ref(1)
const pageSize = 10
const detailOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)
const studentEvaluationOpen = ref(false)
const companyEvaluationOpen = ref(false)
const selectedEvaluationAppointment = ref<Appointment | null>(null)
const selectedStudentEvaluation = ref<StudentEvaluationItem | null>(null)
const studentSaving = ref(false)
const companySaving = ref(false)
const appointmentId = computed(() => {
  const value = route.query.appointmentId
  const id = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(id) && id > 0 ? id : null
})

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

    return (!appointmentId.value || appointment.id === appointmentId.value)
      && (!keyword || searchable.includes(keyword))
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

const studentScoreLabels: Array<{ key: StudentScoreKey, label: string }> = [
  { key: 'responsibilityScore', label: 'ความรับผิดชอบและตรงต่อเวลา' },
  { key: 'disciplineScore', label: 'วินัยและจรรยาบรรณในการทำงาน' },
  { key: 'communicationScore', label: 'การสื่อสารและทำงานร่วมกับผู้อื่น' },
  { key: 'knowledgeScore', label: 'การประยุกต์ใช้ความรู้กับงาน' },
  { key: 'workQualityScore', label: 'คุณภาพและความก้าวหน้าของงาน' },
  { key: 'problemSolvingScore', label: 'การเรียนรู้และแก้ไขปัญหา' }
]
const companyScoreLabels: Array<{ key: CompanyScoreKey, label: string }> = [
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
const studentForm = reactive<Record<StudentScoreKey | 'strengths' | 'problems' | 'recommendations' | 'followUp', number | null | string>>({ responsibilityScore: null, disciplineScore: null, communicationScore: null, knowledgeScore: null, workQualityScore: null, problemSolvingScore: null, strengths: '', problems: '', recommendations: '', followUp: '' })
const companyForm = reactive<Record<CompanyScoreKey | 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation', number | null | string>>(Object.fromEntries([...companyScoreLabels.map(item => [item.key, null]), ['observations', ''], ['companyNeeds', ''], ['problems', ''], ['recommendations', ''], ['futureRecommendation', '']]) as Record<CompanyScoreKey | 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation', number | null | string>)
const studentItemsForSelectedAppointment = computed(() => (studentEvaluationItems.value ?? []).filter(item => item.appointmentId === selectedEvaluationAppointment.value?.id))
const selectedCompanyEvaluation = computed(() => (companyEvaluationItems.value ?? []).find(item => item.appointmentId === selectedEvaluationAppointment.value?.id) ?? null)

const selectStudentEvaluation = (item: StudentEvaluationItem) => {
  selectedStudentEvaluation.value = item
  studentScoreLabels.forEach(({ key }) => { studentForm[key] = item.evaluation?.[key] ?? null })
  ;(['strengths', 'problems', 'recommendations', 'followUp'] as const).forEach(key => { studentForm[key] = item.evaluation?.[key] ?? '' })
}
const openStudentEvaluation = (appointment: Appointment) => {
  selectedEvaluationAppointment.value = appointment
  detailOpen.value = false
  const item = (studentEvaluationItems.value ?? []).find(value => value.appointmentId === appointment.id)
  if (!item) {
    notify.error('ไม่พบรายชื่อนักศึกษาสำหรับนัดหมายนี้')
    return
  }
  selectStudentEvaluation(item)
  studentEvaluationOpen.value = true
}
const openCompanyEvaluation = (appointment: Appointment) => {
  selectedEvaluationAppointment.value = appointment
  detailOpen.value = false
  const item = (companyEvaluationItems.value ?? []).find(value => value.appointmentId === appointment.id)
  if (!item) {
    notify.error('ไม่พบข้อมูลสถานประกอบการสำหรับนัดหมายนี้')
    return
  }
  companyScoreLabels.forEach(({ key }) => { companyForm[key] = item.evaluation?.[key] ?? null })
  ;(['observations', 'companyNeeds', 'problems', 'recommendations', 'futureRecommendation'] as const).forEach(key => { companyForm[key] = item.evaluation?.[key] ?? '' })
  companyEvaluationOpen.value = true
}
const setStudentScore = (key: StudentScoreKey, value: number, checked: boolean | 'indeterminate') => { studentForm[key] = checked ? value : studentForm[key] === value ? null : studentForm[key] }
const setCompanyScore = (key: CompanyScoreKey, value: number, checked: boolean | 'indeterminate') => { companyForm[key] = checked ? value : companyForm[key] === value ? null : companyForm[key] }
const submitStudentEvaluation = async () => {
  if (!selectedStudentEvaluation.value) return
  studentSaving.value = true
  try {
    await $fetch(`/api/teacher/student-evaluations/${selectedStudentEvaluation.value.appointmentId}/${selectedStudentEvaluation.value.student.id}`, { method: 'PUT', body: studentForm })
    notify.success(selectedStudentEvaluation.value.evaluation ? 'บันทึกการแก้ไขเรียบร้อยแล้ว' : 'บันทึกแบบประเมินเรียบร้อยแล้ว')
    studentEvaluationOpen.value = false
    await refreshStudentEvaluations()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถบันทึกแบบประเมินได้')
  } finally {
    studentSaving.value = false
  }
}
const submitCompanyEvaluation = async () => {
  if (!selectedCompanyEvaluation.value) return
  companySaving.value = true
  try {
    await $fetch(`/api/teacher/company-evaluations/${selectedCompanyEvaluation.value.appointmentId}`, { method: 'PUT', body: companyForm })
    notify.success(selectedCompanyEvaluation.value.evaluation ? 'บันทึกการแก้ไขเรียบร้อยแล้ว' : 'บันทึกแบบประเมินเรียบร้อยแล้ว')
    companyEvaluationOpen.value = false
    await refreshCompanyEvaluations()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถบันทึกแบบประเมินได้')
  } finally {
    companySaving.value = false
  }
}
watch([appointments, appointmentId], ([items, id]) => {
  if (!id || detailOpen.value) return
  const appointment = items?.find(item => item.id === id)
  if (appointment) openDetail(appointment)
}, { immediate: true })

const formatThaiDate = (value: string) => new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
const periodLabel = (period: string) => period === 'AFTERNOON' ? 'ช่วงบ่าย' : period === 'FULL_DAY' ? 'เต็มวัน' : 'ช่วงเช้า'
const statusBadge = (appointmentStatus: AppointmentStatus) => ({
  PUBLISHED: { label: 'รอการนิเทศ', color: 'info' as const },
  RESCHEDULED: { label: 'เลื่อนนัด', color: 'warning' as const },
  COMPLETED: { label: 'นิเทศเสร็จแล้ว', color: 'success' as const },
  CANCELLED: { label: 'ยกเลิก', color: 'neutral' as const }
}[appointmentStatus])

const columns: TableColumn<Appointment>[] = [
  { accessorKey: 'id', header: 'นัดหมาย', meta: { class: { th: 'w-24', td: 'w-24' } } },
  { id: 'schedule', header: 'วันและเวลา', meta: { class: { th: 'w-44', td: 'w-44' } } },
  { id: 'round', header: 'รอบ / กลุ่ม', meta: { class: { th: 'w-48', td: 'w-48' } } },
  { id: 'company', header: 'สถานประกอบการ', meta: { class: { th: 'min-w-56', td: 'min-w-56' } } },
  { id: 'students', header: 'นักศึกษา', meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end' } } },
  { id: 'status', header: 'สถานะ', meta: { class: { th: 'w-36', td: 'w-36' } } },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-72 text-end', td: 'w-72 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-visits">
    <template #header>
      <AppDashboardNavbar title="ตารางนิเทศของฉัน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><AppNotificationBell /></template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดตารางนิเทศได้" :description="error.message" />
        <UAlert v-else-if="appointmentId" color="info" variant="subtle" title="งานนิเทศที่เลือก" :description="`แสดงนัดหมาย #${appointmentId} — อาจารย์ทุกคนในกลุ่มประเมินหรือแก้ไขผลได้ทันที`" />

        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div>
              <h3 class="text-lg font-bold text-ink">ตารางนิเทศ</h3>
              <p class="mt-1 text-sm leading-6 text-muted">รายการนัดหมายนิเทศที่ได้รับมอบหมาย รองรับการค้นหา กรอง และบันทึกผลการประเมิน</p>
            </div>

            <div class="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <UInput
                v-model="search"
                type="search"
                size="xl"
                icon="i-lucide-search"
                placeholder="ค้นหานัดหมาย บริษัท กลุ่ม หรือนักศึกษา"
                class="w-full sm:max-w-xs xl:w-60"
                aria-label="ค้นหาตารางนิเทศ"
              />
              <div class="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
                <USelect v-model="roundFilter" :items="roundOptions" value-key="value" size="xl" class="w-full sm:w-40" aria-label="กรองตามครั้งที่นิเทศ" />
                <USelect v-model="groupFilter" :items="groupOptions" value-key="value" size="xl" class="w-full sm:w-46" aria-label="กรองตามกลุ่มนิเทศ" />
                <USelect v-model="statusFilter" :items="statusOptions" value-key="value" size="xl" class="w-full sm:w-36" aria-label="กรองตามสถานะ" />
                <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
              </div>
            </div>

            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="search" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ search }}”
              </span>
              <span v-if="roundFilter !== null" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ roundOptions.find(o => o.value === roundFilter)?.label }}
              </span>
              <span v-if="groupFilter !== null" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ groupOptions.find(o => o.value === groupFilter)?.label }}
              </span>
              <span v-if="statusFilter !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ statusOptions.find(o => o.value === statusFilter)?.label }}
              </span>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearFilters">
                ล้างทั้งหมด
              </UButton>
            </div>
          </div>

          <div v-if="status === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
            <div v-for="row in 4" :key="row" class="grid grid-cols-[6rem_1.2fr_1fr_8rem_6rem] gap-4 max-md:grid-cols-[1fr_6rem]">
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
            </div>
          </div>

          <div v-else-if="error" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-triangle-alert"
              title="ไม่สามารถโหลดตารางนิเทศได้"
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

          <div v-else-if="!paginatedAppointments.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-calendar-days"
              :title="hasFilters ? 'ไม่พบตารางนิเทศที่ตรงกับตัวกรอง' : 'ยังไม่มีตารางนิเทศที่ได้รับมอบหมาย'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'รายการจะแสดงเมื่อเจ้าหน้าที่มอบหมายและเผยแพร่ตารางให้คุณ'"
              class="min-h-64"
            >
              <template #actions>
                <UButton v-if="hasFilters" size="xl" color="neutral" variant="outline" @click="clearFilters">
                  ล้างตัวกรอง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                :data="paginatedAppointments"
                :columns="columns"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-220' }"
              >
                <template #id-cell="{ row }">
                  <span class="tabular-nums font-semibold text-ink">#{{ row.original.id }}</span>
                </template>
                <template #schedule-cell="{ row }">
                  <div>
                    <p class="font-medium text-ink">{{ formatThaiDate(row.original.scheduledDate) }}</p>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ periodLabel(row.original.period) }}<template v-if="row.original.timeNote"> · {{ row.original.timeNote }}</template>
                    </p>
                  </div>
                </template>
                <template #round-cell="{ row }">
                  <div>
                    <p class="font-medium text-ink">ครั้งที่ {{ row.original.round.roundNo }} · {{ row.original.round.cooperativeCycle.term }}/{{ row.original.round.cooperativeCycle.academicYear }}</p>
                    <p class="mt-0.5 text-xs text-muted">{{ row.original.group.name }}</p>
                  </div>
                </template>
                <template #company-cell="{ row }">
                  <div>
                    <p class="font-medium text-ink">{{ row.original.companyName }}</p>
                    <p class="mt-0.5 text-xs text-muted">{{ row.original.province || row.original.companyAddress || 'ไม่ระบุพื้นที่' }}</p>
                  </div>
                </template>
                <template #students-cell="{ row }">
                  <span class="tabular-nums text-ink">{{ row.original.students.length }} คน</span>
                </template>
                <template #status-cell="{ row }">
                  <UBadge :color="statusBadge(row.original.status).color" variant="subtle" size="sm">
                    {{ statusBadge(row.original.status).label }}
                  </UBadge>
                </template>
                <template #actions-header>
                  <span class="block text-right">จัดการ</span>
                </template>
                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                    <UButton
                      label="รายละเอียด"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-eye"
                      @click="openDetail(row.original)"
                    />
                    <UButton
                      v-if="row.original.status !== 'CANCELLED'"
                      label="ประเมินนักศึกษา"
                      color="primary"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-user-check"
                      @click="openStudentEvaluation(row.original)"
                    />
                    <UButton
                      v-if="row.original.status !== 'CANCELLED'"
                      label="ประเมินสถานที่"
                      color="primary"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-building"
                      @click="openCompanyEvaluation(row.original)"
                    />
                  </div>
                </template>
              </UTable>
            </div>

            <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span class="whitespace-nowrap text-muted">แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredAppointments.length }} รายการ</span>
              <UPagination
                v-if="filteredAppointments.length > pageSize"
                v-model:page="page"
                :total="filteredAppointments.length"
                :items-per-page="pageSize"
                size="md"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="detailOpen" :title="selectedAppointment ? `นัดหมาย #${selectedAppointment.id}` : 'รายละเอียดนัดหมาย'">
    <template #body>
      <div v-if="selectedAppointment" class="space-y-5 text-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-base font-semibold text-ink">{{ selectedAppointment.companyName }}</p>
            <p class="mt-1 text-muted">{{ selectedAppointment.companyAddress || selectedAppointment.province || 'ไม่ระบุที่อยู่' }}</p>
          </div>
          <UBadge :color="statusBadge(selectedAppointment.status).color" variant="subtle">
            {{ statusBadge(selectedAppointment.status).label }}
          </UBadge>
        </div>
        <div class="grid gap-3 rounded-panel bg-surface p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">วันและเวลา</p>
            <p class="mt-1 font-medium text-ink">{{ formatThaiDate(selectedAppointment.scheduledDate) }} · {{ periodLabel(selectedAppointment.period) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">รอบ / กลุ่มนิเทศ</p>
            <p class="mt-1 font-medium text-ink">ครั้งที่ {{ selectedAppointment.round.roundNo }} · {{ selectedAppointment.group.name }}</p>
          </div>
        </div>
        <div v-if="selectedAppointment.timeNote || selectedAppointment.changeReason || selectedAppointment.cancelReason" class="space-y-2">
          <p v-if="selectedAppointment.timeNote"><span class="text-muted">หมายเหตุเวลา: </span>{{ selectedAppointment.timeNote }}</p>
          <p v-if="selectedAppointment.changeReason"><span class="text-muted">เหตุผลการเลื่อน: </span>{{ selectedAppointment.changeReason }}</p>
          <p v-if="selectedAppointment.cancelReason"><span class="text-muted">เหตุผลการยกเลิก: </span>{{ selectedAppointment.cancelReason }}</p>
        </div>
        <div>
          <h3 class="font-medium text-ink">อาจารย์ตามแผน</h3>
          <ul class="mt-2 space-y-1 text-muted">
            <li v-for="teacher in selectedAppointment.teachers" :key="teacher.teacherId">
              {{ teacher.name }} <span v-if="teacher.phone">· {{ teacher.phone }}</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-medium text-ink">นักศึกษา</h3>
          <ul class="mt-2 divide-y divide-divider rounded-panel border border-divider">
            <li v-for="student in selectedAppointment.students" :key="student.studentId" class="flex items-center justify-between gap-3 p-3">
              <div>
                <p class="font-medium text-ink">{{ student.name }}</p>
                <p class="text-xs text-muted">{{ student.studentId }}</p>
              </div>
              <span class="text-xs text-muted">{{ student.position || 'ไม่ระบุตำแหน่ง' }}</span>
            </li>
          </ul>
        </div>
        <div v-if="selectedAppointment.travelPlans.length">
          <h3 class="font-medium text-ink">แผนการเดินทาง</h3>
          <ul class="mt-2 space-y-1 text-muted">
            <li v-for="plan in selectedAppointment.travelPlans" :key="`${plan.travelDate}-${plan.startLocation}`">
              {{ formatThaiDate(plan.travelDate) }} · เริ่มจาก {{ plan.startLocation }}
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-medium text-ink">ผู้ติดต่อสถานประกอบการ</h3>
          <p class="mt-1 text-muted">
            {{ selectedAppointment.companyContact.contactPerson }}
            <template v-if="selectedAppointment.companyContact.phone"> · {{ selectedAppointment.companyContact.phone }}</template>
            <template v-if="selectedAppointment.companyContact.email"> · {{ selectedAppointment.companyContact.email }}</template>
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div v-if="selectedAppointment && selectedAppointment.status !== 'CANCELLED'" class="flex flex-wrap justify-end gap-2">
        <UButton size="xl" label="ประเมินนักศึกษา" color="primary" variant="outline" @click="openStudentEvaluation(selectedAppointment)" />
        <UButton size="xl" label="ประเมินสถานที่" color="primary" @click="openCompanyEvaluation(selectedAppointment)" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="studentEvaluationOpen" :title="selectedEvaluationAppointment ? `ประเมินนักศึกษา · นัดหมาย #${selectedEvaluationAppointment.id}` : 'ประเมินนักศึกษา'">
    <template #body>
      <div v-if="selectedStudentEvaluation && selectedEvaluationAppointment" class="space-y-5">
        <div>
          <p class="text-sm text-muted">{{ selectedEvaluationAppointment.companyName }} · เลือกนักศึกษาที่ต้องการประเมิน</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="item in studentItemsForSelectedAppointment"
              :key="item.student.id"
              :label="item.student.name"
              :color="selectedStudentEvaluation.student.id === item.student.id ? 'primary' : 'neutral'"
              :variant="selectedStudentEvaluation.student.id === item.student.id ? 'solid' : 'outline'"
              size="sm"
              @click="selectStudentEvaluation(item)"
            />
          </div>
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
              <tr v-for="item in studentScoreLabels" :key="item.key" class="border-t border-divider">
                <th scope="row" class="px-3 py-2 text-left font-medium text-ink">{{ item.label }}</th>
                <td v-for="score in [5, 4, 3, 2, 1]" :key="score" class="px-2 py-2 text-center">
                  <UCheckbox
                    :model-value="studentForm[item.key] === score"
                    size="sm"
                    :aria-label="`${item.label}: ${score} คะแนน`"
                    @update:model-value="setStudentScore(item.key, score, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-for="field in [{ key: 'strengths', label: 'จุดเด่น' }, { key: 'problems', label: 'ปัญหาที่พบ' }, { key: 'recommendations', label: 'ข้อเสนอแนะ' }, { key: 'followUp', label: 'สิ่งที่ต้องติดตามครั้งถัดไป' }]"
            :key="field.key"
            :label="field.label"
          >
            <UTextarea
              v-model="studentForm[field.key as 'strengths' | 'problems' | 'recommendations' | 'followUp'] as string"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton size="xl" color="neutral" variant="ghost" @click="studentEvaluationOpen = false">ยกเลิก</UButton>
        <UButton
          size="xl"
          color="primary"
          :label="selectedStudentEvaluation?.evaluation ? 'บันทึกการแก้ไข' : 'บันทึกแบบประเมิน'"
          :loading="studentSaving"
          @click="submitStudentEvaluation"
        />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="companyEvaluationOpen" :title="selectedEvaluationAppointment ? `ประเมินสถานประกอบการ · นัดหมาย #${selectedEvaluationAppointment.id}` : 'ประเมินสถานประกอบการ'">
    <template #body>
      <div v-if="selectedCompanyEvaluation" class="space-y-5">
        <p class="text-sm text-muted">{{ selectedCompanyEvaluation.companyName }} · บันทึกแล้วสามารถกลับมาแก้ไขได้ตลอด</p>
        <div class="overflow-x-auto rounded-panel border border-divider">
          <table class="min-w-full text-sm">
            <thead class="bg-surface text-muted">
              <tr>
                <th class="min-w-64 px-3 py-2 text-left font-medium">หัวข้อประเมิน</th>
                <th v-for="score in [5, 4, 3, 2, 1]" :key="score" class="w-14 px-2 py-2 text-center font-medium">{{ score }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in companyScoreLabels" :key="item.key" class="border-t border-divider">
                <th scope="row" class="px-3 py-2 text-left font-medium text-ink">{{ item.label }}</th>
                <td v-for="score in [5, 4, 3, 2, 1]" :key="score" class="px-2 py-2 text-center">
                  <UCheckbox
                    :model-value="companyForm[item.key] === score"
                    size="sm"
                    :aria-label="`${item.label}: ${score} คะแนน`"
                    @update:model-value="setCompanyScore(item.key, score, $event)"
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
              v-model="companyForm[field.key as 'observations' | 'companyNeeds' | 'problems' | 'recommendations' | 'futureRecommendation'] as string"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton size="xl" color="neutral" variant="ghost" @click="companyEvaluationOpen = false">ยกเลิก</UButton>
        <UButton
          size="xl"
          color="primary"
          :label="selectedCompanyEvaluation?.evaluation ? 'บันทึกการแก้ไข' : 'บันทึกแบบประเมิน'"
          :loading="companySaving"
          @click="submitCompanyEvaluation"
        />
      </div>
    </template>
  </UModal>
</template>
