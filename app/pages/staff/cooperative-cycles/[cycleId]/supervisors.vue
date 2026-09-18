<script setup lang="ts">
import type { Ref } from 'vue'

interface TeacherUser {
  id: number
  teacherId: string
  prefix: string
  firstName: string
  lastName: string
}

interface GroupTeacher {
  id: number
  teacherUserId: number
  teacher: {
    id: number
    loginId: string
    prefix: string | null
    firstName: string | null
    lastName: string | null
  }
}

interface GroupCompany {
  id: number
  companyId: number
  studentsCount: number
  company: {
    id: number
    name: string
    province: string | null
    district?: string | null
    addressNo?: string | null
  }
  students?: any[]
}

interface SupervisionGroup {
  id: number
  name: string
  note: string | null
  companiesCount: number
  studentsCount: number
  provinces: string[]
  teachers: GroupTeacher[]
  companies: GroupCompany[]
  appointments: Array<{
    companyId: number
    scheduledDate: string
    period: string
    timeNote: string | null
    status: string
  }>
  travelPlans?: Array<{
    startLocation: string
    fuelRate: number
    lodgingRate: number
    lodgingNights: number
    lodgingRooms: number
    note: string | null
    travellers: Array<{
      perDiemRate: number
      perDiemDays: number
      lodgingRate: number
      nights: number
      personsPerRoom: number
    }>
  }>
}

interface SupervisionRound {
  id: number
  roundNo: number
  title: string
  name?: string | null
  status: string
  groupsCount: number
  appointmentsCount: number
  publishedAppointmentsCount: number
}

interface UnassignedCompany {
  companyId: number
  companyName: string
  province: string | null
  address: string | null
  studentCount: number
  students: Array<{
    id: number
    studentId: string
    prefix: string
    firstName: string
    lastName: string
    major: string
    position: string
  }>
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<any>>('currentCycle')
const notify = useNotify()

const searchQuery = ref('')
const selectedRoundId = ref<number | undefined>(undefined)

// Fetch Rounds
const { data: roundsData, status: roundsStatus, refresh: refreshRounds } = await useFetch<{ rounds: SupervisionRound[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`
)

const rounds = computed(() => roundsData.value?.rounds || [])

// Watch rounds to set default active round
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
const { data: groupsData, status: groupsStatus, refresh: refreshGroups } = await useFetch<{ groups: SupervisionGroup[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/groups`,
  { watch: [selectedRoundId] }
)

const groups = computed(() => groupsData.value?.groups || [])

// Fetch Unassigned Companies for active round
const { data: unassignedData, status: unassignedStatus, refresh: refreshUnassigned } = await useFetch<{ companies: UnassignedCompany[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/unassigned-companies`,
  { watch: [selectedRoundId] }
)

const unassignedCompanies = computed(() => unassignedData.value?.companies || [])

// Fetch All Teachers
const { data: allTeachers } = await useFetch<TeacherUser[]>('/api/teachers')

const refreshAll = async () => {
  await Promise.all([refreshRounds(), refreshGroups(), refreshUnassigned()])
}

// Filtered groups by search
const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return groups.value
  const q = searchQuery.value.toLowerCase()
  return groups.value.filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.teachers.some(t =>
      `${t.teacher.prefix || ''}${t.teacher.firstName || ''} ${t.teacher.lastName || ''}`.toLowerCase().includes(q)
    ) ||
    g.companies.some(c => c.company.name.toLowerCase().includes(q)) ||
    g.provinces.some(p => p.toLowerCase().includes(q))
  )
})

// Create Round Modal
const isCreateRoundOpen = ref(false)
const createRoundForm = ref({
  title: 'การนิเทศรอบที่ 1'
})
const isCreatingRound = ref(false)

const openCreateRoundModal = () => {
  const nextNo = rounds.value.length > 0 ? Math.max(...rounds.value.map(r => r.roundNo)) + 1 : 1
  createRoundForm.value = {
    title: `การนิเทศรอบที่ ${nextNo}`
  }
  isCreateRoundOpen.value = true
}

const handleCreateRound = async () => {
  if (!createRoundForm.value.title.trim()) {
    notify.warning('กรุณากรอกชื่อรอบการนิเทศ')
    return
  }
  isCreatingRound.value = true
  try {
    const res = await $fetch<{ round: SupervisionRound }>(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`, {
      method: 'POST',
      body: { name: createRoundForm.value.title.trim() }
    })
    notify.success('สร้างครั้งที่นิเทศสำเร็จ')
    isCreateRoundOpen.value = false
    await refreshRounds()
    if (res.round?.id) {
      selectedRoundId.value = res.round.id
    }
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถสร้างรอบการนิเทศได้')
  } finally {
    isCreatingRound.value = false
  }
}

// Create / Edit Group Modal
const isGroupModalOpen = ref(false)
const editingGroupId = ref<number | null>(null)
const groupForm = ref({
  name: '',
  note: ''
})
const isSavingGroup = ref(false)
const selectedTeacherIds = ref<number[]>([])
const selectedCompanyPlans = ref<Array<{
  companyId: number
  scheduledDate: string
  period: string
  timeNote: string
  distanceKmFromPrevious: number
}>>([])
const budgetForm = ref({
  startLocation: 'มหาวิทยาลัย',
  fuelRate: 4,
  perDiemRate: 240,
  perDiemDays: 1,
  lodgingRate: 1500,
  nights: 0,
  rooms: 0,
  note: ''
})
const teacherSearchQuery = ref('')
const companySearchQuery = ref('')
const periodOptions = [
  { label: 'ช่วงเช้า', value: 'MORNING' },
  { label: 'ช่วงบ่าย', value: 'AFTERNOON' },
  { label: 'เต็มวัน', value: 'FULL_DAY' }
]

const defaultBudget = () => ({
  startLocation: 'มหาวิทยาลัย', fuelRate: 4, perDiemRate: 240, perDiemDays: 1,
  lodgingRate: 1500, nights: 0, rooms: 0, note: ''
})

const defaultScheduleDate = () => new Date().toISOString().slice(0, 10)

const openCreateGroupModal = () => {
  editingGroupId.value = null
  const nextIdx = groups.value.length + 1
  groupForm.value = {
    name: `กลุ่มที่ ${nextIdx}`,
    note: ''
  }
  selectedTeacherIds.value = []
  selectedCompanyPlans.value = []
  budgetForm.value = defaultBudget()
  teacherSearchQuery.value = ''
  companySearchQuery.value = ''
  isGroupModalOpen.value = true
}

const openEditGroupModal = (group: SupervisionGroup) => {
  editingGroupId.value = group.id
  groupForm.value = {
    name: group.name,
    note: group.note || ''
  }
  selectedTeacherIds.value = group.teachers.map(teacher => teacher.teacherUserId)
  selectedCompanyPlans.value = group.companies.map((company) => {
    const appointment = group.appointments.find(item => item.companyId === company.companyId)
    return {
      companyId: company.companyId,
      scheduledDate: appointment?.scheduledDate?.slice(0, 10) || defaultScheduleDate(),
      period: appointment?.period || 'MORNING',
      timeNote: appointment?.timeNote || '',
      distanceKmFromPrevious: 0
    }
  })
  const plan = group.travelPlans?.[0]
  const traveller = plan?.travellers?.[0]
  budgetForm.value = {
    startLocation: plan?.startLocation || 'มหาวิทยาลัย', fuelRate: plan?.fuelRate ?? 4,
    perDiemRate: traveller?.perDiemRate ?? 240, perDiemDays: traveller?.perDiemDays ?? 1,
    lodgingRate: plan?.lodgingRate ?? traveller?.lodgingRate ?? 1500, nights: plan?.lodgingNights ?? traveller?.nights ?? 0,
    rooms: plan?.lodgingRooms ?? 0, note: plan?.note || ''
  }
  teacherSearchQuery.value = ''
  companySearchQuery.value = ''
  isGroupModalOpen.value = true
}

const handleSaveGroup = async () => {
  if (!groupForm.value.name.trim()) {
    notify.warning('กรุณากรอกชื่อกลุ่ม')
    return
  }
  if (!selectedRoundId.value) return
  if (selectedTeacherIds.value.length === 0) {
    notify.warning('กรุณาเลือกอาจารย์ผู้นิเทศอย่างน้อย 1 ท่าน')
    return
  }
  if (selectedCompanyPlans.value.length === 0) {
    notify.warning('กรุณาเลือกสถานประกอบการอย่างน้อย 1 แห่ง')
    return
  }

  isSavingGroup.value = true
  try {
    if (editingGroupId.value) {
      await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${editingGroupId.value}`, {
        method: 'PATCH',
      body: {
        ...groupForm.value,
        teacherUserIds: selectedTeacherIds.value,
        companyPlans: selectedCompanyPlans.value,
        budget: budgetForm.value
      }
      })
      notify.success('อัปเดตข้อมูลกลุ่มสำเร็จ')
    } else {
      await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups`, {
        method: 'POST',
        body: {
          ...groupForm.value,
          teacherUserIds: selectedTeacherIds.value,
          companyIds: selectedCompanyPlans.value.map(plan => plan.companyId),
          companyPlans: selectedCompanyPlans.value,
          budget: budgetForm.value
        }
      })
      notify.success('สร้างกลุ่มนิเทศสำเร็จ')
    }
    isGroupModalOpen.value = false
    await refreshAll()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถบันทึกกลุ่มได้')
  } finally {
    isSavingGroup.value = false
  }
}

// Delete Group Modal
const isDeleteGroupOpen = ref(false)
const groupToDelete = ref<SupervisionGroup | null>(null)
const isDeletingGroup = ref(false)

const confirmDeleteGroup = (group: SupervisionGroup) => {
  groupToDelete.value = group
  isDeleteGroupOpen.value = true
}

const handleDeleteGroup = async () => {
  if (!groupToDelete.value || !selectedRoundId.value) return
  isDeletingGroup.value = true
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${groupToDelete.value.id}`, {
      method: 'DELETE'
    })
    notify.success('ลบกลุ่มนิเทศเรียบร้อยแล้ว')
    isDeleteGroupOpen.value = false
    await refreshAll()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถลบกลุ่มได้')
  } finally {
    isDeletingGroup.value = false
  }
}

// Manage Group Drawer / Modal (Assign teachers & companies)
const activeManageGroup = ref<SupervisionGroup | null>(null)
const isManageModalOpen = ref(false)

const openManageGroup = (group: SupervisionGroup) => {
  activeManageGroup.value = group
  manageTeacherSearchQuery.value = ''
  manageCompanySearchQuery.value = ''
  isManageModalOpen.value = true
}

// Teachers available to assign in this round
const assignedTeacherIdsInRound = computed(() => {
  const set = new Set<number>()
  for (const g of groups.value) {
    for (const t of g.teachers) {
      set.add(t.teacherUserId)
    }
  }
  return set
})

const availableTeachers = computed(() => {
  if (!allTeachers.value) return []
  return allTeachers.value
    .filter(t => !assignedTeacherIdsInRound.value.has(t.id))
})

const selectableTeachers = computed(() => {
  if (!allTeachers.value) return []
  const currentTeacherIds = editingGroupId.value
    ? new Set(groups.value.find(group => group.id === editingGroupId.value)?.teachers.map(teacher => teacher.teacherUserId) || [])
    : new Set<number>()
  return allTeachers.value.filter(teacher => currentTeacherIds.has(teacher.id) || !assignedTeacherIdsInRound.value.has(teacher.id))
})

const filteredTeachers = computed(() => {
  const query = teacherSearchQuery.value.trim().toLowerCase()
  if (!query) return selectableTeachers.value
  return selectableTeachers.value.filter(teacher =>
    `${teacher.prefix}${teacher.firstName} ${teacher.lastName} ${teacher.teacherId}`.toLowerCase().includes(query)
  )
})

const toggleTeacher = (teacherId: number) => {
  selectedTeacherIds.value = selectedTeacherIds.value.includes(teacherId)
    ? selectedTeacherIds.value.filter(id => id !== teacherId)
    : [...selectedTeacherIds.value, teacherId]
}

const manageTeacherSearchQuery = ref('')
const filteredTeachersForManage = computed(() => {
  const query = manageTeacherSearchQuery.value.trim().toLowerCase()
  if (!query) return availableTeachers.value
  return availableTeachers.value.filter(teacher =>
    `${teacher.prefix}${teacher.firstName} ${teacher.lastName} ${teacher.teacherId}`.toLowerCase().includes(query)
  )
})

const isAssigningTeacher = ref(false)

const handleAssignTeacher = async (teacherUserId: number) => {
  if (!activeManageGroup.value || !selectedRoundId.value) return
  isAssigningTeacher.value = true
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${activeManageGroup.value.id}/teachers`, {
      method: 'POST',
      body: {
        teacherUserId
      }
    })
    notify.success('มอบหมายอาจารย์สำเร็จ')
    await refreshGroups()
    activeManageGroup.value = groups.value.find(g => g.id === activeManageGroup.value?.id) || null
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถมอบหมายอาจารย์ได้')
  } finally {
    isAssigningTeacher.value = false
  }
}

const handleRemoveTeacher = async (teacherUserId: number) => {
  if (!activeManageGroup.value || !selectedRoundId.value) return
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${activeManageGroup.value.id}/teachers/${teacherUserId}`, {
      method: 'DELETE'
    })
    notify.success('นำอาจารย์ออกจากกลุ่มแล้ว')
    await refreshGroups()
    activeManageGroup.value = groups.value.find(g => g.id === activeManageGroup.value?.id) || null
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถนำอาจารย์ออกได้')
  }
}

// Assign Company to Group
const isAssigningCompany = ref(false)

const filteredCompanies = computed(() => {
  const query = companySearchQuery.value.trim().toLowerCase()
  if (!query) return unassignedCompanies.value
  return unassignedCompanies.value.filter(company =>
    `${company.companyName} ${company.province || ''} ${company.address || ''}`.toLowerCase().includes(query)
  )
})

const toggleCompany = (companyId: number) => {
  const exists = selectedCompanyPlans.value.some(plan => plan.companyId === companyId)
  selectedCompanyPlans.value = exists
    ? selectedCompanyPlans.value.filter(plan => plan.companyId !== companyId)
    : [...selectedCompanyPlans.value, { companyId, scheduledDate: defaultScheduleDate(), period: 'MORNING', timeNote: '', distanceKmFromPrevious: 0 }]
}

const selectableCompanies = computed<UnassignedCompany[]>(() => {
  const currentGroup = editingGroupId.value ? groups.value.find(group => group.id === editingGroupId.value) : undefined
  const currentCompanies = (currentGroup?.companies || []).map(company => ({
    companyId: company.companyId,
    companyName: company.company.name,
    province: company.company.province,
    address: company.company.addressNo || null,
    studentCount: company.studentsCount,
    students: []
  }))
  return [...currentCompanies, ...unassignedCompanies.value.filter(company => !currentCompanies.some(current => current.companyId === company.companyId))]
})

const manageCompanySearchQuery = ref('')
const filteredCompaniesForManage = computed(() => {
  const query = manageCompanySearchQuery.value.trim().toLowerCase()
  if (!query) return selectableCompanies.value
  return selectableCompanies.value.filter(company =>
    `${company.companyName} ${company.province || ''} ${company.address || ''}`.toLowerCase().includes(query)
  )
})

const selectedCompanyDetails = computed(() => selectedCompanyPlans.value.map((plan) => ({
  plan,
  company: selectableCompanies.value.find(company => company.companyId === plan.companyId)
})))

const groupBudgetSummary = computed(() => {
  const travelDays = new Set(selectedCompanyPlans.value.map(plan => plan.scheduledDate)).size
  const perDiem = selectedTeacherIds.value.length * Number(budgetForm.value.perDiemRate || 0) * Number(budgetForm.value.perDiemDays || 0) * travelDays
  const lodging = Number(budgetForm.value.lodgingRate || 0) * Number(budgetForm.value.nights || 0) * Number(budgetForm.value.rooms || 0) * travelDays
  return { travelDays, perDiem, lodging, total: perDiem + lodging }
})

const formatCurrency = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const handleAssignCompany = async (companyId: number) => {
  if (!activeManageGroup.value || !selectedRoundId.value) return
  isAssigningCompany.value = true
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${activeManageGroup.value.id}/companies`, {
      method: 'POST',
      body: { companyId }
    })
    notify.success('เพิ่มสถานประกอบการเข้ากลุ่มแล้ว')
    await refreshAll()
    activeManageGroup.value = groups.value.find(g => g.id === activeManageGroup.value?.id) || null
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถเพิ่มสถานประกอบการได้')
  } finally {
    isAssigningCompany.value = false
  }
}

const handleRemoveCompany = async (companyId: number) => {
  if (!activeManageGroup.value || !selectedRoundId.value) return
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/groups/${activeManageGroup.value.id}/companies/${companyId}`, {
      method: 'DELETE'
    })
    notify.success('นำสถานประกอบการออกจากกลุ่มแล้ว')
    await refreshAll()
    activeManageGroup.value = groups.value.find(g => g.id === activeManageGroup.value?.id) || null
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถนำสถานประกอบการออกได้')
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header & Round Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-users-round" class="size-5 text-primary" />
          จัดกลุ่มและมอบหมายอาจารย์นิเทศ
        </h2>
        <p class="text-xs text-muted mt-0.5">
          จัดกลุ่มสถานประกอบการ กำหนดอาจารย์ประจำกลุ่ม และควบคุมปริมาณงานในแต่ละรอบการนิเทศ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Round Switcher -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
          <USelect
            v-model="selectedRoundId"
            :items="roundOptions"
            class="w-56"
            size="md"
          />
        </div>

        <UButton
          label="เพิ่มรอบนิเทศ"
          icon="i-lucide-calendar-plus"
          color="neutral"
          variant="outline"
          size="md"
          @click="openCreateRoundModal"
        />

        <UIButtonRefresh
          :loading="roundsStatus === 'pending' || groupsStatus === 'pending'"
          @refresh="refreshAll"
        />
      </div>
    </div>

    <!-- Alert / Banner for Unassigned Companies if any -->
    <div
      v-if="unassignedCompanies.length > 0"
      class="rounded-lg border border-warning/30 bg-warning/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-alert-circle" class="size-5 text-warning shrink-0 mt-0.5" />
        <div>
          <div class="text-sm font-semibold text-highlighted">
            มีสถานประกอบการที่ยังไม่ได้จัดกลุ่ม {{ unassignedCompanies.length }} แห่ง
          </div>
          <p class="text-xs text-muted mt-0.5">
            มีนักศึกษาที่รอการจัดกลุ่มนิเทศ {{ unassignedCompanies.reduce((s, c) => s + c.studentCount, 0) }} คน สามารถเลือกเพิ่มเข้ากลุ่มที่ต้องการได้
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UPopover>
          <UButton
            label="ดูรายชื่อที่ยังไม่จัดกลุ่ม"
            icon="i-lucide-list"
            color="warning"
            variant="subtle"
            size="xs"
          />
          <template #content>
            <div class="p-3 w-80 max-h-72 overflow-y-auto space-y-2 text-xs">
              <div class="font-semibold text-highlighted pb-1 border-b border-default">
                สถานประกอบการยังไม่จัดกลุ่ม
              </div>
              <div
                v-for="comp in unassignedCompanies"
                :key="comp.companyId"
                class="p-2 rounded bg-muted/20 flex items-center justify-between gap-2"
              >
                <div class="truncate">
                  <div class="font-medium text-highlighted truncate">{{ comp.companyName }}</div>
                  <div class="text-muted text-[11px]">{{ comp.province || 'ไม่ระบุจังหวัด' }} · {{ comp.studentCount }} คน</div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </div>

    <!-- Toolbar: Search & Create Group -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="ค้นหากลุ่ม อาจารย์ สถานประกอบการ..."
          class="w-72"
          size="md"
        />
        <UButton
          v-if="searchQuery"
          label="ล้าง"
          color="neutral"
          variant="ghost"
          size="md"
          @click="searchQuery = ''"
        />
      </div>

      <UButton
        label="สร้างกลุ่มใหม่"
        icon="i-lucide-plus"
        color="primary"
        size="md"
        @click="openCreateGroupModal"
      />
    </div>

    <!-- Groups Grid / Cards -->
    <div v-if="filteredGroups.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="group in filteredGroups"
        :key="group.id"
        class="rounded-lg border border-default bg-default shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
      >
        <!-- Card Header -->
        <div class="p-4 border-b border-default flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <UIcon name="i-lucide-users" class="size-5 text-primary shrink-0" />
            <div>
              <h3 class="font-semibold text-sm text-highlighted">{{ group.name }}</h3>
              <p v-if="group.note" class="text-xs text-muted line-clamp-1 mt-0.5">{{ group.note }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-edit-2"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openEditGroupModal(group)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              @click="confirmDeleteGroup(group)"
            />
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-4 space-y-3.5 text-xs flex-1">
          <!-- Workload Stats -->
          <div class="grid grid-cols-3 gap-2 bg-muted/10 p-2.5 rounded-lg text-center">
            <div>
              <div class="text-muted text-[11px]">สถานประกอบการ</div>
              <div class="text-base font-bold text-highlighted">{{ group.companiesCount }} แห่ง</div>
            </div>
            <div>
              <div class="text-muted text-[11px]">นักศึกษา</div>
              <div class="text-base font-bold text-highlighted">{{ group.studentsCount }} คน</div>
            </div>
            <div>
              <div class="text-muted text-[11px]">อาจารย์</div>
              <div class="text-base font-bold text-highlighted">{{ group.teachers.length }} ท่าน</div>
            </div>
          </div>

          <!-- Teachers List -->
          <div>
            <div class="text-muted font-medium mb-1.5 flex items-center justify-between">
              <span>อาจารย์ประจำกลุ่ม</span>
              <span class="text-[11px]">{{ group.teachers.length }} คน</span>
            </div>
            <div v-if="group.teachers.length > 0" class="space-y-1">
              <div
                v-for="gt in group.teachers"
                :key="gt.id"
                class="flex items-center justify-between py-1 px-2 rounded bg-muted/20"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <UIcon name="i-lucide-user" class="size-3.5 text-muted shrink-0" />
                  <span class="truncate font-medium text-highlighted">
                    {{ gt.teacher.prefix }}{{ gt.teacher.firstName }} {{ gt.teacher.lastName }}
                  </span>
                </div>
                <UBadge
                  label="อาจารย์ประจำกลุ่ม"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                />
              </div>
            </div>
            <div v-else class="text-muted/70 italic text-[11px] py-1">
              ยังไม่มีอาจารย์ประจำกลุ่ม
            </div>
          </div>

          <!-- Companies & Provinces -->
          <div>
            <div class="text-muted font-medium mb-1 flex items-center justify-between">
              <span>พื้นที่ / จังหวัด</span>
            </div>
            <div v-if="group.provinces.length > 0" class="flex flex-wrap gap-1">
              <UBadge
                v-for="p in group.provinces"
                :key="p"
                :label="p"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>
            <div v-else class="text-muted/70 italic text-[11px]">ยังไม่มีสถานประกอบการในกลุ่ม</div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="p-3 bg-muted/5 border-t border-default flex items-center justify-between gap-2">
          <NuxtLink
            :to="`/staff/cooperative-cycles/${cycleId}/visits`"
            class="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <span>ดูตารางนิเทศ</span>
            <UIcon name="i-lucide-arrow-right" class="size-3.5" />
          </NuxtLink>

          <UButton
            label="แก้ไขแผนกลุ่ม"
            icon="i-lucide-pencil-line"
            color="primary"
            variant="subtle"
            size="xs"
            @click="openEditGroupModal(group)"
          />
        </div>
      </div>
    </div>

    <!-- Empty State for Groups -->
    <div
      v-if="filteredGroups.length === 0 && rounds.length > 0"
      class="text-center py-12 bg-muted/5 rounded-lg border border-dashed border-default"
    >
      <UIcon name="i-lucide-users" class="size-10 text-muted mx-auto mb-2" />
      <div class="text-sm font-medium text-highlighted">ยังไม่มีกลุ่มนิเทศในครั้งนี้</div>
      <p class="text-xs text-muted mt-1">เริ่มต้นด้วยการสร้างกลุ่มนิเทศเพื่อจัดเส้นทางการออกนิเทศ</p>
      <UButton
        label="สร้างกลุ่มแรก"
        icon="i-lucide-plus"
        color="primary"
        size="md"
        class="mt-3"
        @click="openCreateGroupModal"
      />
    </div>

    <!-- Empty State for Rounds -->
    <div
      v-if="rounds.length === 0"
      class="text-center py-16 bg-muted/5 rounded-xl border border-dashed border-default space-y-3"
    >
      <UIcon name="i-lucide-calendar-plus" class="size-12 text-muted mx-auto" />
      <div class="text-sm font-semibold text-highlighted">ยังไม่มีรอบการนิเทศในรอบสหกิจนี้</div>
      <p class="text-xs text-muted max-w-sm mx-auto">
        กรุณาสร้างครั้งที่นิเทศเพื่อเริ่มต้นการจัดกลุ่มสถานประกอบการและวางแผนตารางนิเทศ
      </p>
      <UButton
        label="สร้างครั้งที่นิเทศแรก"
        icon="i-lucide-plus"
        color="primary"
        size="md"
        @click="openCreateRoundModal"
      />
    </div>

    <!-- Modal: Create Round -->
    <UModal v-model:open="isCreateRoundOpen" title="เพิ่มรอบการนิเทศใหม่">
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-highlighted mb-1">ชื่อรอบการนิเทศ *</label>
            <UInput
              v-model="createRoundForm.title"
              placeholder="เช่น การนิเทศรอบที่ 1 หรือ การนิเทศช่วงกลางเทอม"
              class="w-full"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            @click="isCreateRoundOpen = false"
          />
          <UButton
            label="บันทึกรอบใหม่"
            color="primary"
            :loading="isCreatingRound"
            @click="handleCreateRound"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Create / Edit Group -->
    <UModal
      v-model:open="isGroupModalOpen"
      :title="editingGroupId ? 'แก้ไขข้อมูลกลุ่มนิเทศ' : 'สร้างกลุ่มนิเทศใหม่'"
    >
      <template #body>
        <div class="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div>
            <label class="block text-xs font-medium text-highlighted mb-1">ชื่อกลุ่ม *</label>
            <UInput
              v-model="groupForm.name"
              placeholder="เช่น กลุ่มที่ 1 (โซนกรุงเทพและปริมณฑล)"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-highlighted mb-1">หมายเหตุ / ข้อมูลเพิ่มเติม</label>
            <UInput
              v-model="groupForm.note"
              placeholder="รายละเอียดพื้นที่หรือเป้าหมายกลุ่ม"
              class="w-full"
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <label class="text-xs font-medium text-highlighted">อาจารย์ผู้นิเทศ *</label>
              <span class="text-xs text-muted">เลือกแล้ว {{ selectedTeacherIds.length }} ท่าน</span>
            </div>
            <UInput v-model="teacherSearchQuery" icon="i-lucide-search" placeholder="ค้นหาชื่อหรือรหัสอาจารย์" class="w-full" aria-label="ค้นหาอาจารย์ผู้นิเทศ" />
            <div class="max-h-48 divide-y divide-default overflow-y-auto rounded-lg border border-default">
              <button v-for="teacher in filteredTeachers" :key="teacher.id" type="button" class="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary" :class="selectedTeacherIds.includes(teacher.id) ? 'bg-primary/10' : 'bg-default'" :aria-pressed="selectedTeacherIds.includes(teacher.id)" @click="toggleTeacher(teacher.id)">
                <UIcon :name="selectedTeacherIds.includes(teacher.id) ? 'i-lucide-circle-check' : 'i-lucide-circle'" class="size-5 shrink-0" :class="selectedTeacherIds.includes(teacher.id) ? 'text-primary' : 'text-muted'" />
                <span class="min-w-0"><span class="block truncate text-sm font-medium text-highlighted">{{ teacher.prefix }}{{ teacher.firstName }} {{ teacher.lastName }}</span><span class="block text-xs text-muted">รหัสอาจารย์: {{ teacher.teacherId }}</span></span>
              </button>
              <div v-if="filteredTeachers.length === 0" class="p-4 text-center text-sm text-muted">ไม่พบอาจารย์ที่พร้อมมอบหมาย</div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2"><label class="text-xs font-medium text-highlighted">สถานประกอบการ *</label><span class="text-xs text-muted">เลือกแล้ว {{ selectedCompanyPlans.length }} แห่ง</span></div>
            <UInput v-model="companySearchQuery" icon="i-lucide-search" placeholder="ค้นหาชื่อสถานประกอบการ จังหวัด หรือที่อยู่" class="w-full" aria-label="ค้นหาสถานประกอบการ" />
            <div class="max-h-56 divide-y divide-default overflow-y-auto rounded-lg border border-default">
              <button v-for="company in filteredCompanies" :key="company.companyId" type="button" class="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary" :class="selectedCompanyPlans.some(plan => plan.companyId === company.companyId) ? 'bg-primary/10' : 'bg-default'" :aria-pressed="selectedCompanyPlans.some(plan => plan.companyId === company.companyId)" @click="toggleCompany(company.companyId)">
                <UIcon :name="selectedCompanyPlans.some(plan => plan.companyId === company.companyId) ? 'i-lucide-circle-check' : 'i-lucide-circle'" class="size-5 shrink-0" :class="selectedCompanyPlans.some(plan => plan.companyId === company.companyId) ? 'text-primary' : 'text-muted'" />
                <span class="min-w-0"><span class="block truncate text-sm font-medium text-highlighted">{{ company.companyName }}</span><span class="block truncate text-xs text-muted">{{ company.province || 'ไม่ระบุจังหวัด' }} · นักศึกษา {{ company.studentCount }} คน</span></span>
              </button>
              <div v-if="filteredCompanies.length === 0" class="p-4 text-center text-sm text-muted">ไม่พบสถานประกอบการที่ยังไม่ถูกจัดกลุ่ม</div>
            </div>
          </div>

          <div class="space-y-2">
            <div><label class="text-xs font-medium text-highlighted">กำหนดการนิเทศรายสถานประกอบการ *</label><p class="mt-0.5 text-xs text-muted">ระบุวันและช่วงเวลา โดยหลายสถานประกอบการสามารถใช้วันและช่วงเวลาเดียวกันได้</p></div>
            <div v-if="selectedCompanyDetails.length" class="space-y-2">
              <div v-for="item in selectedCompanyDetails" :key="item.plan.companyId" class="rounded-lg border border-default bg-muted/5 p-3">
                <div class="mb-2 text-sm font-medium text-highlighted">{{ item.company?.companyName || 'สถานประกอบการ' }}</div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label class="mb-1 block text-xs text-muted">วันนิเทศ</label><UInput v-model="item.plan.scheduledDate" type="date" class="w-full" aria-label="วันนิเทศ" /></div>
                  <div><label class="mb-1 block text-xs text-muted">ช่วงเวลา</label><USelect v-model="item.plan.period" :items="periodOptions" class="w-full" aria-label="ช่วงเวลานิเทศ" /></div>
                </div>
              </div>
            </div>
            <div v-else class="rounded-lg border border-dashed border-default p-3 text-center text-xs text-muted">เลือกสถานประกอบการเพื่อกำหนดตารางนิเทศ</div>
          </div>

          <div class="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div><label class="text-xs font-semibold text-highlighted">ประมาณการค่าใช้จ่ายของกลุ่ม</label><p class="mt-0.5 text-xs text-muted">ระบบจะสร้างแผนเดินทางแยกตามวันที่นิเทศ และคำนวณจากข้อมูลนี้</p></div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label class="mb-1 block text-xs text-muted">จุดเริ่มต้นเดินทาง</label><UInput v-model="budgetForm.startLocation" class="w-full" aria-label="จุดเริ่มต้นเดินทาง" /></div>
              <div><label class="mb-1 block text-xs text-muted">อัตราค่าน้ำมัน (บาท/กม.)</label><UInput v-model.number="budgetForm.fuelRate" type="number" min="0" step="0.5" class="w-full" aria-label="ค่าน้ำมันต่อกิโลเมตร" /></div>
              <div><label class="mb-1 block text-xs text-muted">เบี้ยเลี้ยง (บาท/วัน/คน)</label><UInput v-model.number="budgetForm.perDiemRate" type="number" min="0" class="w-full" aria-label="เบี้ยเลี้ยงต่อวัน" /></div>
              <div><label class="mb-1 block text-xs text-muted">จำนวนวันเบี้ยเลี้ยง</label><UInput v-model.number="budgetForm.perDiemDays" type="number" min="0" step="0.5" class="w-full" aria-label="จำนวนวันเบี้ยเลี้ยง" /></div>
              <div><label class="mb-1 block text-xs text-muted">ค่าที่พัก (บาท/ห้อง/คืน)</label><UInput v-model.number="budgetForm.lodgingRate" type="number" min="0" class="w-full" aria-label="ค่าที่พักต่อห้อง" /></div>
              <div><label class="mb-1 block text-xs text-muted">จำนวนคืน</label><UInput v-model.number="budgetForm.nights" type="number" min="0" class="w-full" aria-label="จำนวนคืน" /></div>
              <div><label class="mb-1 block text-xs text-muted">จำนวนห้องพัก</label><UInput v-model.number="budgetForm.rooms" type="number" min="0" class="w-full" aria-label="จำนวนห้องพัก" /></div>
              <div><label class="mb-1 block text-xs text-muted">หมายเหตุงบประมาณ</label><UInput v-model="budgetForm.note" class="w-full" aria-label="หมายเหตุงบประมาณ" /></div>
            </div>
            <div class="rounded-md border border-primary/30 bg-default p-3 text-sm">
              <div class="font-semibold text-highlighted">สรุปค่าใช้จ่ายประมาณการทั้งหมด</div>
              <div class="mt-1 text-xs text-muted">เดินทาง {{ groupBudgetSummary.travelDays }} วัน · เบี้ยเลี้ยง ฿{{ formatCurrency(groupBudgetSummary.perDiem) }} · ที่พัก ฿{{ formatCurrency(groupBudgetSummary.lodging) }}</div>
              <div class="mt-1 text-lg font-bold text-primary">รวม ฿{{ formatCurrency(groupBudgetSummary.total) }}</div>
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
            @click="isGroupModalOpen = false"
          />
          <UButton
            :label="editingGroupId ? 'บันทึกการแก้ไข' : 'สร้างกลุ่ม'"
            color="primary"
            :loading="isSavingGroup"
            @click="handleSaveGroup"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Manage Group Members & Companies -->
    <UModal
      v-model:open="isManageModalOpen"
      :title="`จัดการสมาชิก & สถานประกอบการ: ${activeManageGroup?.name || ''}`"
    >
      <template #body>
        <div v-if="activeManageGroup" class="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          <!-- Teachers Section -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-highlighted uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-user-check" class="size-4 text-primary" />
              อาจารย์ประจำกลุ่ม ({{ activeManageGroup.teachers.length }} ท่าน)
            </h4>

            <div class="space-y-2 rounded-lg border border-default bg-muted/10 p-3">
              <UInput
                v-model="manageTeacherSearchQuery"
                icon="i-lucide-search"
                placeholder="ค้นหาแล้วกดเลือกอาจารย์เพื่อเพิ่มเข้ากลุ่ม"
                class="w-full"
                aria-label="ค้นหาอาจารย์เพื่อเพิ่มเข้ากลุ่ม"
              />
              <div class="max-h-40 divide-y divide-default overflow-y-auto rounded border border-default bg-default">
                <button
                  v-for="teacher in filteredTeachersForManage"
                  :key="teacher.id"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"
                  :disabled="isAssigningTeacher"
                  @click="handleAssignTeacher(teacher.id)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-highlighted">{{ teacher.prefix }}{{ teacher.firstName }} {{ teacher.lastName }}</span>
                    <span class="block text-xs text-muted">รหัสอาจารย์: {{ teacher.teacherId }}</span>
                  </span>
                  <UIcon name="i-lucide-plus" class="size-4 shrink-0 text-primary" />
                </button>
                <div v-if="filteredTeachersForManage.length === 0" class="p-3 text-center text-sm text-muted">ไม่พบอาจารย์ที่พร้อมมอบหมาย</div>
              </div>
            </div>

            <!-- Teachers List -->
            <div v-if="activeManageGroup.teachers.length > 0" class="divide-y divide-default border border-default rounded-lg overflow-hidden">
              <div
                v-for="gt in activeManageGroup.teachers"
                :key="gt.id"
                class="flex items-center justify-between p-3 bg-default"
              >
                <div class="flex items-center gap-2">
                  <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                    {{ gt.teacher.firstName?.[0] || 'T' }}
                  </div>
                  <div>
                    <div class="font-medium text-highlighted text-xs">
                      {{ gt.teacher.prefix }}{{ gt.teacher.firstName }} {{ gt.teacher.lastName }}
                    </div>
                    <div class="text-[11px] text-muted">รหัสอาจารย์: {{ gt.teacher.loginId }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    label="อาจารย์ประจำกลุ่ม"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="นำออกจากกลุ่ม"
                    @click="handleRemoveTeacher(gt.teacherUserId)"
                  />
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-muted italic text-center py-4 bg-muted/5 rounded-lg">
              ยังไม่มีอาจารย์ในกลุ่มนี้
            </div>
          </div>

          <!-- Companies Section -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-highlighted uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="size-4 text-primary" />
              สถานประกอบการในกลุ่ม ({{ activeManageGroup.companies.length }} แห่ง)
            </h4>

            <div class="space-y-2 rounded-lg border border-default bg-muted/10 p-3">
              <UInput
                v-model="manageCompanySearchQuery"
                icon="i-lucide-search"
                placeholder="ค้นหาแล้วกดเลือกสถานประกอบการเพื่อเพิ่มเข้ากลุ่ม"
                class="w-full"
                aria-label="ค้นหาสถานประกอบการเพื่อเพิ่มเข้ากลุ่ม"
              />
              <div class="max-h-48 divide-y divide-default overflow-y-auto rounded border border-default bg-default">
                <button
                  v-for="company in filteredCompaniesForManage"
                  :key="company.companyId"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"
                  :disabled="isAssigningCompany"
                  @click="handleAssignCompany(company.companyId)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-highlighted">{{ company.companyName }}</span>
                    <span class="block truncate text-xs text-muted">{{ company.province || 'ไม่ระบุจังหวัด' }} · นักศึกษา {{ company.studentCount }} คน</span>
                  </span>
                  <UIcon name="i-lucide-plus" class="size-4 shrink-0 text-primary" />
                </button>
                <div v-if="filteredCompaniesForManage.length === 0" class="p-3 text-center text-sm text-muted">ไม่พบสถานประกอบการที่ยังไม่ถูกจัดกลุ่ม</div>
              </div>
            </div>

            <!-- Companies List -->
            <div v-if="activeManageGroup.companies.length > 0" class="divide-y divide-default border border-default rounded-lg overflow-hidden">
              <div
                v-for="gc in activeManageGroup.companies"
                :key="gc.id"
                class="flex items-center justify-between p-3 bg-default"
              >
                <div class="min-w-0 pr-2">
                  <div class="font-medium text-highlighted text-xs truncate">
                    {{ gc.company.name }}
                  </div>
                  <div class="text-[11px] text-muted truncate mt-0.5">
                    {{ gc.company.province || 'ไม่ระบุจังหวัด' }} · นักศึกษา {{ gc.studentsCount }} คน
                  </div>
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="นำออกจากกลุ่ม"
                  @click="handleRemoveCompany(gc.companyId)"
                />
              </div>
            </div>
            <div v-else class="text-xs text-muted italic text-center py-4 bg-muted/5 rounded-lg">
              ยังไม่มีสถานประกอบการในกลุ่มนี้
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end w-full">
          <UButton
            label="ปิดหน้าต่าง"
            color="neutral"
            variant="outline"
            @click="isManageModalOpen = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Confirm Delete Group -->
    <UIConfirmModal
      :open="isDeleteGroupOpen"
      title="ยืนยันการลบกลุ่มนิเทศ"
      :message="`คุณต้องการลบกลุ่ม '${groupToDelete?.name}' หรือไม่?`"
      sub-message="หากลบกลุ่ม อาจารย์และสถานประกอบการจะถูกปลดออกจากกลุ่มนี้ และสถานประกอบการจะกลับเป็นสถานะยังไม่จัดกลุ่ม"
      confirm-label="ยืนยันลบกลุ่ม"
      confirm-color="error"
      :loading="isDeletingGroup"
      @update:open="isDeleteGroupOpen = $event"
      @confirm="handleDeleteGroup"
      @cancel="isDeleteGroupOpen = false"
    />
  </div>
</template>
