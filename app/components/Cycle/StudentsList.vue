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
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

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
  const start = (page.value - 1) * pageSize.value
  return filteredStudents.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || classGroupFilter.value !== 'all' || statusFilter.value !== 'all')
const pageStart = computed(() => filteredStudents.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredStudents.value.length))

watch([searchQuery, classGroupFilter, statusFilter, pageSize], () => {
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
    meta: { class: { th: 'w-36', td: 'w-36 font-semibold' } }
  },
  {
    id: 'name',
    header: 'ชื่อ-สกุล'
  },
  {
    accessorKey: 'classGroup',
    header: 'หมู่เรียน',
    meta: { class: { th: 'w-28', td: 'w-28' } }
  },
  {
    accessorKey: 'isActive',
    header: 'สถานะ',
    meta: { class: { th: 'w-28', td: 'w-28' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  }
]
</script>

<template>
  <div class="w-full space-y-6">
    <UCard :ui="{ body: 'p-0' }">
      <!-- Header with title and controls -->
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-ink">รายชื่อนักศึกษาในรอบ</h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              นักศึกษารุ่น {{ cycle.cohortYear }} ทั้งหมดที่มีสิทธิ์เข้าร่วมรอบสหกิจศึกษานี้ ({{ cycleStudents.length }} คน)
            </p>
          </div>

          <UButton
            size="xl"
            label="จัดการฐานข้อมูลนักศึกษา"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            to="/staff/students"
          />
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <UFormField label="ค้นหานักศึกษา" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
            <UInput
              v-model="searchQuery"
              type="search"
              size="xl"
              icon="i-lucide-search"
              class="w-full"
              placeholder="ค้นหารหัสนักศึกษา หรือชื่อ..."
              aria-label="ค้นหานักศึกษา"
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-36">
              <USelect
                v-model="classGroupFilter"
                :items="classGroupOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="หมู่เรียน"
                aria-label="กรองตามหมู่เรียน"
              />
            </div>
            <div class="w-full sm:w-36">
              <USelect
                v-model="statusFilter"
                :items="statusOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="สถานะ"
                aria-label="กรองตามสถานะการใช้งาน"
              />
            </div>
            <UIButtonRefresh
              :loading="fetchStatus === 'pending'"
              @refresh="refresh"
            />
          </div>
        </div>

        <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            คำค้น “{{ searchQuery }}”
          </span>
          <span v-if="classGroupFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            {{ classGroupOptions.find(o => o.value === classGroupFilter)?.label }}
          </span>
          <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            {{ statusOptions.find(o => o.value === statusFilter)?.label }}
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="clearFilters"
          >
            ล้างทั้งหมด
          </UButton>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="fetchStatus === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
        <div v-for="row in 4" :key="row" class="grid grid-cols-[2rem_1.2fr_1fr_8rem] gap-4 max-md:grid-cols-[1fr_7rem]">
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!paginatedStudents.length" class="p-5 sm:p-6">
        <UEmpty
          icon="i-lucide-inbox"
          class="min-h-64"
          :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ไม่พบข้อมูลนักศึกษาในรอบนี้'"
          :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'ยังไม่มีข้อมูลนักศึกษาในรอบนี้'"
        >
          <template #actions>
            <UButton
              v-if="hasFilters"
              size="xl"
              color="neutral"
              variant="outline"
              @click="clearFilters"
            >
              ล้างตัวกรอง
            </UButton>
          </template>
        </UEmpty>
      </div>

      <!-- Table -->
      <template v-else>
        <div class="w-full overflow-x-auto">
          <UTable
            :data="paginatedStudents"
            :columns="columns"
            class="min-w-full"
            :ui="{ base: 'w-full min-w-160' }"
          >
            <template #name-cell="{ row }">
              <span class="font-medium text-ink">
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
              <div class="flex items-center justify-end gap-1 whitespace-nowrap">
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
          </UTable>
        </div>

        <!-- Footer -->
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <p class="whitespace-nowrap text-muted">
              แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredStudents.length }} รายการ
            </p>
            <div class="w-16 shrink-0">
              <USelect
                v-model="pageSize"
                size="md"
                class="w-full"
                :items="pageSizeOptions"
                aria-label="จำนวนรายการต่อหน้า"
              />
            </div>
          </div>
          <UPagination
            v-model:page="page"
            :total="filteredStudents.length"
            :items-per-page="pageSize"
            size="md"
          />
        </div>
      </template>
    </UCard>

    <!-- Detail Modal -->
    <UModal
      v-model:open="isDetailOpen"
      :title="selectedStudent ? `ข้อมูลนักศึกษา: ${selectedStudent.prefix}${selectedStudent.firstName} ${selectedStudent.lastName}` : 'รายละเอียดนักศึกษา'"
      :description="selectedStudent ? `รหัสนักศึกษา: ${selectedStudent.studentId}` : ''"
    >
      <template #body>
        <div v-if="selectedStudent" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-panel border border-divider p-4 bg-surface text-sm">
            <div>
              <span class="text-xs text-muted block">รหัสนักศึกษา</span>
              <span class="font-semibold text-ink text-base">{{ selectedStudent.studentId }}</span>
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
              <span class="font-medium text-ink">{{ selectedStudent.prefix }}{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">รุ่น (ปีที่เข้าศึกษา)</span>
              <span class="text-ink">รุ่น {{ selectedStudent.cohortYear }}</span>
            </div>

            <div>
              <span class="text-xs text-muted block">หมู่เรียน</span>
              <span class="text-ink">หมู่ {{ selectedStudent.classGroup }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-between items-center">
          <UButton
            size="xl"
            label="ไปหน้าจัดการนักศึกษา"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            to="/staff/students"
          />
          <UButton
            size="xl"
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
