<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

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

const UCheckbox = resolveComponent('UCheckbox')
const notify = useNotify()

// Data fetching from API
const { data: students, status: fetchStatus, error: fetchError, refresh } = await useFetch<Student[]>('/api/students')

const searchQuery = ref('')
const cohortFilter = ref<string>('all')
const classGroupFilter = ref<string>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const rowSelection = ref<Record<string, boolean>>({})
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

// Delete modal state
const isDeleteOpen = ref(false)
const pendingDeleteIds = ref<number[]>([])
const isDeleting = ref(false)

const isImportOpen = ref(false)
const importFile = ref<File | null>(null)
const importError = ref('')
const isImporting = ref(false)

// Form Modal State (Add / Edit)
const isFormOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)

const formState = reactive({
  studentId: '',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  cohortYear: 2566,
  classGroup: 1,
  isActive: true,
  newPassword: '',
  confirmPassword: ''
})

const formErrors = reactive<Record<string, string>>({})

const prefixOptions = [
  { label: 'นาย', value: 'นาย' },
  { label: 'นางสาว', value: 'นางสาว' },
  { label: 'นาง', value: 'นาง' }
]

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'all' },
  { label: 'ใช้งาน', value: 'active' },
  { label: 'ไม่ใช้งาน', value: 'inactive' }
]

const cohortOptions = computed(() => {
  const list = students.value ?? []
  const uniqueCohorts = Array.from(new Set(list.map(s => s.cohortYear))).sort((a, b) => b - a)
  return [
    { label: 'ทุกรุ่น', value: 'all' },
    ...uniqueCohorts.map(c => ({ label: `รุ่น ${c}`, value: String(c) }))
  ]
})

const classGroupOptions = computed(() => {
  const list = students.value ?? []
  const uniqueGroups = Array.from(new Set(list.map(s => s.classGroup))).sort((a, b) => a - b)
  return [
    { label: 'ทุกหมู่เรียน', value: 'all' },
    ...uniqueGroups.map(g => ({ label: `หมู่ ${g}`, value: String(g) }))
  ]
})

const filteredStudents = computed(() => {
  const list = students.value ?? []
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((student) => {
    const fullName = `${student.prefix}${student.firstName} ${student.lastName}`
    const matchesSearch = !keyword || [
      student.studentId,
      student.firstName,
      student.lastName,
      fullName
    ].join(' ').toLowerCase().includes(keyword)

    const matchesCohort = cohortFilter.value === 'all' || String(student.cohortYear) === cohortFilter.value
    const matchesGroup = classGroupFilter.value === 'all' || String(student.classGroup) === classGroupFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && student.isActive)
      || (statusFilter.value === 'inactive' && !student.isActive)

    return matchesSearch && matchesCohort && matchesGroup && matchesStatus
  })
})

const paginatedStudents = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredStudents.value.slice(start, start + pageSize.value)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || cohortFilter.value !== 'all' || classGroupFilter.value !== 'all' || statusFilter.value !== 'all')
const pageStart = computed(() => filteredStudents.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredStudents.value.length))

watch([searchQuery, cohortFilter, classGroupFilter, statusFilter, pageSize], () => {
  page.value = 1
  rowSelection.value = {}
})

watch(totalPages, () => {
  page.value = Math.min(page.value, totalPages.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  cohortFilter.value = 'all'
  classGroupFilter.value = 'all'
  statusFilter.value = 'all'
}

const handleRefresh = async () => {
  await refresh()
  rowSelection.value = {}
  if (fetchError.value) {
    notify.error('ไม่สามารถอัปเดตข้อมูลนักศึกษาได้')
    return
  }
  notify.info('อัปเดตข้อมูลนักศึกษาแล้ว')
}

const exportStudents = () => {
  const query = new URLSearchParams()
  if (searchQuery.value) query.set('search', searchQuery.value)
  if (cohortFilter.value !== 'all') query.set('cohortYear', cohortFilter.value)
  if (classGroupFilter.value !== 'all') query.set('classGroup', classGroupFilter.value)
  if (statusFilter.value !== 'all') query.set('isActive', String(statusFilter.value === 'active'))
  window.location.assign(`/api/students/export?${query.toString()}`)
}

const openImportModal = () => {
  importFile.value = null
  importError.value = ''
  isImportOpen.value = true
}

const selectImportFile = (event: Event) => {
  const target = event.target as HTMLInputElement
  importFile.value = target.files?.[0] ?? null
  importError.value = ''
}

const submitImport = async () => {
  if (!importFile.value) {
    importError.value = 'กรุณาเลือกไฟล์ CSV หรือ XLSX'
    return
  }

  isImporting.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const result = await $fetch<{ imported: number, skipped: number, total: number }>('/api/students/import', {
      method: 'POST',
      body: formData
    })

    isImportOpen.value = false
    await refresh()
    notify.success(`นำเข้า ${result.imported} จาก ${result.total} รายการ${result.skipped ? ` · ข้ามรหัสซ้ำ ${result.skipped} รายการ` : ''}`)
  } catch (error: unknown) {
    const data = typeof error === 'object' && error !== null && 'data' in error ? error.data : undefined
    importError.value = typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
      ? data.message
      : 'ไม่สามารถนำเข้าข้อมูลนักศึกษาได้'
  } finally {
    isImporting.value = false
  }
}

// Detail Modal state
const isDetailOpen = ref(false)
const selectedStudent = ref<Student | null>(null)

const openDetail = (student: Student) => {
  selectedStudent.value = student
  isDetailOpen.value = true
}

// Modal open handlers
const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  const currentYear = new Date().getFullYear() + 543
  formState.studentId = ''
  formState.prefix = 'นาย'
  formState.firstName = ''
  formState.lastName = ''
  formState.cohortYear = currentYear - 3
  formState.classGroup = 1
  formState.isActive = true
  formState.newPassword = ''
  formState.confirmPassword = ''

  isFormOpen.value = true
}

const openEditModal = (student: Student) => {
  isEditing.value = true
  editingId.value = student.id
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.studentId = student.studentId
  formState.prefix = student.prefix
  formState.firstName = student.firstName
  formState.lastName = student.lastName
  formState.cohortYear = student.cohortYear
  formState.classGroup = student.classGroup
  formState.isActive = student.isActive
  formState.newPassword = ''
  formState.confirmPassword = ''

  isFormOpen.value = true
}

const validateForm = () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  let isValid = true

  if (!formState.studentId.trim()) {
    formErrors.studentId = 'กรุณากรอกรหัสนักศึกษา'
    isValid = false
  }

  if (!formState.prefix.trim()) {
    formErrors.prefix = 'กรุณาระบุคำนำหน้า'
    isValid = false
  }

  if (!formState.firstName.trim()) {
    formErrors.firstName = 'กรุณากรอกชื่อ'
    isValid = false
  }

  if (!formState.lastName.trim()) {
    formErrors.lastName = 'กรุณากรอกนามสกุล'
    isValid = false
  }

  if (!formState.cohortYear || formState.cohortYear <= 0) {
    formErrors.cohortYear = 'กรุณาระบุรุ่นนักศึกษา (พ.ศ.)'
    isValid = false
  }

  if (!formState.classGroup || formState.classGroup <= 0) {
    formErrors.classGroup = 'กรุณาระบุหมู่เรียนเป็นจำนวนเต็มบวก'
    isValid = false
  }

  if (formState.newPassword && formState.newPassword.length < 8) {
    formErrors.newPassword = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'
    isValid = false
  } else if (formState.newPassword !== formState.confirmPassword) {
    formErrors.confirmPassword = 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'
    isValid = false
  }

  return isValid
}

const submitForm = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (isEditing.value && editingId.value) {
      await $fetch(`/api/students/${editingId.value}`, {
        method: 'PUT',
        body: formState
      })
      notify.updated(`ข้อมูลนักศึกษา ${formState.studentId}`)
    } else {
      await $fetch('/api/students', {
        method: 'POST',
        body: formState
      })
      notify.created(`นักศึกษา ${formState.studentId}`)
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
const openDelete = (student: Student) => {
  pendingDeleteIds.value = [student.id]
  isDeleteOpen.value = true
}

const openBulkDelete = () => {
  pendingDeleteIds.value = selectedIds.value
  isDeleteOpen.value = true
}

const confirmDelete = async () => {
  if (!pendingDeleteIds.value.length) return

  isDeleting.value = true
  try {
    for (const id of pendingDeleteIds.value) {
      await $fetch(`/api/students/${id}`, {
        method: 'DELETE'
      })
    }
    notify.deleted(`${pendingDeleteIds.value.length} รายการนักศึกษา`)
    rowSelection.value = {}
    pendingDeleteIds.value = []
    isDeleteOpen.value = false
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'ไม่สามารถลบข้อมูลนักศึกษาได้'
    notify.error(msg)
  } finally {
    isDeleting.value = false
    await refresh()
  }
}

const columns: TableColumn<Student>[] = [
  {
    id: 'select',
    meta: { class: { th: 'w-12', td: 'w-12' } },
    header: ({ table }) => h(UCheckbox, {
      size: 'lg',
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => h(UCheckbox, {
      size: 'lg',
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'aria-label': `เลือกนักศึกษารหัส ${row.original.studentId}`
    })
  },
  {
    accessorKey: 'studentId',
    header: 'รหัสนักศึกษา',
    meta: { class: { th: 'w-36', td: 'w-36 font-semibold' } }
  },
  {
    id: 'fullName',
    header: 'ชื่อ-สกุล',
    cell: ({ row }) => `${row.original.prefix}${row.original.firstName} ${row.original.lastName}`
  },
  {
    accessorKey: 'cohortYear',
    header: 'รุ่น',
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => `รุ่น ${row.original.cohortYear}`
  },
  {
    accessorKey: 'classGroup',
    header: 'หมู่เรียน',
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => `หมู่ ${row.original.classGroup}`
  },
  {
    accessorKey: 'isActive',
    header: 'สถานะ',
    meta: { class: { th: 'w-28', td: 'w-28' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-48 text-end', td: 'w-48 text-end' } }
  }
]
</script>

<template>
  <UDashboardPanel id="staff-students">
    <template #header>
      <AppDashboardNavbar>
        <template #left>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
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
                <h3 class="text-lg font-bold text-ink">ข้อมูลนักศึกษา</h3>
                <p class="mt-1 text-sm leading-6 text-muted">ค้นหา เพิ่ม แก้ไข และจัดการบัญชีโดยไม่ลบประวัติเดิม</p>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2">
                <UButton
                  size="xl"
                  label="นำเข้าข้อมูล"
                  icon="i-lucide-upload"
                  color="neutral"
                  variant="outline"
                  @click="openImportModal"
                />
                <UButton
                  size="xl"
                  label="ส่งออกข้อมูล"
                  icon="i-lucide-download"
                  color="neutral"
                  variant="outline"
                  @click="exportStudents"
                />
                <UButton
                  size="xl"
                  label="เพิ่มนักศึกษา"
                  icon="i-lucide-plus"
                  color="primary"
                  @click="openCreateModal"
                />
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหานักศึกษา" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหารหัสนักศึกษา หรือชื่อ-สกุล"
                  aria-label="ค้นหานักศึกษา"
                />
              </UFormField>

              <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
                <div class="w-full sm:w-36">
                  <USelect
                    v-model="cohortFilter"
                    :items="cohortOptions"
                    value-key="value"
                    class="w-full"
                    size="xl"
                    placeholder="เลือกรุ่น"
                    aria-label="กรองตามรุ่นนักศึกษา"
                  />
                </div>
                <div class="w-full sm:w-36">
                  <USelect
                    v-model="classGroupFilter"
                    :items="classGroupOptions"
                    value-key="value"
                    class="w-full"
                    size="xl"
                    placeholder="เลือกหมู่เรียน"
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
                  @refresh="handleRefresh"
                />
              </div>
            </div>

            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ searchQuery }}”
              </span>
              <span v-if="cohortFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ cohortOptions.find(o => o.value === cohortFilter)?.label }}
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
              title="ไม่สามารถเชื่อมต่อข้อมูลนักศึกษาได้"
              :description="fetchError.message"
              variant="subtle"
              class="min-h-64"
            >
              <template #actions>
                <UButton
                  size="xl"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-refresh-cw"
                  @click="handleRefresh"
                >
                  ลองอีกครั้ง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Empty State -->
          <div v-else-if="!paginatedStudents.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-inbox"
              class="min-h-64"
              :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลนักศึกษา'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'นำเข้าหรือเพิ่มนักศึกษาเพื่อเริ่มต้นใช้งาน'"
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
                <UButton
                  v-else
                  size="xl"
                  icon="i-lucide-plus"
                  @click="openCreateModal"
                >
                  เพิ่มนักศึกษา
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Data Table -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="rowSelection"
                :data="paginatedStudents"
                :columns="columns"
                :get-row-id="student => String(student.id)"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-200' }"
              >
                <template #fullName-cell="{ row }">
                  <p class="font-semibold text-ink">{{ row.original.prefix }}{{ row.original.firstName }} {{ row.original.lastName }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.original.studentId }}</p>
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
                      label="ดู"
                      icon="i-lucide-eye"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="openDetail(row.original)"
                    />
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
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isImportOpen"
    title="นำเข้าข้อมูลนักศึกษา"
    description="รองรับไฟล์ CSV และ XLSX ไม่เกิน 1,000 รายการ หรือ 2 MB ต่อครั้ง"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          รองรับหัวตาราง: รหัสนักศึกษา หรือ รหัส, ชื่อ, รุ่น, หมู่เรียน
          <span class="block">สถานะใช้งานเป็นคอลัมน์เสริม โดยใช้ ใช้งาน หรือ ไม่ใช้งาน</span>
          <span class="block">ช่องชื่อรองรับชื่อ-สกุลและคำนำหน้าในช่องเดียว เช่น “นาย สมชาย ใจดี”; รุ่น 66 จะบันทึกเป็น 2566</span>
          <span class="block">บัญชีใหม่ใช้รหัสนักศึกษาเป็นรหัสผ่านตั้งต้น และนักศึกษาต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก</span>
        </p>
        <a
          href="/student-import-template.csv"
          download
          class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <UIcon name="i-lucide-download" class="size-4" />
          ดาวน์โหลดไฟล์ตัวอย่าง CSV
        </a>
        <a
          href="/student-import-template.xlsx"
          download
          class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <UIcon name="i-lucide-file-spreadsheet" class="size-4" />
          ดาวน์โหลดไฟล์ตัวอย่าง Excel (.xlsx)
        </a>
        <UFormField label="ไฟล์ข้อมูล" required :error="importError">
          <input
            accept=".csv,.xlsx"
            class="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-surface/80"
            type="file"
            @change="selectImportFile"
          >
        </UFormField>
        <p v-if="importFile" class="text-sm text-muted">เลือกไฟล์: {{ importFile.name }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton size="xl" label="ยกเลิก" color="neutral" variant="outline" :disabled="isImporting" @click="isImportOpen = false" />
        <UButton size="xl" label="นำเข้าข้อมูล" icon="i-lucide-upload" color="primary" :loading="isImporting" @click="submitImport" />
      </div>
    </template>
  </UModal>

  <!-- Create / Edit Modal Form -->
  <UModal
    v-model:open="isFormOpen"
    :title="isEditing ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มข้อมูลนักศึกษาใหม่'"
    :description="isEditing ? 'ปรับปรุงข้อมูลส่วนตัว รุ่น และสถานะการใช้งานของนักศึกษา' : 'รหัสผ่านตั้งต้นคือรหัสนักศึกษา และนักศึกษาจะต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก'"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submitForm">
        <UFormField label="รหัสนักศึกษา" required :error="formErrors.studentId">
          <UInput
            v-model="formState.studentId"
            placeholder="เช่น 66010001"
            class="w-full"
            size="xl"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="คำนำหน้า" required :error="formErrors.prefix">
            <USelect
              v-model="formState.prefix"
              :items="prefixOptions"
              value-key="value"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="ชื่อ" required :error="formErrors.firstName">
            <UInput
              v-model="formState.firstName"
              placeholder="ชื่อจริง"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="นามสกุล" required :error="formErrors.lastName">
            <UInput
              v-model="formState.lastName"
              placeholder="นามสกุล"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="รุ่นนักศึกษา (พ.ศ.)" required :error="formErrors.cohortYear">
            <UInput
              v-model.number="formState.cohortYear"
              type="number"
              placeholder="2566"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="หมู่เรียน" required :error="formErrors.classGroup">
            <UInput
              v-model.number="formState.classGroup"
              type="number"
              min="1"
              placeholder="1, 2"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>

        <div v-if="isEditing" class="border-t border-divider pt-3">
          <UFormField label="สถานะการใช้งาน">
            <div class="flex items-center gap-2 pt-1">
              <USwitch
                v-model="formState.isActive"
                size="sm"
              />
              <span class="text-sm font-medium text-ink">
                {{ formState.isActive ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)' }}
              </span>
            </div>
          </UFormField>
        </div>

        <div v-if="isEditing" class="grid grid-cols-1 gap-3 border-t border-divider pt-3 sm:grid-cols-2">
          <UFormField label="ตั้งรหัสผ่านใหม่" hint="เว้นว่างหากไม่เปลี่ยน" :error="formErrors.newPassword">
            <UInput v-model="formState.newPassword" type="password" autocomplete="new-password" class="w-full" size="xl" />
          </UFormField>
          <UFormField label="ยืนยันรหัสผ่านใหม่" :error="formErrors.confirmPassword">
            <UInput v-model="formState.confirmPassword" type="password" autocomplete="new-password" class="w-full" size="xl" />
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
          :label="isEditing ? 'บันทึกการแก้ไข' : 'บันทึกนักศึกษา'"
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
    title="ลบข้อมูลนักศึกษา"
    :message="`คุณต้องการลบข้อมูลนักศึกษา ${deleteCount} รายการใช่หรือไม่?`"
    sub-message="การลบจะนำข้อมูลออกจากระบบอย่างถาวร หากนักศึกษามีข้อมูลประวัติแล้วแนะนำให้เปลี่ยนสถานะเป็นไม่ใช้งานแทน"
    icon="i-lucide-trash-2"
    icon-color="error"
    confirm-label="ลบข้อมูล"
    confirm-color="error"
    :loading="isDeleting"
    @confirm="confirmDelete"
  />

  <!-- Student Detail Modal -->
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
          v-if="selectedStudent"
          size="xl"
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="isDetailOpen = false; openEditModal(selectedStudent)"
        />
        <div class="ml-auto">
          <UButton
            size="xl"
            label="ปิด"
            color="neutral"
            variant="subtle"
            @click="isDetailOpen = false"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
