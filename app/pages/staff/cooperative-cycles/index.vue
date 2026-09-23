<script setup lang="ts">
import type { InputDateProps, TableColumn } from '@nuxt/ui'
import { parseDate } from '@internationalized/date'
import { h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

type CooperativeCycleStatus = 'OPEN_FOR_APPLICATION' | 'APPLICATION_CLOSED' | 'IN_PROGRESS' | 'CLOSED'

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  applicationStartDate: string
  applicationEndDate: string
  internshipStartDate: string
  internshipEndDate: string
  status: CooperativeCycleStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

const UCheckbox = resolveComponent('UCheckbox')
const notify = useNotify()
const route = useRoute()
const { activeCycleId, setActiveCycle } = useStaffActiveCycle()

// Data fetching from API
const { data: cycles, status: fetchStatus, error: fetchError, refresh } = await useFetch<CooperativeCycle[]>('/api/cooperative-cycles')

const defaultCycle = computed(() => {
  const list = cycles.value ?? []
  const saved = list.find(cycle => cycle.id === activeCycleId.value)
  if (saved) return saved
  const academicYear = new Date().getFullYear() + 543
  return list.find(cycle => cycle.academicYear === academicYear) ?? list[0] ?? null
})

if (!defaultCycle.value && activeCycleId.value) {
  setActiveCycle(null)
}

if (!route.query.select && defaultCycle.value) {
  setActiveCycle(defaultCycle.value.id)
  await navigateTo(`/staff/cooperative-cycles/${defaultCycle.value.id}`)
}

const searchQuery = ref('')
const statusFilter = ref<CooperativeCycleStatus | 'all'>('all')
const rowSelection = ref<Record<string, boolean>>({})
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

// Delete modal state
const isDeleteOpen = ref(false)
const pendingDeleteIds = ref<number[]>([])
const isDeleting = ref(false)

// Form Modal State (Add / Edit)
const isFormOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)

const formState = reactive({
  term: 2,
  academicYear: 2569,
  cohortYear: 2566,
  applicationStartDate: '',
  applicationEndDate: '',
  internshipStartDate: '',
  internshipEndDate: '',
  status: 'OPEN_FOR_APPLICATION' as CooperativeCycleStatus,
  note: ''
})

const formErrors = reactive<Record<string, string>>({})

type CycleDateField = 'applicationStartDate' | 'applicationEndDate' | 'internshipStartDate' | 'internshipEndDate'
const calendarDate = (field: CycleDateField) => computed<InputDateProps<false>['modelValue']>({
  get: () => formState[field] ? parseDate(formState[field]) : undefined,
  set: value => { formState[field] = value?.toString() ?? '' }
})
const applicationStartDate = calendarDate('applicationStartDate')
const applicationEndDate = calendarDate('applicationEndDate')
const internshipStartDate = calendarDate('internshipStartDate')
const internshipEndDate = calendarDate('internshipEndDate')

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'all' },
  { label: 'เปิดรับคำร้อง', value: 'OPEN_FOR_APPLICATION' },
  { label: 'ปิดรับคำร้อง', value: 'APPLICATION_CLOSED' },
  { label: 'กำลังฝึกงาน', value: 'IN_PROGRESS' },
  { label: 'ปิดรอบ', value: 'CLOSED' }
]

const formStatusOptions = [
  { label: 'เปิดรับคำร้อง', value: 'OPEN_FOR_APPLICATION' },
  { label: 'ปิดรับคำร้อง', value: 'APPLICATION_CLOSED' },
  { label: 'กำลังฝึกงาน', value: 'IN_PROGRESS' },
  { label: 'ปิดรอบ', value: 'CLOSED' }
]

const statusDisplayMap: Record<CooperativeCycleStatus, { label: string; color: 'success' | 'warning' | 'info' | 'neutral' }> = {
  OPEN_FOR_APPLICATION: { label: 'เปิดรับคำร้อง', color: 'success' },
  APPLICATION_CLOSED: { label: 'ปิดรับคำร้อง', color: 'warning' },
  IN_PROGRESS: { label: 'กำลังฝึกงาน', color: 'info' },
  CLOSED: { label: 'ปิดรอบ', color: 'neutral' }
}

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateForInput = (dateStr: string): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0] ?? ''
}

const filteredCycles = computed(() => {
  const list = cycles.value ?? []
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((cycle) => {
    const termStr = `${cycle.term}/${cycle.academicYear}`
    const cohortStr = `${cycle.cohortYear}`
    const noteStr = cycle.note || ''
    const matchesSearch = !keyword || [termStr, cohortStr, noteStr]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
    const matchesStatus = statusFilter.value === 'all' || cycle.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const paginatedCycles = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCycles.value.slice(start, start + pageSize.value)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCycles.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredCycles.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredCycles.value.length))

watch([searchQuery, statusFilter, pageSize], () => {
  page.value = 1
  rowSelection.value = {}
})

watch(totalPages, () => {
  page.value = Math.min(page.value, totalPages.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

const handleRefresh = async () => {
  await refresh()
  rowSelection.value = {}
  notify.info('อัปเดตข้อมูลรอบสหกิจแล้ว')
}

const enterCycle = async (cycle: CooperativeCycle) => {
  setActiveCycle(cycle.id)
  await navigateTo(`/staff/cooperative-cycles/${cycle.id}`)
}

// Modal open handlers
const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  const now = new Date()
  const year = now.getFullYear() + 543
  formState.term = 1
  formState.academicYear = year
  formState.cohortYear = year - 3
  formState.applicationStartDate = now.toISOString().split('T')[0] ?? ''
  formState.applicationEndDate = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0] ?? ''
  formState.internshipStartDate = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0] ?? ''
  formState.internshipEndDate = new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0] ?? ''
  formState.status = 'OPEN_FOR_APPLICATION'
  formState.note = ''

  isFormOpen.value = true
}

const openEditModal = (cycle: CooperativeCycle) => {
  if (cycle.status === 'CLOSED') {
    notify.error('รอบสหกิจนี้ถูกปิดรอบแล้ว ไม่สามารถแก้ไขได้')
    return
  }
  isEditing.value = true
  editingId.value = cycle.id
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.term = cycle.term
  formState.academicYear = cycle.academicYear
  formState.cohortYear = cycle.cohortYear
  formState.applicationStartDate = formatDateForInput(cycle.applicationStartDate)
  formState.applicationEndDate = formatDateForInput(cycle.applicationEndDate)
  formState.internshipStartDate = formatDateForInput(cycle.internshipStartDate)
  formState.internshipEndDate = formatDateForInput(cycle.internshipEndDate)
  formState.status = cycle.status
  formState.note = cycle.note || ''

  isFormOpen.value = true
}

const validateForm = () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  let isValid = true

  if (!formState.term || formState.term < 1 || formState.term > 3 || !Number.isInteger(formState.term)) {
    formErrors.term = 'กรุณาระบุภาคเรียนเป็น 1, 2 หรือ 3'
    isValid = false
  }

  if (!formState.academicYear || formState.academicYear <= 0) {
    formErrors.academicYear = 'กรุณาระบุปีการศึกษา (พ.ศ.)'
    isValid = false
  }

  if (!formState.cohortYear || formState.cohortYear <= 0) {
  formErrors.cohortYear = 'กรุณาระบุรุ่นหลักเริ่มต้น (พ.ศ.)'
    isValid = false
  }

  if (!formState.applicationStartDate) {
    formErrors.applicationStartDate = 'กรุณาระบุวันเปิดรับคำร้อง'
    isValid = false
  }

  if (!formState.applicationEndDate) {
    formErrors.applicationEndDate = 'กรุณาระบุวันปิดรับคำร้อง'
    isValid = false
  } else if (formState.applicationStartDate && formState.applicationStartDate > formState.applicationEndDate) {
    formErrors.applicationEndDate = 'วันเปิดรับคำร้องต้องไม่เกินวันปิดรับคำร้อง'
    isValid = false
  }

  if (!formState.internshipStartDate) {
    formErrors.internshipStartDate = 'กรุณาระบุวันเริ่มฝึกงาน'
    isValid = false
  } else if (formState.applicationEndDate && formState.applicationEndDate > formState.internshipStartDate) {
    formErrors.internshipStartDate = 'วันปิดรับคำร้องต้องไม่เกินวันเริ่มฝึกงาน'
    isValid = false
  }

  if (!formState.internshipEndDate) {
    formErrors.internshipEndDate = 'กรุณาระบุวันสิ้นสุดฝึกงาน'
    isValid = false
  } else if (formState.internshipStartDate && formState.internshipStartDate > formState.internshipEndDate) {
    formErrors.internshipEndDate = 'วันเริ่มฝึกงานต้องไม่เกินวันสิ้นสุดฝึกงาน'
    isValid = false
  }

  return isValid
}

const submitForm = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (isEditing.value && editingId.value) {
      await $fetch(`/api/cooperative-cycles/${editingId.value}`, {
        method: 'PUT',
        body: formState
      })
      notify.updated(`รอบสหกิจ ${formState.term}/${formState.academicYear}`)
    } else {
      await $fetch('/api/cooperative-cycles', {
        method: 'POST',
        body: formState
      })
      notify.created(`รอบสหกิจ ${formState.term}/${formState.academicYear}`)
    }

    isFormOpen.value = false
    await refresh()
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    notify.error(errorMsg)
  } finally {
    isSubmitting.value = false
  }
}

// Delete handlers
const openDelete = (cycle: CooperativeCycle) => {
  if (cycle.status === 'CLOSED') {
    notify.error('ไม่สามารถลบรอบสหกิจที่ปิดรอบแล้วได้')
    return
  }
  pendingDeleteIds.value = [cycle.id]
  isDeleteOpen.value = true
}

const openBulkDelete = () => {
  pendingDeleteIds.value = selectedIds.value.filter(id => {
    const item = cycles.value?.find(c => c.id === id)
    return item && item.status !== 'CLOSED'
  })
  if (pendingDeleteIds.value.length) {
    isDeleteOpen.value = true
  } else {
    notify.error('ไม่สามารถลบรอบสหกิจที่ปิดรอบแล้วได้')
  }
}

const confirmDelete = async () => {
  if (!pendingDeleteIds.value.length) return

  isDeleting.value = true
  try {
    for (const id of pendingDeleteIds.value) {
      await $fetch(`/api/cooperative-cycles/${id}`, {
        method: 'DELETE'
      })
    }
    notify.deleted(`${pendingDeleteIds.value.length} รอบสหกิจ`)
    rowSelection.value = {}
    pendingDeleteIds.value = []
    isDeleteOpen.value = false
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'ไม่สามารถลบรอบสหกิจได้'
    notify.error(msg)
  } finally {
    isDeleting.value = false
    await refresh()
  }
}

const columns: TableColumn<CooperativeCycle>[] = [
  {
    id: 'select',
    meta: { class: { th: 'w-12', td: 'w-12' } },
    header: ({ table }) => h(UCheckbox, {
      size: 'lg',
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => row.original.status === 'CLOSED'
      ? null
      : h(UCheckbox, {
          size: 'lg',
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': `เลือกรอบสหกิจ ภาคเรียนที่ ${row.original.term}/${row.original.academicYear}`
        })
  },
  {
    accessorKey: 'term',
    header: 'รอบสหกิจ',
    cell: ({ row }) => `ภาคเรียนที่ ${row.original.term}/${row.original.academicYear}`
  },
  {
    accessorKey: 'cohortYear',
    header: 'รุ่นหลัก',
    cell: ({ row }) => `รุ่น ${row.original.cohortYear}`
  },
  {
    id: 'applicationPeriod',
    header: 'ช่วงรับคำร้อง',
    cell: ({ row }) => `${formatDateThai(row.original.applicationStartDate)} – ${formatDateThai(row.original.applicationEndDate)}`
  },
  {
    id: 'internshipPeriod',
    header: 'ช่วงฝึกงาน',
    cell: ({ row }) => `${formatDateThai(row.original.internshipStartDate)} – ${formatDateThai(row.original.internshipEndDate)}`
  },
  {
    accessorKey: 'status',
    header: 'สถานะ'
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-36 text-end', td: 'w-36 text-end' } }
  }
]
</script>

<template>
  <UDashboardPanel id="staff-cycles">
    <template #header>
      <AppDashboardNavbar title="รอบสหกิจ">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มรอบสหกิจ"
            icon="i-lucide-plus"
            color="primary"
            @click="openCreateModal"
          />
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-6 pb-12">
        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 class="text-lg font-bold text-ink">รอบสหกิจศึกษา</h3>
                <p class="mt-1 text-sm leading-6 text-muted">จัดการรอบสหกิจศึกษา กำหนดช่วงเวลา และติดตามสถานะการดำเนินงาน</p>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2">
                <UButton
                  size="xl"
                  label="เพิ่มรอบสหกิจ"
                  icon="i-lucide-plus"
                  color="primary"
                  @click="openCreateModal"
                />
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหารอบสหกิจ" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหาภาคเรียน ปีการศึกษา หรือรุ่น"
                  aria-label="ค้นหารอบสหกิจ"
                />
              </UFormField>

              <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
                <div class="w-full sm:w-52">
                  <USelect
                    v-model="statusFilter"
                    :items="statusOptions"
                    value-key="value"
                    class="w-full"
                    size="xl"
                    placeholder="กรองตามสถานะ"
                    aria-label="กรองตามสถานะรอบสหกิจ"
                  />
                </div>
                <UIButtonRefresh
                  :loading="fetchStatus === 'pending'"
                  @refresh="handleRefresh"
                />
              </div>
            </div>

            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ searchQuery }}”
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

          <!-- Bulk Actions Bar -->
          <div
            v-if="selectedCount"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-warning-soft px-5 py-3 sm:px-6"
            role="status"
          >
            <p class="text-sm font-semibold text-ink">เลือกแล้ว {{ selectedCount }} รายการ</p>
            <div class="flex gap-2">
              <UButton
                size="sm"
                color="error"
                variant="soft"
                icon="i-lucide-trash-2"
                :label="`ลบ ${selectedCount} รายการ`"
                @click="openBulkDelete"
              />
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                label="ยกเลิกการเลือก"
                @click="rowSelection = {}"
              />
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

          <!-- Error State -->
          <div v-else-if="fetchError" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-triangle-alert"
              title="ไม่สามารถเชื่อมต่อข้อมูลรอบสหกิจได้"
              :description="fetchError.message"
              variant="subtle"
              class="min-h-64"
            >
              <template #actions>
                <UButton
                  size="xl"
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="outline"
                  label="ลองอีกครั้ง"
                  @click="handleRefresh"
                />
              </template>
            </UEmpty>
          </div>

          <!-- Empty State -->
          <div v-else-if="!paginatedCycles.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-calendar-range"
              class="min-h-64"
              :title="hasFilters ? 'ไม่พบรอบสหกิจที่ตรงกับเงื่อนไข' : 'ยังไม่มีรอบสหกิจศึกษา'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ' : 'กดปุ่มเพิ่มรอบสหกิจเพื่อเริ่มต้นสร้างรอบใหม่'"
            >
              <template #actions>
                <UButton
                  v-if="hasFilters"
                  size="xl"
                  label="ล้างตัวกรอง"
                  color="neutral"
                  variant="outline"
                  @click="clearFilters"
                />
                <UButton
                  v-else
                  size="xl"
                  label="เพิ่มรอบสหกิจ"
                  icon="i-lucide-plus"
                  color="primary"
                  @click="openCreateModal"
                />
              </template>
            </UEmpty>
          </div>

          <!-- Data Table -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="rowSelection"
                :data="paginatedCycles"
                :columns="columns"
                :get-row-id="cycle => String(cycle.id)"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-200' }"
              >
                <template #status-cell="{ row }">
                  <UBadge
                    :label="statusDisplayMap[row.original.status]?.label || row.original.status"
                    :color="statusDisplayMap[row.original.status]?.color || 'neutral'"
                    variant="subtle"
                  />
                </template>

                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                    <UButton
                      label="เข้าสู่รอบ"
                      icon="i-lucide-arrow-right"
                      color="primary"
                      variant="ghost"
                      size="xs"
                      @click="enterCycle(row.original)"
                    />
                    <template v-if="row.original.status === 'CLOSED'">
                      <span class="text-xs text-muted">ปิดรอบแล้ว</span>
                    </template>
                    <template v-else>
                      <UButton
                        label="แก้ไข"
                        icon="i-lucide-pencil"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="openEditModal(row.original)"
                      />
                      <UButton
                        label="ลบ"
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="xs"
                        @click="openDelete(row.original)"
                      />
                    </template>
                  </div>
                </template>
              </UTable>
            </div>

            <!-- Footer -->
            <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="flex flex-wrap items-center gap-3">
                <p class="whitespace-nowrap text-muted">
                  แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredCycles.length }} รายการ
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
                :total="filteredCycles.length"
                :items-per-page="pageSize"
                size="md"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create / Edit Modal Form -->
  <UModal
    v-model:open="isFormOpen"
    :title="isEditing ? 'แก้ไขรอบสหกิจศึกษา' : 'เพิ่มรอบสหกิจศึกษาใหม่'"
    :description="isEditing ? 'ปรับปรุงข้อมูลรอบสหกิจและสถานะการดำเนินงาน' : 'กรอกข้อมูลกำหนดการรอบสหกิจศึกษาเพื่อเปิดรับคำร้อง'"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submitForm">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="ภาคเรียน" required :error="formErrors.term">
            <UInput
              v-model.number="formState.term"
              type="number"
              min="1"
              max="3"
              placeholder="1, 2"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="ปีการศึกษา (พ.ศ.)" required :error="formErrors.academicYear">
            <UInput
              v-model.number="formState.academicYear"
              type="number"
              placeholder="2569"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="รุ่นหลักเริ่มต้น (พ.ศ.)" required :error="formErrors.cohortYear">
            <UInput
              v-model.number="formState.cohortYear"
              type="number"
              placeholder="2566"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>

        <div class="border-t border-divider pt-3">
          <p class="text-xs font-semibold text-ink mb-2">กำหนดการรับคำร้อง</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="วันเปิดรับคำร้อง" required :error="formErrors.applicationStartDate">
              <UPopover>
                <UInputDate v-model="applicationStartDate" class="w-full" size="xl" locale="th-TH" aria-label="วันเปิดรับคำร้อง" />
                <template #content><UCalendar v-model="applicationStartDate" locale="th-TH" /></template>
              </UPopover>
            </UFormField>
            <UFormField label="วันปิดรับคำร้อง" required :error="formErrors.applicationEndDate">
              <UPopover>
                <UInputDate v-model="applicationEndDate" class="w-full" size="xl" locale="th-TH" aria-label="วันปิดรับคำร้อง" />
                <template #content><UCalendar v-model="applicationEndDate" locale="th-TH" /></template>
              </UPopover>
            </UFormField>
          </div>
        </div>

        <div class="border-t border-divider pt-3">
          <p class="text-xs font-semibold text-ink mb-2">กำหนดการฝึกงาน</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="วันเริ่มฝึกงาน" required :error="formErrors.internshipStartDate">
              <UPopover>
                <UInputDate v-model="internshipStartDate" class="w-full" size="xl" locale="th-TH" aria-label="วันเริ่มฝึกงาน" />
                <template #content><UCalendar v-model="internshipStartDate" locale="th-TH" /></template>
              </UPopover>
            </UFormField>
            <UFormField label="วันสิ้นสุดฝึกงาน" required :error="formErrors.internshipEndDate">
              <UPopover>
                <UInputDate v-model="internshipEndDate" class="w-full" size="xl" locale="th-TH" aria-label="วันสิ้นสุดฝึกงาน" />
                <template #content><UCalendar v-model="internshipEndDate" locale="th-TH" /></template>
              </UPopover>
            </UFormField>
          </div>
        </div>

        <div v-if="isEditing" class="border-t border-divider pt-3">
          <UFormField label="สถานะรอบสหกิจ" required>
            <USelect
              v-model="formState.status"
              :items="formStatusOptions"
              value-key="value"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>

        <div class="border-t border-divider pt-3">
          <UFormField label="หมายเหตุ (ไม่บังคับ)">
            <UTextarea
              v-model="formState.note"
              :rows="2"
              placeholder="ระบุข้อความหรือคำชี้แจงเพิ่มเติม"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          size="xl"
          label="ยกเลิก"
          color="neutral"
          variant="outline"
          :disabled="isSubmitting"
          @click="isFormOpen = false"
        />
        <UButton
          size="xl"
          :label="isEditing ? 'บันทึกการแก้ไข' : 'บันทึกรอบสหกิจ'"
          color="primary"
          :loading="isSubmitting"
          @click="submitForm"
        />
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UIConfirmModal
    v-model:open="isDeleteOpen"
    title="ลบรอบสหกิจ"
    :message="`คุณต้องการลบรอบสหกิจ ${deleteCount} รายการใช่หรือไม่?`"
    sub-message="การลบจะนำข้อมูลออกจากระบบอย่างถาวร"
    icon="i-lucide-trash-2"
    icon-color="error"
    confirm-label="ลบรายการ"
    confirm-color="error"
    :loading="isDeleting"
    @confirm="confirmDelete"
  />
</template>
