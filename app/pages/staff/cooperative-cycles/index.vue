<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
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
const pageSize = 8

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
  const start = (page.value - 1) * pageSize
  return filteredCycles.value.slice(start, start + pageSize)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCycles.value.length / pageSize)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredCycles.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredCycles.value.length))

watch([searchQuery, statusFilter], () => {
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
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => row.original.status === 'CLOSED'
      ? null
      : h(UCheckbox, {
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
    header: 'จัดการ',
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
      <div class="flex flex-col gap-4 p-4 sm:p-6">
        <!-- Control Row -->
        <div class="flex flex-col gap-3 rounded-lg sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <UInput
              v-model="searchQuery"
              class="min-w-0 flex-1"
              icon="i-lucide-search"
              placeholder="ค้นหาภาคเรียน ปีการศึกษา หรือรุ่น"
              aria-label="ค้นหารอบสหกิจ"
            />
            <UButton
              v-if="hasFilters"
              color="neutral"
              variant="ghost"
              label="ล้าง"
              @click="clearFilters"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
              class="w-44"
              aria-label="กรองตามสถานะรอบสหกิจ"
            />
            <UButton
              v-if="selectedCount"
              color="error"
              variant="subtle"
              icon="i-lucide-trash-2"
              :label="`ลบ ${selectedCount}`"
              @click="openBulkDelete"
            />
            <UIButtonRefresh
              :loading="fetchStatus === 'pending'"
              @refresh="handleRefresh"
            />
          </div>
        </div>

        <!-- Error State -->
        <UAlert
          v-if="fetchError"
          color="error"
          icon="i-lucide-alert-circle"
          title="ไม่สามารถเชื่อมต่อข้อมูลรอบสหกิจได้"
          :description="fetchError.message"
        />

        <!-- Data Table -->
        <div v-else class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable
            v-model:row-selection="rowSelection"
            :data="paginatedCycles"
            :columns="columns"
            :loading="fetchStatus === 'pending'"
            :get-row-id="cycle => String(cycle.id)"
            :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }"
          >
            <template #status-cell="{ row }">
              <UBadge
                :label="statusDisplayMap[row.original.status]?.label || row.original.status"
                :color="statusDisplayMap[row.original.status]?.color || 'neutral'"
                variant="subtle"
              />
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end items-center gap-1.5 min-h-7">
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

            <template #empty>
              <div class="py-12 text-center text-muted">
                <UIcon name="i-lucide-calendar-range" class="size-10 mx-auto mb-2 text-dimmed" />
                <p>ไม่พบข้อมูลรอบสหกิจศึกษา</p>
                <p class="text-xs text-muted mt-1">กดปุ่ม "เพิ่มรอบสหกิจ" เพื่อสร้างรอบการฝึกงานใหม่</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination & Range Counter -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            <template v-if="filteredCycles.length">
              แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredCycles.length }} รายการ
              <template v-if="selectedCount"> · เลือก {{ selectedCount }} รายการ</template>
            </template>
            <template v-else>ไม่พบรายการ</template>
          </span>
          <UPagination
            v-if="filteredCycles.length > pageSize"
            v-model:page="page"
            :total="filteredCycles.length"
            :items-per-page="pageSize"
          />
        </div>
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
            />
          </UFormField>

          <UFormField label="ปีการศึกษา (พ.ศ.)" required :error="formErrors.academicYear">
            <UInput
              v-model.number="formState.academicYear"
              type="number"
              placeholder="2569"
              class="w-full"
            />
          </UFormField>

          <UFormField label="รุ่นหลักเริ่มต้น (พ.ศ.)" required :error="formErrors.cohortYear">
            <UInput
              v-model.number="formState.cohortYear"
              type="number"
              placeholder="2566"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="border-t border-default pt-3">
          <p class="text-xs font-semibold text-highlighted mb-2">กำหนดการรับคำร้อง</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="วันเปิดรับคำร้อง" required :error="formErrors.applicationStartDate">
              <UInput
                v-model="formState.applicationStartDate"
                type="date"
                class="w-full"
              />
            </UFormField>
            <UFormField label="วันปิดรับคำร้อง" required :error="formErrors.applicationEndDate">
              <UInput
                v-model="formState.applicationEndDate"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <div class="border-t border-default pt-3">
          <p class="text-xs font-semibold text-highlighted mb-2">กำหนดการฝึกงาน</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="วันเริ่มฝึกงาน" required :error="formErrors.internshipStartDate">
              <UInput
                v-model="formState.internshipStartDate"
                type="date"
                class="w-full"
              />
            </UFormField>
            <UFormField label="วันสิ้นสุดฝึกงาน" required :error="formErrors.internshipEndDate">
              <UInput
                v-model="formState.internshipEndDate"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <div v-if="isEditing" class="border-t border-default pt-3">
          <UFormField label="สถานะรอบสหกิจ" required>
            <USelect
              v-model="formState.status"
              :items="formStatusOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="border-t border-default pt-3">
          <UFormField label="หมายเหตุ (ไม่บังคับ)">
            <UTextarea
              v-model="formState.note"
              :rows="2"
              placeholder="ระบุข้อความหรือคำชี้แจงเพิ่มเติม"
              class="w-full"
            />
          </UFormField>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="ยกเลิก"
          color="neutral"
          variant="outline"
          :disabled="isSubmitting"
          @click="isFormOpen = false"
        />
        <UButton
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
