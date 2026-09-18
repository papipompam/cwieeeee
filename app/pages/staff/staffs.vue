<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

interface Staff {
  id: number
  staffId: string
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
const { data: staffs, status: fetchStatus, error: fetchError, refresh } = await useFetch<Staff[]>('/api/staffs')

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
  staffId: '',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  gender: 'ชาย',
  phone: '',
  isActive: true
})

const formErrors = reactive<Record<string, string>>({})

const prefixOptions = [
  { label: 'นาย', value: 'นาย' },
  { label: 'นางสาว', value: 'นางสาว' },
  { label: 'นาง', value: 'นาง' },
  { label: 'ดร.', value: 'ดร.' }
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

const filteredStaffs = computed(() => {
  const list = staffs.value ?? []
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((staff) => {
    const fullName = `${staff.prefix}${staff.firstName} ${staff.lastName}`
    const matchesSearch = !keyword || [
      staff.staffId,
      staff.firstName,
      staff.lastName,
      fullName,
      staff.phone
    ].join(' ').toLowerCase().includes(keyword)

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && staff.isActive)
      || (statusFilter.value === 'inactive' && !staff.isActive)

    return matchesSearch && matchesStatus
  })
})

const paginatedStaffs = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredStaffs.value.slice(start, start + pageSize)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredStaffs.value.length / pageSize)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredStaffs.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredStaffs.value.length))

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
  notify.info('อัปเดตข้อมูลเจ้าหน้าที่แล้ว')
}

// Modal open handlers
const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.staffId = ''
  formState.prefix = 'นาย'
  formState.firstName = ''
  formState.lastName = ''
  formState.gender = 'ชาย'
  formState.phone = ''
  formState.isActive = true
  isFormOpen.value = true
}

// Detail Modal state
const isDetailOpen = ref(false)
const selectedStaff = ref<Staff | null>(null)

const openDetail = (staff: Staff) => {
  selectedStaff.value = staff
  isDetailOpen.value = true
}

const openEditModal = (staff: Staff) => {
  isEditing.value = true
  editingId.value = staff.id
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.staffId = staff.staffId
  formState.prefix = staff.prefix
  formState.firstName = staff.firstName
  formState.lastName = staff.lastName
  formState.gender = staff.gender
  formState.phone = staff.phone
  formState.isActive = staff.isActive

  isFormOpen.value = true
}

const validateForm = () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  let isValid = true

  if (!formState.staffId.trim()) {
    formErrors.staffId = 'กรุณากรอกรหัสเจ้าหน้าที่'
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
      await $fetch(`/api/staffs/${editingId.value}`, {
        method: 'PUT',
        body: formState
      })
      notify.updated(`ข้อมูลเจ้าหน้าที่ ${formState.staffId}`)
    } else {
      await $fetch('/api/staffs', {
        method: 'POST',
        body: formState
      })
      notify.created(`เจ้าหน้าที่ ${formState.staffId}`)
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
const openDelete = (staff: Staff) => {
  pendingDeleteIds.value = [staff.id]
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
      await $fetch(`/api/staffs/${id}`, {
        method: 'DELETE'
      })
    }
    notify.deleted(`${pendingDeleteIds.value.length} รายการเจ้าหน้าที่`)
    rowSelection.value = {}
    pendingDeleteIds.value = []
    isDeleteOpen.value = false
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'ไม่สามารถลบข้อมูลเจ้าหน้าที่ได้'
    notify.error(msg)
  } finally {
    isDeleting.value = false
    await refresh()
  }
}

const columns: TableColumn<Staff>[] = [
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
      'aria-label': `เลือกเจ้าหน้าที่รหัส ${row.original.staffId}`
    })
  },
  {
    accessorKey: 'staffId',
    header: 'รหัสเจ้าหน้าที่',
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
    meta: { class: { th: 'w-48 text-end', td: 'w-48 text-end' } }
  }
]
</script>

<template>
  <UDashboardPanel id="staff-staffs">
    <template #header>
      <UDashboardNavbar title="จัดการข้อมูลเจ้าหน้าที่">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มเจ้าหน้าที่"
            icon="i-lucide-plus"
            color="primary"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
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
              placeholder="ค้นหารหัสเจ้าหน้าที่ ชื่อ-สกุล หรือเบอร์โทร"
              aria-label="ค้นหาเจ้าหน้าที่"
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
          title="ไม่สามารถเชื่อมต่อข้อมูลเจ้าหน้าที่ได้"
          :description="fetchError.message"
        />

        <!-- Data Table -->
        <div v-else class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable
            v-model:row-selection="rowSelection"
            :data="paginatedStaffs"
            :columns="columns"
            :loading="fetchStatus === 'pending'"
            :get-row-id="staff => String(staff.id)"
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
                <UIcon name="i-lucide-id-card" class="size-10 mx-auto mb-2 text-dimmed" />
                <p>ไม่พบข้อมูลเจ้าหน้าที่</p>
                <p class="text-xs text-muted mt-1">กดปุ่ม "เพิ่มเจ้าหน้าที่" เพื่อบันทึกข้อมูลเจ้าหน้าที่เข้าสู่ระบบ</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination & Range Counter -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            <template v-if="filteredStaffs.length">
              แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredStaffs.length }} รายการ
              <template v-if="selectedCount"> · เลือก {{ selectedCount }} รายการ</template>
            </template>
            <template v-else>ไม่พบรายการ</template>
          </span>
          <UPagination
            v-if="filteredStaffs.length > pageSize"
            v-model:page="page"
            :total="filteredStaffs.length"
            :items-per-page="pageSize"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create / Edit Modal Form -->
  <UModal
    v-model:open="isFormOpen"
    :title="isEditing ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มข้อมูลเจ้าหน้าที่ใหม่'"
    :description="isEditing ? 'ปรับปรุงข้อมูลเจ้าหน้าที่และสถานะการปฏิบัติงาน' : 'กรอกข้อมูลเจ้าหน้าที่เพื่อลงทะเบียนเข้าสู่ระบบงานสหกิจศึกษา'"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submitForm">
        <UFormField label="รหัสเจ้าหน้าที่" required :error="formErrors.staffId">
          <UInput
            v-model="formState.staffId"
            placeholder="เช่น S001"
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
          :label="isEditing ? 'บันทึกการแก้ไข' : 'บันทึกเจ้าหน้าที่'"
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
    title="ลบข้อมูลเจ้าหน้าที่"
    :message="`คุณต้องการลบข้อมูลเจ้าหน้าที่ ${deleteCount} รายการใช่หรือไม่?`"
    sub-message="การลบจะนำข้อมูลออกจากระบบอย่างถาวร หากเจ้าหน้าที่มีประวัติการทำงานแล้วแนะนำให้เปลี่ยนสถานะเป็นไม่ใช้งานแทน"
    icon="i-lucide-trash-2"
    icon-color="error"
    confirm-label="ลบข้อมูล"
    confirm-color="error"
    :loading="isDeleting"
    @confirm="confirmDelete"
  />

  <!-- Staff Detail Modal -->
  <UModal
    v-model:open="isDetailOpen"
    :title="selectedStaff ? `ข้อมูลเจ้าหน้าที่: ${selectedStaff.prefix}${selectedStaff.firstName} ${selectedStaff.lastName}` : 'รายละเอียดเจ้าหน้าที่'"
    :description="selectedStaff ? `รหัสเจ้าหน้าที่: ${selectedStaff.staffId}` : ''"
  >
    <template #body>
      <div v-if="selectedStaff" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-default p-4 bg-muted/10 text-sm">
          <div>
            <span class="text-xs text-muted block">รหัสเจ้าหน้าที่</span>
            <span class=" font-semibold text-highlighted text-base">{{ selectedStaff.staffId }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">สถานะการใช้งาน</span>
            <UBadge
              :label="selectedStaff.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'"
              :color="selectedStaff.isActive ? 'success' : 'neutral'"
              variant="subtle"
              class="mt-1"
            />
          </div>

          <div>
            <span class="text-xs text-muted block">ชื่อ-นามสกุล</span>
            <span class="font-medium text-highlighted">{{ selectedStaff.prefix }}{{ selectedStaff.firstName }} {{ selectedStaff.lastName }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">เพศ</span>
            <span>{{ selectedStaff.gender }}</span>
          </div>

          <div class="sm:col-span-2">
            <span class="text-xs text-muted block">เบอร์มือถือ</span>
            <a
              v-if="selectedStaff.phone"
              :href="`tel:${selectedStaff.phone}`"
              class=" font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-0.5"
            >
              <UIcon name="i-lucide-phone" class="size-4" />
              {{ selectedStaff.phone }}
            </a>
            <span v-else class="text-muted italic">ไม่ได้ระบุ</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-between items-center">
        <UButton
          v-if="selectedStaff"
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="isDetailOpen = false; openEditModal(selectedStaff)"
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
