<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  internshipStartDate: string
  internshipEndDate: string
  status: string
}

interface Student {
  id: number
  studentId: string
  prefix: string
  firstName: string
  lastName: string
  gender: string
  cohortYear: number
  classGroup: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  cycle: CooperativeCycle
}>()

const { data: allStudents, status: fetchStatus, refresh } = await useFetch<Student[]>('/api/students')

const searchQuery = ref('')
const classGroupFilter = ref<string>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const page = ref(1)
const pageSize = 10

// Detail Modal state
const isDetailOpen = ref(false)
const selectedStudent = ref<Student | null>(null)

const openDetail = (student: Student) => {
  selectedStudent.value = student
  isDetailOpen.value = true
}

// Filter students belonging to this cycle's cohort
const cycleStudents = computed(() => {
  if (!allStudents.value) return []
  return allStudents.value.filter(s => s.cohortYear === props.cycle.cohortYear)
})

const classGroupOptions = computed(() => {
  const list = cycleStudents.value
  const uniqueGroups = Array.from(new Set(list.map(s => s.classGroup))).sort((a, b) => a - b)
  return [
    { label: 'ทุกหมู่เรียน', value: 'all' },
    ...uniqueGroups.map(g => ({ label: `หมู่ ${g}`, value: String(g) }))
  ]
})

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'all' },
  { label: 'ใช้งาน', value: 'active' },
  { label: 'ไม่ใช้งาน', value: 'inactive' }
]

const filteredStudents = computed(() => {
  const list = cycleStudents.value
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((student) => {
    const fullName = `${student.prefix}${student.firstName} ${student.lastName}`
    const matchesSearch = !keyword || [
      student.studentId,
      student.firstName,
      student.lastName,
      fullName
    ].join(' ').toLowerCase().includes(keyword)

    const matchesGroup = classGroupFilter.value === 'all' || String(student.classGroup) === classGroupFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && student.isActive)
      || (statusFilter.value === 'inactive' && !student.isActive)

    return matchesSearch && matchesGroup && matchesStatus
  })
})

const paginatedStudents = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredStudents.value.slice(start, start + pageSize)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize)))
const hasFilters = computed(() => Boolean(searchQuery.value) || classGroupFilter.value !== 'all' || statusFilter.value !== 'all')
const pageStart = computed(() => filteredStudents.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredStudents.value.length))

watch([searchQuery, classGroupFilter, statusFilter], () => {
  page.value = 1
})

watch(totalPages, () => {
  page.value = Math.min(page.value, totalPages.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  classGroupFilter.value = 'all'
  statusFilter.value = 'all'
}

const columns: TableColumn<Student>[] = [
  {
    accessorKey: 'studentId',
    header: 'รหัสนักศึกษา',
    meta: { class: { th: 'w-36', td: 'w-36  text-sm' } }
  },
  {
    id: 'name',
    header: 'ชื่อ-สกุล'
  },
  {
    accessorKey: 'gender',
    header: 'เพศ',
    meta: { class: { th: 'w-24', td: 'w-24' } }
  },
  {
    accessorKey: 'classGroup',
    header: 'หมู่เรียน',
    meta: { class: { th: 'w-28 text-center', td: 'w-28 text-center' } }
  },
  {
    accessorKey: 'isActive',
    header: 'สถานะ',
    meta: { class: { th: 'w-28 text-center', td: 'w-28 text-center' } }
  },
  {
    id: 'actions',
    header: 'จัดการ',
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          รายชื่อนักศึกษาในรอบ
        </h2>
        <p class="text-xs text-muted">
          นักศึกษารุ่น {{ cycle.cohortYear }} ทั้งหมดที่มีสิทธิ์เข้าร่วมรอบสหกิจศึกษานี้ ({{ cycleStudents.length }} คน)
        </p>
      </div>

      <UButton
        label="จัดการฐานข้อมูลนักศึกษา"
        icon="i-lucide-external-link"
        color="neutral"
        variant="outline"
        size="sm"
        to="/staff/students"
      />
    </div>

    <!-- Filters and Control Row -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="ค้นหารหัสนักศึกษา หรือชื่อ..."
          class="w-64"
          size="sm"
        />

        <USelect
          v-model="classGroupFilter"
          :items="classGroupOptions"
          value-key="value"
          class="w-36"
          size="sm"
        />

        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          class="w-36"
          size="sm"
        />

        <UButton
          v-if="hasFilters"
          label="ล้างตัวกรอง"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
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
    <div class="rounded-lg border border-default overflow-hidden bg-default">
      <UTable
        :data="paginatedStudents"
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

        <template #isActive-cell="{ row }">
          <UBadge
            :label="row.original.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'"
            :color="row.original.isActive ? 'success' : 'neutral'"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1.5">
            <UButton
              label="ดูข้อมูล"
              icon="i-lucide-eye"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openDetail(row.original)"
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

      <!-- Pagination Footer -->
      <div v-if="filteredStudents.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default text-xs text-muted">
        <div>
          แสดง {{ pageStart }} - {{ pageEnd }} จากทั้งหมด {{ filteredStudents.length }} รายการ
        </div>

        <UPagination
          v-model:page="page"
          :total="filteredStudents.length"
          :items-per-page="pageSize"
          size="sm"
        />
      </div>
    </div>

    <!-- Detail Modal -->
    <UModal
      v-model:open="isDetailOpen"
      :title="selectedStudent ? `ข้อมูลนักศึกษา: ${selectedStudent.prefix}${selectedStudent.firstName} ${selectedStudent.lastName}` : 'รายละเอียดนักศึกษา'"
      :description="selectedStudent ? `รหัสนักศึกษา: ${selectedStudent.studentId}` : ''"
    >
      <template #body>
        <div v-if="selectedStudent" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-default p-4 bg-muted/10 text-sm">
            <div>
              <span class="text-xs text-muted block">รหัสนักศึกษา</span>
              <span class=" font-semibold text-highlighted text-base">{{ selectedStudent.studentId }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">สถานะการใช้งาน</span>
              <UBadge
                :label="selectedStudent.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'"
                :color="selectedStudent.isActive ? 'success' : 'neutral'"
                variant="subtle"
                class="mt-1"
              />
            </div>

            <div>
              <span class="text-xs text-muted block">ชื่อ-นามสกุล</span>
              <span class="font-medium text-highlighted">{{ selectedStudent.prefix }}{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">เพศ</span>
              <span>{{ selectedStudent.gender }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">รุ่น (ปีที่เข้าศึกษา)</span>
              <span>รุ่น {{ selectedStudent.cohortYear }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">หมู่เรียน</span>
              <span>หมู่ {{ selectedStudent.classGroup }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-between items-center">
          <UButton
            label="ไปหน้าจัดการนักศึกษา"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            to="/staff/students"
          />
          <UButton
            label="ปิด"
            color="neutral"
            variant="subtle"
            @click="isDetailOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
