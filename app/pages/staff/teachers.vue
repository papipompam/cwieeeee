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
const pageSize = 10

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
  const start = (page.value - 1) * pageSize
  return filteredTeachers.value.slice(start, start + pageSize)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTeachers.value.length / pageSize)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredTeachers.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredTeachers.value.length))

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
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => h(UCheckbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'aria-label': `เลือกอาจารย์รหัส ${row.original.teacherId}`
    })
  },
  {
    accessorKey: 'teacherId',
    header: 'รหัสอาจารย์',
    meta: { class: { th: 'w-32 ', td: 'w-32  font-medium' } }
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
    meta: { class: { th: 'w-36 ', td: 'w-36 ' } }
  },
  {
    accessorKey: 'isActive',
    header: 'สถานะ',
    meta: { class: { th: 'w-28', td: 'w-28' } }
  },
  {
    id: 'actions',
    header: 'จัดการ',
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
      <div class="flex flex-col gap-6">
        <!-- Control Row -->
        <div class="flex flex-col gap-3 rounded-lg sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <UInput
              v-model="searchQuery"
              class="min-w-0 flex-1"
              icon="i-lucide-search"
              placeholder="ค้นหารหัสอาจารย์ ชื่อ-สกุล หรือเบอร์โทร"
              aria-label="ค้นหาอาจารย์"
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
              class="w-32"
              aria-label="กรองตามสถานะการใช้งาน"
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
          title="ไม่สามารถเชื่อมต่อข้อมูลอาจารย์ได้"
          :description="fetchError.message"
        />

        <!-- Data Table -->
        <div v-else class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable
            v-model:row-selection="rowSelection"
            :data="paginatedTeachers"
            :columns="columns"
            :loading="fetchStatus === 'pending'"
            :get-row-id="teacher => String(teacher.id)"
            :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }"
          >
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

            <template #empty>
              <div class="py-12 text-center text-muted">
                <UIcon name="i-lucide-user-round-check" class="size-10 mx-auto mb-2 text-dimmed" />
                <p>ไม่พบข้อมูลอาจารย์</p>
                <p class="text-xs text-muted mt-1">กดปุ่ม "เพิ่มอาจารย์" เพื่อบันทึกข้อมูลอาจารย์นิเทศเข้าสู่ระบบ</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination & Range Counter -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            <template v-if="filteredTeachers.length">
              แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredTeachers.length }} รายการ
              <template v-if="selectedCount"> · เลือก {{ selectedCount }} รายการ</template>
            </template>
            <template v-else>ไม่พบรายการ</template>
          </span>
          <UPagination
            v-if="filteredTeachers.length > pageSize"
            v-model:page="page"
            :total="filteredTeachers.length"
            :items-per-page="pageSize"
          />
        </div>
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
            class="w-full "
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="คำนำหน้า" required :error="formErrors.prefix">
            <USelect
              v-model="formState.prefix"
              :items="prefixOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ชื่อ" required :error="formErrors.firstName">
            <UInput
              v-model="formState.firstName"
              placeholder="ชื่อจริง"
              class="w-full"
            />
          </UFormField>

          <UFormField label="นามสกุล" required :error="formErrors.lastName">
            <UInput
              v-model="formState.lastName"
              placeholder="นามสกุล"
              class="w-full"
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
            />
          </UFormField>

          <UFormField label="เบอร์มือถือ" required :error="formErrors.phone">
            <UInput
              v-model="formState.phone"
              placeholder="เช่น 0812345678"
              class="w-full "
            />
          </UFormField>
        </div>

        <div v-if="isEditing" class="border-t border-default pt-3">
          <UFormField label="สถานะการใช้งาน">
            <div class="flex items-center gap-2 pt-1">
              <USwitch
                v-model="formState.isActive"
              />
              <span class="text-sm font-medium">
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
          label="ยกเลิก"
          color="neutral"
          variant="outline"
          :disabled="isSubmitting"
          @click="isFormOpen = false"
        />
        <UButton
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-default p-4 bg-muted/10 text-sm">
          <div>
            <span class="text-xs text-muted block">รหัสอาจารย์</span>
            <span class=" font-semibold text-highlighted text-base">{{ selectedTeacher.teacherId }}</span>
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
            <span class="font-medium text-highlighted">{{ selectedTeacher.prefix }}{{ selectedTeacher.firstName }} {{ selectedTeacher.lastName }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">เพศ</span>
            <span>{{ selectedTeacher.gender }}</span>
          </div>

          <div class="sm:col-span-2">
            <span class="text-xs text-muted block">เบอร์มือถือ</span>
            <a
              v-if="selectedTeacher.phone"
              :href="`tel:${selectedTeacher.phone}`"
              class=" font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-0.5"
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
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="isDetailOpen = false; openEditModal(selectedTeacher)"
        />
        <div class="ml-auto">
          <UButton
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
