<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { REGIONS, PROVINCES, REGION_PROVINCES, getRegionByProvince, type Region } from '~/utils/geo'

definePageMeta({
  layout: 'dashboard'
})

interface Company {
  id: number
  name: string
  contactPerson: string
  phone: string | null
  email: string | null
  addressNo: string
  moo: string | null
  soi: string | null
  street: string | null
  subdistrict: string
  district: string
  province: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  travelNote: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const UCheckbox = resolveComponent('UCheckbox')
const notify = useNotify()

// Data fetching from API
const { data: companies, status: fetchStatus, error: fetchError, refresh } = await useFetch<Company[]>('/api/companies')

const searchQuery = ref('')
const regionFilter = ref<string>('all')
const provinceFilter = ref<string>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const rowSelection = ref<Record<string, boolean>>({})
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

// Delete modal state
const isDeleteOpen = ref(false)
const pendingDeleteIds = ref<number[]>([])
const isDeleting = ref(false)

const regionOptions = [
  { label: 'ทุกภูมิภาค', value: 'all' },
  ...REGIONS.map(r => ({ label: r, value: r }))
]

// Dynamic provinces list based on selected region
const provinceOptions = computed(() => {
  if (regionFilter.value !== 'all' && regionFilter.value in REGION_PROVINCES) {
    const list = REGION_PROVINCES[regionFilter.value as Region]
    return [
      { label: 'ทุกจังหวัดในภาค', value: 'all' },
      ...list.map(p => ({ label: p, value: p }))
    ]
  }
  return [
    { label: 'ทุกจังหวัด', value: 'all' },
    ...PROVINCES.map(p => ({ label: p, value: p }))
  ]
})

// Reset province filter when region changes if not in new region
watch(regionFilter, (newRegion) => {
  if (newRegion !== 'all' && provinceFilter.value !== 'all') {
    const validProvinces = REGION_PROVINCES[newRegion as Region] ?? []
    if (!validProvinces.includes(provinceFilter.value)) {
      provinceFilter.value = 'all'
    }
  }
})

const filteredCompanies = computed(() => {
  const list = companies.value ?? []
  const keyword = searchQuery.value.trim().toLowerCase()

  return list.filter((company) => {
    const region = getRegionByProvince(company.province)
    const matchesSearch = !keyword || [
      company.name,
      company.contactPerson,
      company.district,
      company.province,
      company.phone || '',
      company.email || ''
    ].join(' ').toLowerCase().includes(keyword)

    const matchesRegion = regionFilter.value === 'all' || region === regionFilter.value
    const matchesProvince = provinceFilter.value === 'all' || company.province === provinceFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && company.isActive)
      || (statusFilter.value === 'inactive' && !company.isActive)

    return matchesSearch && matchesRegion && matchesProvince && matchesStatus
  })
})

const paginatedCompanies = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCompanies.value.slice(start, start + pageSize.value)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCompanies.value.length / pageSize.value)))
const hasFilters = computed(() => Boolean(searchQuery.value) || regionFilter.value !== 'all' || provinceFilter.value !== 'all' || statusFilter.value !== 'all')
const pageStart = computed(() => filteredCompanies.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredCompanies.value.length))

watch([searchQuery, regionFilter, provinceFilter, statusFilter, pageSize], () => {
  page.value = 1
  rowSelection.value = {}
})

watch(totalPages, () => {
  page.value = Math.min(page.value, totalPages.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  regionFilter.value = 'all'
  provinceFilter.value = 'all'
  statusFilter.value = 'all'
}

const handleRefresh = async () => {
  await refresh()
  rowSelection.value = {}
  notify.info('อัปเดตข้อมูลสถานประกอบการแล้ว')
}

// Delete handlers
const openDelete = (company: Company) => {
  pendingDeleteIds.value = [company.id]
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
      await $fetch(`/api/companies/${id}`, {
        method: 'DELETE'
      })
    }
    notify.deleted(`${pendingDeleteIds.value.length} สถานประกอบการ`)
    rowSelection.value = {}
    pendingDeleteIds.value = []
    isDeleteOpen.value = false
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'ไม่สามารถลบข้อมูลสถานประกอบการได้'
    notify.error(msg)
  } finally {
    isDeleting.value = false
    await refresh()
  }
}

// Detail Modal state
const isDetailOpen = ref(false)
const selectedCompany = ref<Company | null>(null)

const openDetail = (company: Company) => {
  selectedCompany.value = company
  isDetailOpen.value = true
}

const formatFullAddress = (c: Company) => {
  const parts = [
    `เลขที่ ${c.addressNo}`,
    c.moo ? `หมู่ ${c.moo}` : '',
    c.soi ? `ซอย ${c.soi}` : '',
    c.street ? `ถนน ${c.street}` : '',
    `ต./แขวง ${c.subdistrict}`,
    `อ./เขต ${c.district}`,
    `จ.${c.province}`,
    c.postalCode
  ].filter(Boolean)
  return parts.join(' ')
}

const columns: TableColumn<Company>[] = [
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
      'aria-label': `เลือกสถานประกอบการ ${row.original.name}`
    })
  },
  {
    accessorKey: 'name',
    header: 'ชื่อสถานประกอบการ',
    cell: ({ row }) => h('div', { class: 'font-semibold text-ink' }, row.original.name)
  },
  {
    id: 'location',
    header: 'จังหวัด (ภูมิภาค)',
    cell: ({ row }) => `${row.original.province} (${getRegionByProvince(row.original.province)})`
  },
  {
    accessorKey: 'phone',
    header: 'เบอร์โทรศัพท์',
    meta: { class: { th: 'w-36', td: 'w-36' } },
    cell: ({ row }) => row.original.phone || '-'
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
  <UDashboardPanel id="staff-companies">
    <template #header>
      <AppDashboardNavbar title="จัดการข้อมูลสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            size="xl"
            label="เพิ่มสถานประกอบการ"
            icon="i-lucide-plus"
            color="primary"
            to="/staff/companies/new"
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
                <h3 class="text-lg font-bold text-ink">ข้อมูลสถานประกอบการ</h3>
                <p class="mt-1 text-sm leading-6 text-muted">ค้นหา เพิ่ม แก้ไข และจัดการข้อมูลสถานที่ฝึกงานสหกิจศึกษา</p>
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหาสถานประกอบการ" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหาชื่อ, ผู้ติดต่อ, หรือที่อยู่"
                  aria-label="ค้นหาสถานประกอบการ"
                />
              </UFormField>

              <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
                <div class="w-full sm:w-36">
                  <USelect
                    v-model="regionFilter"
                    :items="regionOptions"
                    value-key="value"
                    class="w-full"
                    size="xl"
                    placeholder="ภูมิภาค"
                    aria-label="กรองตามภูมิภาค"
                  />
                </div>
                <div class="w-full sm:w-36">
                  <USelect
                    v-model="provinceFilter"
                    :items="provinceOptions"
                    value-key="value"
                    class="w-full"
                    size="xl"
                    placeholder="จังหวัด"
                    aria-label="กรองตามจังหวัด"
                  />
                </div>
                <div class="w-full sm:w-36">
                  <USelect
                    v-model="statusFilter"
                    :items="[
                      { label: 'ทุกสถานะ', value: 'all' },
                      { label: 'ใช้งาน', value: 'active' },
                      { label: 'ไม่ใช้งาน', value: 'inactive' }
                    ]"
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
              <span v-if="regionFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ regionFilter }}
              </span>
              <span v-if="provinceFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ provinceFilter }}
              </span>
              <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ statusFilter === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน' }}
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
              title="ไม่สามารถเชื่อมต่อข้อมูลสถานประกอบการได้"
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
          <div v-else-if="!paginatedCompanies.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-inbox"
              class="min-h-64"
              :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสถานประกอบการ'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'กดปุ่ม &quot;เพิ่มสถานประกอบการ&quot; เพื่อบันทึกข้อมูลเข้าสู่ระบบ'"
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
                  to="/staff/companies/new"
                >
                  เพิ่มสถานประกอบการ
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Data Table -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="rowSelection"
                :data="paginatedCompanies"
                :columns="columns"
                :get-row-id="company => String(company.id)"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-200' }"
              >
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
                      :to="`/staff/companies/${row.original.id}`"
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
                  แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredCompanies.length }} รายการ
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
                :total="filteredCompanies.length"
                :items-per-page="pageSize"
                size="md"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Delete Confirmation Modal -->
  <UIConfirmModal
    v-model:open="isDeleteOpen"
    title="ลบสถานประกอบการ"
    :message="`คุณต้องการลบสถานประกอบการ ${deleteCount} รายการใช่หรือไม่?`"
    sub-message="การลบจะนำข้อมูลออกจากระบบอย่างถาวร หากมีการฝึกงานแล้วแนะนำให้เปลี่ยนสถานะเป็นไม่ใช้งานแทน"
    icon="i-lucide-trash-2"
    icon-color="error"
    confirm-label="ลบข้อมูล"
    confirm-color="error"
    :loading="isDeleting"
    @confirm="confirmDelete"
  />

  <!-- Company Detail Modal -->
  <UModal
    v-model:open="isDetailOpen"
    :title="selectedCompany ? selectedCompany.name : 'รายละเอียดสถานประกอบการ'"
    :description="selectedCompany ? `ผู้ติดต่อหลัก: ${selectedCompany.contactPerson}` : ''"
  >
    <template #body>
      <div v-if="selectedCompany" class="space-y-4">
        <!-- Section: ข้อมูลทั่วไป -->
        <div class="rounded-panel border border-divider p-4 bg-surface space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink flex items-center gap-1.5">
              <UIcon name="i-lucide-building-2" class="size-4 text-primary" />
              ข้อมูลสถานประกอบการ
            </h3>
            <UBadge
              :label="selectedCompany.isActive ? 'เปิดใช้งาน' : 'ไม่ใช้งาน'"
              :color="selectedCompany.isActive ? 'success' : 'neutral'"
              variant="subtle"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <span class="text-xs text-muted block">ชื่อสถานประกอบการ</span>
              <span class="font-medium text-ink">{{ selectedCompany.name }}</span>
            </div>
            <div>
              <span class="text-xs text-muted block">ผู้ติดต่อหลัก</span>
              <span class="font-medium text-ink">{{ selectedCompany.contactPerson }}</span>
            </div>
            <div>
              <span class="text-xs text-muted block">เบอร์โทรศัพท์</span>
              <a
                v-if="selectedCompany.phone"
                :href="`tel:${selectedCompany.phone}`"
                class="text-primary hover:underline inline-flex items-center gap-1"
              >
                <UIcon name="i-lucide-phone" class="size-3.5" />
                {{ selectedCompany.phone }}
              </a>
              <span v-else class="text-muted italic">ไม่ได้ระบุ</span>
            </div>
            <div>
              <span class="text-xs text-muted block">อีเมลติดต่อ</span>
              <a
                v-if="selectedCompany.email"
                :href="`mailto:${selectedCompany.email}`"
                class="text-primary hover:underline inline-flex items-center gap-1"
              >
                <UIcon name="i-lucide-mail" class="size-3.5" />
                {{ selectedCompany.email }}
              </a>
              <span v-else class="text-muted italic">ไม่ได้ระบุ</span>
            </div>
          </div>
        </div>

        <!-- Section: ที่ตั้งและที่อยู่ -->
        <div class="rounded-panel border border-divider p-4 bg-surface space-y-2 text-sm">
          <h3 class="font-semibold text-ink flex items-center gap-1.5">
            <UIcon name="i-lucide-map-pin" class="size-4 text-primary" />
            ที่อยู่และภูมิภาค
          </h3>
          <p class="text-ink leading-relaxed">
            {{ formatFullAddress(selectedCompany) }}
          </p>
          <div class="text-xs text-muted">
            ภูมิภาค: <span class="font-medium text-ink">{{ getRegionByProvince(selectedCompany.province) }}</span>
          </div>
        </div>

        <!-- Section: พิกัดและการเดินทาง -->
        <div class="rounded-panel border border-divider p-4 bg-surface space-y-2 text-sm">
          <h3 class="font-semibold text-ink flex items-center gap-1.5">
            <UIcon name="i-lucide-navigation" class="size-4 text-primary" />
            พิกัดและข้อมูลการเดินทาง
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span class="text-xs text-muted block">พิกัด GPS</span>
              <div v-if="selectedCompany.latitude != null && selectedCompany.longitude != null" class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-primary font-medium">
                  {{ selectedCompany.latitude.toFixed(6) }}, {{ selectedCompany.longitude.toFixed(6) }}
                </span>
                <a
                  :href="`https://www.google.com/maps?q=${selectedCompany.latitude},${selectedCompany.longitude}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <UIcon name="i-lucide-external-link" class="size-3" />
                  เปิดในแผนที่
                </a>
              </div>
              <span v-else class="text-muted italic text-xs">ไม่ได้ระบุพิกัด</span>
            </div>

            <div>
              <span class="text-xs text-muted block">หมายเหตุการเดินทาง</span>
              <span v-if="selectedCompany.travelNote" class="text-xs text-ink">{{ selectedCompany.travelNote }}</span>
              <span v-else class="text-muted italic text-xs">ไม่ได้ระบุ</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-between items-center">
        <UButton
          v-if="selectedCompany"
          size="xl"
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          :to="`/staff/companies/${selectedCompany.id}`"
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
