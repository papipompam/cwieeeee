<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

interface StudentCycleStatusInfo {
  key: string
  label: string
  color: 'neutral' | 'info' | 'warning' | 'success' | 'error'
}

interface StudentRow {
  id: number
  studentId: string
  prefix: string
  firstName: string
  lastName: string
  cohortYear: number
  classGroup: number
  isActive: boolean
  cycleStatus: StudentCycleStatusInfo
  latestCompany: string | null
  latestRequestId: number | null
}

interface StudentsResponse {
  students: StudentRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface StudentCandidate {
  id: number
  studentId: string
  prefix: string
  firstName: string
  lastName: string
  cohortYear: number
  classGroup: number
}

interface StudentHistoryResponse {
  student: {
    id: number
    studentId: string
    prefix: string
    firstName: string
    lastName: string
    phone: string | null
    cohortYear: number
    classGroup: number
    isActive: boolean
  }
  currentCycleStatus: StudentCycleStatusInfo
  currentCycleApplicationsCount: number
  applications: Array<{
    id: number
    cycleId: number
    cycleLabel: string
    isCurrentCycle: boolean
    companyName: string
    position: string
    appliedAt: string
    status: string
    request: {
      id: number
      status: string
      confirmedAt: string
      returnedReason: string | null
      rejectedReason: string | null
    } | null
  }>
}

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  status: string
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')
const notify = useNotify()

const searchQuery = ref('')
const classGroupFilter = ref<string>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const page = ref(1)
const pageSize = 10

const isEnrollmentOpen = ref(false)
const bulkCohortYear = ref<number | null>(null)
const candidateSearch = ref('')
const isEnrollmentSaving = ref(false)
const studentToRemove = ref<StudentRow | null>(null)
const isRemoveEnrollmentOpen = ref(false)
const isRemovingEnrollment = ref(false)

const { data: candidates, status: candidatesFetchStatus, refresh: refreshCandidates } = await useFetch<StudentCandidate[]>(
  '/api/students',
  {
    immediate: false,
    query: computed(() => ({
      search: candidateSearch.value || undefined,
      isActive: 'true'
    })),
    watch: [candidateSearch]
  }
)

// Fetch students for this cycle with server-side pagination & filters
const { data, status: fetchStatus, refresh } = await useFetch<StudentsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/students`,
  {
    query: computed(() => ({
      page: page.value,
      pageSize,
      search: searchQuery.value || undefined,
      classGroup: classGroupFilter.value !== 'all' ? classGroupFilter.value : undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined
    })),
    watch: [page, searchQuery, classGroupFilter, statusFilter]
  }
)

// Dynamic class groups from students list
const classGroupOptions = computed(() => {
  const groups = new Set<number>()
  data.value?.students?.forEach(s => {
    if (s.classGroup) groups.add(s.classGroup)
  })
  const sorted = Array.from(groups).sort((a, b) => a - b)
  return [
    { label: 'ทุกหมู่เรียน', value: 'all' },
    ...sorted.map(g => ({ label: `หมู่ ${g}`, value: String(g) }))
  ]
})

const statusOptions = [
  { label: 'ทุกสถานะบัญชี', value: 'all' },
  { label: 'ใช้งาน', value: 'active' },
  { label: 'ไม่ใช้งาน', value: 'inactive' }
]

const hasFilters = computed(() => Boolean(searchQuery.value) || classGroupFilter.value !== 'all' || statusFilter.value !== 'all')

const clearFilters = () => {
  searchQuery.value = ''
  classGroupFilter.value = 'all'
  statusFilter.value = 'all'
  page.value = 1
}

const openEnrollment = () => {
  bulkCohortYear.value ??= cycle?.value?.cohortYear ?? null
  isEnrollmentOpen.value = true
  refreshCandidates()
}

const addEnrollment = async (body: { studentIds?: number[]; cohortYear?: number }) => {
  isEnrollmentSaving.value = true
  try {
    const result = await $fetch<{ addedCount: number; matchedCount: number }>(
      `/api/staff/cooperative-cycles/${cycleId.value}/students/enroll`,
      { method: 'POST', body }
    )
    notify.success(result.addedCount > 0
      ? `เพิ่มนักศึกษา ${result.addedCount} คนเข้ารอบแล้ว`
      : 'นักศึกษาที่เลือกอยู่ในรอบนี้แล้ว')
    await Promise.all([refresh(), refreshCandidates()])
  } catch (error) {
    notify.error(error instanceof Error ? error.message : 'ไม่สามารถเพิ่มนักศึกษาเข้ารอบได้')
  } finally {
    isEnrollmentSaving.value = false
  }
}

const addCohort = () => {
  if (!bulkCohortYear.value || bulkCohortYear.value <= 0) {
    notify.validationError('กรุณาระบุรุ่นนักศึกษาที่ต้องการเพิ่ม')
    return
  }
  return addEnrollment({ cohortYear: bulkCohortYear.value })
}

const askRemoveEnrollment = (student: StudentRow) => {
  studentToRemove.value = student
  isRemoveEnrollmentOpen.value = true
}

const removeEnrollment = async () => {
  if (!studentToRemove.value) return
  isRemovingEnrollment.value = true
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/students/${studentToRemove.value.id}/enrollment`, {
      method: 'DELETE'
    })
    notify.success('นำนักศึกษาออกจากรอบแล้ว')
    isRemoveEnrollmentOpen.value = false
    studentToRemove.value = null
    await refresh()
  } catch (error) {
    notify.error(error instanceof Error ? error.message : 'ไม่สามารถนำนักศึกษาออกจากรอบได้')
  } finally {
    isRemovingEnrollment.value = false
  }
}

watch([searchQuery, classGroupFilter, statusFilter], () => {
  page.value = 1
})

// History Modal state
const isHistoryOpen = ref(false)
const selectedStudentId = ref<number | null>(null)

const { data: studentHistory, status: historyFetchStatus } = await useFetch<StudentHistoryResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/students/${selectedStudentId.value}/history`,
  {
    immediate: false,
    watch: [selectedStudentId]
  }
)

const openHistory = (studentId: number) => {
  selectedStudentId.value = studentId
  isHistoryOpen.value = true
}

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '—'
  const d = new Date(dStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const appStatusDisplayMap: Record<string, { label: string; color: 'neutral' | 'info' | 'warning' | 'success' | 'error' }> = {
  SUBMITTED: { label: 'ยื่นแล้ว', color: 'info' },
  AWAITING_RESPONSE: { label: 'รอการตอบรับ', color: 'warning' },
  INTERVIEW: { label: 'นัดสัมภาษณ์', color: 'info' },
  ACCEPTED: { label: 'ตอบรับแล้ว', color: 'success' },
  REJECTED: { label: 'ปฏิเสธ', color: 'error' },
  WITHDRAWN: { label: 'สละสิทธิ์', color: 'neutral' },
  CONFIRMED: { label: 'ยืนยันแล้ว', color: 'success' }
}

const columns: TableColumn<StudentRow>[] = [
  {
    accessorKey: 'studentId',
    header: 'รหัสนักศึกษา',
    meta: { class: { th: 'w-36 ', td: 'w-36  text-sm' } }
  },
  {
    id: 'name',
    header: 'ชื่อ-นามสกุล'
  },
  {
    accessorKey: 'classGroup',
    header: 'หมู่เรียน',
    meta: { class: { th: 'w-24 text-center', td: 'w-24 text-center' } }
  },
  {
    id: 'cycleStatus',
    header: 'สถานะในรอบ',
    meta: { class: { th: 'w-40 text-center', td: 'w-40 text-center' } }
  },
  {
    id: 'latestCompany',
    header: 'สถานประกอบการล่าสุด'
  },
  {
    id: 'actions',
    header: 'จัดการ',
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  }
]

const pageStart = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return (page.value - 1) * pageSize + 1
})
const pageEnd = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize, data.value.total)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header info banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          นักศึกษาในรอบสหกิจ
        </h2>
        <p class="text-xs text-muted">
          รายชื่อนักศึกษาที่เจ้าหน้าที่เพิ่มเข้ารอบสหกิจศึกษานี้ ({{ data?.total ?? 0 }} คน)
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="จัดการฐานข้อมูลนักศึกษา"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
          size="md"
          to="/staff/students"
        />
        <UButton
          label="เพิ่มนักศึกษาเข้ารอบ"
          icon="i-lucide-user-plus"
          color="primary"
          size="md"
          @click="openEnrollment"
        />
      </div>
    </div>

    <!-- Filters and Control Row -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="ค้นหารหัสนักศึกษา หรือชื่อ..."
          class="w-64"
          size="md"
        />

        <USelect
          v-model="classGroupFilter"
          :items="classGroupOptions"
          value-key="value"
          class="w-36"
          size="md"
        />

        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          class="w-36"
          size="md"
        />

        <UButton
          v-if="hasFilters"
          label="ล้างตัวกรอง"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="md"
          @click="clearFilters"
        />
      </div>

      <div class="flex items-center gap-2">
        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-lg border border-default overflow-hidden bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="data?.students || []"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <template #name-cell="{ row }">
            <span class="font-medium text-highlighted">
              {{ row.original.prefix }}{{ row.original.firstName }} {{ row.original.lastName }}
            </span>
          </template>

          <template #classGroup-cell="{ row }">
            <span>หมู่ {{ row.original.classGroup }}</span>
          </template>

          <template #cycleStatus-cell="{ row }">
            <UBadge
              :label="row.original.cycleStatus.label"
              :color="row.original.cycleStatus.color"
              variant="subtle"
            />
          </template>

          <template #latestCompany-cell="{ row }">
            <div v-if="row.original.latestCompany" class="flex items-center gap-1.5 truncate">
              <span class="text-highlighted font-medium text-sm truncate">{{ row.original.latestCompany }}</span>
              <UButton
                v-if="row.original.latestRequestId"
                icon="i-lucide-file-text"
                color="primary"
                variant="ghost"
                size="xs"
                :to="`/staff/cooperative-cycles/${cycleId}/applications/${row.original.latestRequestId}`"
                title="เปิดคำร้อง"
              />
            </div>
            <span v-else class="text-muted text-xs">—</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton
                label="ดูประวัติ"
                icon="i-lucide-history"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="openHistory(row.original.id)"
              />
              <UButton
                label="นำออก"
                icon="i-lucide-user-minus"
                color="error"
                variant="ghost"
                size="xs"
                @click="askRemoveEnrollment(row.original)"
              />
            </div>
          </template>

          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-users" class="size-8 mx-auto mb-2 text-muted" />
              <p>ไม่พบข้อมูลนักศึกษาในรอบนี้</p>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Pagination Footer -->
      <div v-if="data && data.total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default text-xs text-muted">
        <div>
          แสดง {{ pageStart }} - {{ pageEnd }} จากทั้งหมด {{ data.total }} รายการ
        </div>

        <UPagination
          v-model:page="page"
          :total="data.total"
          :items-per-page="pageSize"
          size="sm"
        />
      </div>
    </div>

    <UModal
      v-model:open="isEnrollmentOpen"
      title="เพิ่มนักศึกษาเข้ารอบ"
      description="เพิ่มทั้งรุ่นเพื่อเริ่มต้น หรือค้นหาและเพิ่มรายบุคคลจากทุกรุ่น"
      class="max-w-2xl"
    >
      <template #body>
        <div class="space-y-5">
          <div class="rounded-lg border border-default bg-muted/10 p-4">
            <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <UFormField label="เพิ่มนักศึกษาที่ใช้งานทั้งรุ่น">
                <UInput v-model.number="bulkCohortYear" type="number" placeholder="เช่น 2566" />
              </UFormField>
              <UButton
                label="เพิ่มทั้งรุ่น"
                icon="i-lucide-users-round"
                :loading="isEnrollmentSaving"
                @click="addCohort"
              />
            </div>
          </div>

          <div class="space-y-2">
            <UFormField label="ค้นหาเพื่อเพิ่มรายบุคคล">
              <UInput v-model="candidateSearch" icon="i-lucide-search" placeholder="ค้นหารหัสนักศึกษา หรือชื่อ..." />
            </UFormField>
            <div class="max-h-72 overflow-y-auto rounded-lg border border-default divide-y divide-default">
              <div v-if="candidatesFetchStatus === 'pending'" class="p-6 text-center text-sm text-muted">กำลังค้นหานักศึกษา...</div>
              <div v-else-if="!candidates?.length" class="p-6 text-center text-sm text-muted">ไม่พบนักศึกษาที่ใช้งานได้</div>
              <div v-for="candidate in candidates" :key="candidate.id" class="flex items-center justify-between gap-3 p-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-highlighted">{{ candidate.prefix }}{{ candidate.firstName }} {{ candidate.lastName }}</p>
                  <p class="text-xs text-muted">{{ candidate.studentId }} · รุ่น {{ candidate.cohortYear }} · หมู่ {{ candidate.classGroup }}</p>
                </div>
                <UButton
                  label="เพิ่ม"
                  icon="i-lucide-plus"
                  color="primary"
                  variant="outline"
                  size="xs"
                  :loading="isEnrollmentSaving"
                  @click="addEnrollment({ studentIds: [candidate.id] })"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <UIConfirmModal
      v-model:open="isRemoveEnrollmentOpen"
      title="นำออกจากรอบสหกิจ"
      :message="`ต้องการนำ ${studentToRemove?.prefix ?? ''}${studentToRemove?.firstName ?? ''} ${studentToRemove?.lastName ?? ''} ออกจากรอบนี้หรือไม่?`"
      sub-message="หากนักศึกษายื่นสถานประกอบการแล้ว ระบบจะไม่อนุญาตให้นำออก เพื่อรักษาประวัติข้อมูล"
      confirm-label="นำออกจากรอบ"
      confirm-color="error"
      :loading="isRemovingEnrollment"
      @confirm="removeEnrollment"
    />

    <!-- Student History Modal -->
    <UModal
      v-model:open="isHistoryOpen"
      :title="studentHistory?.student ? `ประวัตินักศึกษา: ${studentHistory.student.prefix}${studentHistory.student.firstName} ${studentHistory.student.lastName}` : 'ประวัตินักศึกษา'"
      :description="studentHistory?.student ? `รหัสนักศึกษา: ${studentHistory.student.studentId} · หมู่เรียน ${studentHistory.student.classGroup}` : ''"
      class="max-w-2xl"
    >
      <template #body>
        <div v-if="historyFetchStatus === 'pending'" class="py-12 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto mb-2 text-primary" />
          <p class="text-xs">กำลังโหลดประวัติการสมัคร...</p>
        </div>

        <div v-else-if="studentHistory" class="space-y-4">
          <!-- Current cycle status card -->
          <div class="p-3.5 rounded-lg border border-default bg-muted/10 flex items-center justify-between">
            <div>
              <span class="text-xs text-muted block">สถานะในรอบปัจจุบัน</span>
              <span class="font-medium text-highlighted text-sm">
                ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }}
              </span>
            </div>
            <UBadge
              :label="studentHistory.currentCycleStatus.label"
              :color="studentHistory.currentCycleStatus.color"
              variant="subtle"
            />
          </div>

          <!-- History timeline -->
          <div>
            <h4 class="text-xs font-semibold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UIcon name="i-lucide-list" class="size-3.5 text-primary" />
              ประวัติการยื่นสถานประกอบการทั้งหมด ({{ studentHistory.applications.length }} รายการ)
            </h4>

            <div v-if="studentHistory.applications.length === 0" class="py-8 text-center text-muted border border-dashed border-default rounded-lg">
              <UIcon name="i-lucide-file-x" class="size-6 mx-auto mb-1 text-muted" />
              <p class="text-xs">ยังไม่มีประวัติการยื่นสถานประกอบการ</p>
            </div>

            <div v-else class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              <div
                v-for="app in studentHistory.applications"
                :key="app.id"
                class="p-3 rounded-lg border border-default bg-default shadow-2xs space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-primary">{{ app.cycleLabel }}</span>
                    <UBadge
                      v-if="app.isCurrentCycle"
                      label="รอบปัจจุบัน"
                      color="info"
                      variant="subtle"
                      size="xs"
                    />
                  </div>
                  <UBadge
                    :label="appStatusDisplayMap[app.status]?.label || app.status"
                    :color="appStatusDisplayMap[app.status]?.color || 'neutral'"
                    variant="subtle"
                    size="xs"
                  />
                </div>

                <div class="text-sm font-medium text-highlighted">
                  {{ app.companyName }}
                </div>

                <div class="text-xs text-muted flex items-center gap-2">
                  <span>ตำแหน่ง: {{ app.position }}</span>
                  <span>•</span>
                  <span>วันที่สมัคร: {{ formatDate(app.appliedAt) }}</span>
                </div>

                <!-- Linked request if any -->
                <div v-if="app.request" class="border-t border-default pt-2 mt-2 flex items-center justify-between text-xs">
                  <span class="text-muted">
                    คำร้อง #{{ app.request.id }} ({{ app.request.status }})
                  </span>
                  <UButton
                    v-if="app.isCurrentCycle"
                    label="เปิดดูคำร้อง"
                    icon="i-lucide-external-link"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :to="`/staff/cooperative-cycles/${cycleId}/applications/${app.request.id}`"
                    @click="isHistoryOpen = false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end">
          <UButton
            label="ปิด"
            color="neutral"
            variant="subtle"
            @click="isHistoryOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
