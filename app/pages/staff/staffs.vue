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
  staffId: '',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
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
  const start = (page.value - 1) * pageSize.value
  return filteredStaffs.value.slice(start, start + pageSize.value)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredStaffs.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all')
const pageStart = computed(() => filteredStaffs.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredStaffs.value.length))

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
  formState.phone = ''
  formState.isActive = true
  isFormOpen.value = true
}

// Detail Modal state
const isDetailOpen = ref(false)
const selectedStaff = ref<Staff | null>(null)
const isPasswordOpen = ref(false)
const passwordAccount = ref<{ id: number, loginId: string, name: string } | null>(null)

const openDetail = (staff: Staff) => {
  selectedStaff.value = staff
  isDetailOpen.value = true
}

const openPasswordModal = (staff: Staff) => {
  passwordAccount.value = {
    id: staff.id,
    loginId: staff.staffId,
    name: `${staff.prefix}${staff.firstName} ${staff.lastName}`
  }
  isPasswordOpen.value = true
}

const openEditModal = (staff: Staff) => {
  isEditing.value = true
  editingId.value = staff.id
  Object.keys(formErrors).forEach(k => delete formErrors[k])

  formState.staffId = staff.staffId
  formState.prefix = staff.prefix
  formState.firstName = staff.firstName
  formState.lastName = staff.lastName
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
      size: 'lg',
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => h(UCheckbox, {
      size: 'lg',
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'aria-label': `เลือกเจ้าหน้าที่รหัส ${row.original.staffId}`
    })
  },
  {
    accessorKey: 'staffId',
    header: 'รหัสเจ้าหน้าที่',
    meta: { class: { th: 'w-36', td: 'w-36 font-semibold' } }
  },
  {
    id: 'fullName',
    header: 'ชื่อ-สกุล',
    cell: ({ row }) => `${row.original.prefix}${row.original.firstName} ${row.original.lastName}`
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
  <UDashboardPanel id="staff-staffs">
    <template #header>
      <AppDashboardNavbar title="จัดการข้อมูลเจ้าหน้าที่">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            size="xl"
            label="เพิ่มเจ้าหน้าที่"
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
                <h3 class="text-lg font-bold text-ink">ข้อมูลเจ้าหน้าที่</h3>
                <p class="mt-1 text-sm leading-6 text-muted">ค้นหา เพิ่ม แก้ไข และจัดการสิทธิ์บัญชีเจ้าหน้าที่</p>
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหาเจ้าหน้าที่" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหารหัสเจ้าหน้าที่ หรือชื่อ-สกุล"
                  aria-label="ค้นหาเจ้าหน้าที่"
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
              title="ไม่สามารถเชื่อมต่อข้อมูลเจ้าหน้าที่ได้"
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
          <div v-else-if="!paginatedStaffs.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-inbox"
              class="min-h-64"
              :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลเจ้าหน้าที่'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'กดปุ่ม &quot;เพิ่มเจ้าหน้าที่&quot; เพื่อบันทึกข้อมูลเข้าสู่ระบบ'"
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
                  เพิ่มเจ้าหน้าที่
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Data Table -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="rowSelection"
                :data="paginatedStaffs"
                :columns="columns"
                :get-row-id="staff => String(staff.id)"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-200' }"
              >
                <template #fullName-cell="{ row }">
                  <p class="font-semibold text-ink">{{ row.original.prefix }}{{ row.original.firstName }} {{ row.original.lastName }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.original.staffId }}</p>
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
                  แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredStaffs.length }} รายการ
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
                :total="filteredStaffs.length"
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
    :title="isEditing ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มข้อมูลเจ้าหน้าที่ใหม่'"
    :description="isEditing ? 'ปรับปรุงข้อมูลเจ้าหน้าที่และสถานะการปฏิบัติงาน' : 'กรอกข้อมูลเจ้าหน้าที่เพื่อลงทะเบียนเข้าสู่ระบบงานสหกิจศึกษา'"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submitForm">
        <UFormField label="รหัสเจ้าหน้าที่" required :error="formErrors.staffId">
          <UInput
            v-model="formState.staffId"
            placeholder="เช่น S001"
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

        <UFormField label="เบอร์มือถือ" required :error="formErrors.phone">
          <UInput
            v-model="formState.phone"
            placeholder="เช่น 0812345678"
            class="w-full"
            size="xl"
          />
        </UFormField>

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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-panel border border-divider p-4 bg-surface text-sm">
          <div>
            <span class="text-xs text-muted block">รหัสเจ้าหน้าที่</span>
            <span class="font-semibold text-ink text-base">{{ selectedStaff.staffId }}</span>
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
            <span class="font-medium text-ink">{{ selectedStaff.prefix }}{{ selectedStaff.firstName }} {{ selectedStaff.lastName }}</span>
          </div>

          <div>
            <span class="text-xs text-muted block">เบอร์มือถือ</span>
            <a
              v-if="selectedStaff.phone"
              :href="`tel:${selectedStaff.phone}`"
              class="font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-0.5"
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
          size="xl"
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="isDetailOpen = false; openEditModal(selectedStaff)"
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
