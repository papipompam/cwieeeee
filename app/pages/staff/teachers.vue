<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

interface Teacher {
  id: number
  teacherId: string
  prefix: string
  firstName: string
  lastName: string
  gender: string
  phone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const UCheckbox = resolveComponent('UCheckbox')
const notify = useNotify()

// Data fetching from API
const { data: teachers, status: fetchStatus, error: fetchError, refresh } = await useFetch<Teacher[]>('/api/teachers')

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
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
  teacherId: '',
  prefix: 'อาจารย์',
  firstName: '',
  lastName: '',
  gender: 'ชาย',
  phone: '',
  isActive: true
})

const formErrors = reactive<Record<string, string>>({})

const prefixOptions = [
  { label: 'อาจารย์', value: 'อาจารย์' },
  { label: 'ดร.', value: 'ดร.' },
  { label: 'ผศ.', value: 'ผศ.' },
  { label: 'ผศ.ดร.', value: 'ผศ.ดร.' },
  { label: 'รศ.', value: 'รศ.' },
  { label: 'รศ.ดร.', value: 'รศ.ดร.' },
  { label: 'ศ.', value: 'ศ.' },
  { label: 'ศ.ดร.', value: 'ศ.ดร.' },
  { label: 'นาย', value: 'นาย' },
  { label: 'นางสาว', value: 'นางสาว' },
  { label: 'นาง', value: 'นาง' }
]

const genderOptions = [
  { label: 'ชาย', value: 'ชาย' },
  { label: 'หญิง', value: 'หญิง' },
  { label: 'อื่นๆ / ไม่ระบุ', value: 'อื่นๆ' }
]

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'all' },
  { label: 'ใช้งาน', value: 'active' },
  { label: 'ไม่ใช้งาน', value: 'inactive' }
]

const filteredTeachers = computed(() => {
  const list = teachers.value ?? []
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((teacher) => {
    const fullName = `${teacher.prefix}${teacher.firstName} ${teacher.lastName}`
    const matchesSearch = !keyword || [
      teacher.teacherId,
      teacher.firstName,
      teacher.lastName,
      fullName,
      teacher.phone
    ].join(' ').toLowerCase().includes(keyword)

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && teacher.isActive)
      || (statusFilter.value === 'inactive' && !teacher.isActive)

    return matchesSearch && matchesStatus
  })
})

const paginatedTeachers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTeachers.value.slice(start, start + pageSize.value)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTeachers.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredTeachers.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredTeachers.value.length))

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
  notify.info('อัปเดตข้อมูลอาจารย์แล้ว')
}

// Modal open handlers
const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.teacherId = ''
  formState.prefix = 'อาจารย์'
  formState.firstName = ''
  formState.lastName = ''
  formState.gender = 'ชาย'
  formState.phone = ''
  formState.isActive = true
  isFormOpen.value = true
}

// Detail Modal state
const isDetailOpen = ref(false)
const selectedTeacher = ref<Teacher | null>(null)
const isPasswordOpen = ref(false)
const passwordAccount = ref<{ id: number, loginId: string, name: string } | null>(null)

const openDetail = (teacher: Teacher) => {
  selectedTeacher.value = teacher
  isDetailOpen.value = true
}

const openPasswordModal = (teacher: Teacher) => {
  passwordAccount.value = {
    id: teacher.id,
    loginId: teacher.teacherId,
    name: `${teacher.prefix}${teacher.firstName} ${teacher.lastName}`
  }
  isPasswordOpen.value = true
}

const openEditModal = (teacher: Teacher) => {
  isEditing.value = true
  editingId.value = teacher.id
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.teacherId = teacher.teacherId
  formState.prefix = teacher.prefix
  formState.firstName = teacher.firstName
  formState.lastName = teacher.lastName
  formState.gender = teacher.gender
  formState.phone = teacher.phone
  formState.isActive = teacher.isActive

  isFormOpen.value = true
}

const validateForm = () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  let isValid = true

  if (!formState.teacherId.trim()) {
    formErrors.teacherId = 'กรุณากรอกรหัสอาจารย์'
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

  if (!formState.gender.trim()) {
    formErrors.gender = 'กรุณาระบุเพศ'
    isValid = false
  }

  if (!formState.phone.trim()) {
    formErrors.phone = 'กรุณากรอกเบอร์มือถือ'
    isValid = false
  } else if (!/^0\d{9}$/.test(formState.phone.trim())) {
    formErrors.phone = 'กรุณากรอกเบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'
    isValid = false
  }

  return isValid
}

const submitForm = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (isEditing.value && editingId.value) {
      await $fetch(`/api/teachers/${editingId.value}`, {
        method: 'PUT',
        body: formState
      })
      notify.updated(`ข้อมูลอาจารย์ ${formState.teacherId}`)
    } else {
      await $fetch('/api/teachers', {
        method: 'POST',
        body: formState
      })
      notify.created(`อาจารย์ ${formState.teacherId}`)
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
const openDelete = (teacher: Teacher) => {
  pendingDeleteIds.value = [teacher.id]
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
      await $fetch(`/api/teachers/${id}`, {
        method: 'DELETE'
      })
    }
    notify.deleted(`${pendingDeleteIds.value.length} รายการอาจารย์`)
    rowSelection.value = {}
    pendingDeleteIds.value = []
    isDeleteOpen.value = false
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'ไม่สามารถลบข้อมูลอาจารย์ได้'
    notify.error(msg)
  } finally {
    isDeleting.value = false
    await refresh()
  }
}

const columns: TableColumn<Teacher>[] = [
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
      'aria-label': `เลือกอาจารย์รหัส ${row.original.teacherId}`
    })
  },
  {
    accessorKey: 'teacherId',
    header: 'รหัสอาจารย์',
    meta: { class: { th: 'w-36', td: 'w-36 font-semibold' } }
  },
  {
    id: 'fullName',
    header: 'ชื่อ-สกุล',
    cell: ({ row }) => `${row.original.prefix}${row.original.firstName} ${row.original.lastName}`
  },
  {
    accessorKey: 'gender',
    header: 'เพศ',
    meta: { class: { th: 'w-24', td: 'w-24' } }
  },
  {
    accessorKey: 'phone',
    header: 'เบอร์มือถือ',
    meta: { class: { th: 'w-36', td: 'w-36' } }
  },
  {
    accessorKey: 'isActive',
    header: 'สถานะ',
    meta: { class: { th: 'w-28', td: 'w-28' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-64 text-end', td: 'w-64 text-end' } }
  }
]
</script>

<template>
  <UDashboardPanel id="staff-teachers">
    <template #header>
      <AppDashboardNavbar title="จัดการข้อมูลอาจารย์">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            size="xl"
            label="เพิ่มอาจารย์"
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
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-lg font-bold text-ink">ข้อมูลอาจารย์</h3>
                <p class="mt-1 text-sm leading-6 text-muted">ค้นหา เพิ่ม แก้ไข และจัดการสิทธิ์บัญชีอาจารย์นิเทศ</p>
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหาอาจารย์" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหารหัสอาจารย์ หรือชื่อ-สกุล"
                  aria-label="ค้นหาอาจารย์"
                />
              </UFormField>

              <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
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
              title="ไม่สามารถเชื่อมต่อข้อมูลอาจารย์ได้"
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
          <div v-else-if="!paginatedTeachers.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-inbox"
              class="min-h-64"
              :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลอาจารย์'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'กดปุ่ม &quot;เพิ่มอาจารย์&quot; เพื่อบันทึกข้อมูลเข้าสู่ระบบ'"
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
                  เพิ่มอาจารย์
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Data Table -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="rowSelection"
                :data="paginatedTeachers"
                :columns="columns"
                :get-row-id="teacher => String(teacher.id)"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-200' }"
              >
                <template #fullName-cell="{ row }">
                  <p class="font-semibold text-ink">{{ row.original.prefix }}{{ row.original.firstName }} {{ row.original.lastName }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.original.teacherId }}</p>
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
                      label="รหัสผ่าน"
                      icon="i-lucide-key-round"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="openPasswordModal(row.original)"
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
                  แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredTeachers.length }} รายการ
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
                :total="filteredTeachers.length"
                :items-per-page="pageSize"
                size="md"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UIAccountPasswordModal
    v-if="passwordAccount"
    v-model:open="isPasswordOpen"
    :account="passwordAccount"
  />

  <!-- Create / Edit Modal Form -->
  <UModal
    v-model:open="isFormOpen"
    :title="isEditing ? 'แก้ไขข้อมูลอาจารย์' : 'เพิ่มข้อมูลอาจารย์ใหม่'"
    :description="isEditing ? 'ปรับปรุงข้อมูลอาจารย์นิเทศและสถานะการปฏิบัติงาน' : 'กรอกข้อมูลอาจารย์นิเทศเพื่อลงทะเบียนเข้าสู่ระบบงานสหกิจศึกษา'"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submitForm">
        <UFormField label="รหัสอาจารย์" required :error="formErrors.teacherId">
          <UInput
            v-model="formState.teacherId"
            placeholder="เช่น T001"
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
          <UFormField label="เพศ" required :error="formErrors.gender">
            <USelect
              v-model="formState.gender"
              :items="genderOptions"
              value-key="value"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <UFormField label="เบอร์มือถือ" required :error="formErrors.phone">
            <UInput
              v-model="formState.phone"
              placeholder="เช่น 0812345678"
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
          :label="isEditing ? 'บันทึกการแก้ไข' : 'บันทึกอาจารย์'"
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
    title="ลบข้อมูลอาจารย์"
    :message="`คุณต้องการลบข้อมูลอาจารย์ ${deleteCount} รายการใช่หรือไม่?`"
    sub-message="การลบจะนำข้อมูลออกจากระบบอย่างถาวร หากอาจารย์มีประวัติการนิเทศแล้วแนะนำให้เปลี่ยนสถานะเป็นไม่ใช้งานแทน"
    icon="i-lucide-trash-2"
    icon-color="error"
    confirm-label="ลบข้อมูล"
    confirm-color="error"
    :loading="isDeleting"
    @confirm="confirmDelete"
  />

  <!-- Teacher Detail Modal -->
  <UModal
    v-model:open="isDetailOpen"
    :title="selectedTeacher ? `ข้อมูลอาจารย์: ${selectedTeacher.prefix}${selectedTeacher.firstName} ${selectedTeacher.lastName}` : 'รายละเอียดอาจารย์'"
    :description="selectedTeacher ? `รหัสอาจารย์: ${selectedTeacher.teacherId}` : ''"
  >
    <template #body>
      <div v-if="selectedTeacher" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-panel border border-divider p-4 bg-surface text-sm">
          <div>
            <span class="text-xs text-muted block">รหัสอาจารย์</span>
            <span class="font-semibold text-ink text-base">{{ selectedTeacher.teacherId }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">สถานะการใช้งาน</span>
            <UBadge
              :label="selectedTeacher.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'"
              :color="selectedTeacher.isActive ? 'success' : 'neutral'"
              variant="subtle"
              class="mt-1"
            />
          </div>

          <div>
            <span class="text-xs text-muted block">ชื่อ-นามสกุล</span>
            <span class="font-medium text-ink">{{ selectedTeacher.prefix }}{{ selectedTeacher.firstName }} {{ selectedTeacher.lastName }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">เพศ</span>
            <span class="text-ink">{{ selectedTeacher.gender }}</span>
          </div>

          <div class="sm:col-span-2">
            <span class="text-xs text-muted block">เบอร์มือถือ</span>
            <a
              v-if="selectedTeacher.phone"
              :href="`tel:${selectedTeacher.phone}`"
              class="font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-0.5"
            >
              <UIcon name="i-lucide-phone" class="size-4" />
              {{ selectedTeacher.phone }}
            </a>
            <span v-else class="text-muted italic">ไม่ได้ระบุ</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-between items-center">
        <UButton
          v-if="selectedTeacher"
          size="xl"
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="isDetailOpen = false; openEditModal(selectedTeacher)"
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
