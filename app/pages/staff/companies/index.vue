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
const pageSize = 10

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
  const start = (page.value - 1) * pageSize
  return filteredCompanies.value.slice(start, start + pageSize)
})

const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([id]) => Number(id)))

const selectedCount = computed(() => selectedIds.value.length)
const deleteCount = computed(() => pendingDeleteIds.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCompanies.value.length / pageSize)))
const hasFilters = computed(() => Boolean(searchQuery.value) || regionFilter.value !== 'all' || provinceFilter.value !== 'all' || statusFilter.value !== 'all')
const pageStart = computed(() => filteredCompanies.value.length ? (page.value - 1) * pageSize + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredCompanies.value.length))

watch([searchQuery, regionFilter, provinceFilter, statusFilter], () => {
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
      modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'เลือกทุกรายการในหน้านี้'
    }),
    cell: ({ row }) => h(UCheckbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'aria-label': `เลือกสถานประกอบการ ${row.original.name}`
    })
  },
  {
    accessorKey: 'name',
    header: 'ชื่อสถานประกอบการ',
    cell: ({ row }) => h('div', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'contactPerson',
    header: 'ผู้ติดต่อหลัก'
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
    header: 'จัดการ',
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
      <div class="flex flex-col gap-6">
        <!-- Control Row -->
        <div class="flex flex-col gap-3 rounded-lg sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <UInput
              v-model="searchQuery"
              class="min-w-0 flex-1"
              icon="i-lucide-search"
              placeholder="ค้นหาชื่อ, ผู้ติดต่อ, หรือที่อยู่"
              aria-label="ค้นหาสถานประกอบการ"
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
              v-model="regionFilter"
              :items="regionOptions"
              value-key="value"
              class="w-36"
              aria-label="กรองตามภูมิภาค"
            />
            <USelect
              v-model="provinceFilter"
              :items="provinceOptions"
              value-key="value"
              class="w-36"
              aria-label="กรองตามจังหวัด"
            />
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'ทุกสถานะ', value: 'all' },
                { label: 'ใช้งาน', value: 'active' },
                { label: 'ไม่ใช้งาน', value: 'inactive' }
              ]"
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
          title="ไม่สามารถเชื่อมต่อข้อมูลสถานประกอบการได้"
          :description="fetchError.message"
        />

        <!-- Data Table -->
        <div v-else class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable
            v-model:row-selection="rowSelection"
            :data="paginatedCompanies"
            :columns="columns"
            :loading="fetchStatus === 'pending'"
            :get-row-id="company => String(company.id)"
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

            <template #empty>
              <div class="py-12 text-center text-muted">
                <UIcon name="i-lucide-building-2" class="size-10 mx-auto mb-2 text-dimmed" />
                <p>ไม่พบข้อมูลสถานประกอบการ</p>
                <p class="text-xs text-muted mt-1">กดปุ่ม "เพิ่มสถานประกอบการ" เพื่อบันทึกข้อมูลสถานประกอบการใหม่</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination & Range Counter -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            <template v-if="filteredCompanies.length">
              แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredCompanies.length }} รายการ
              <template v-if="selectedCount"> · เลือก {{ selectedCount }} รายการ</template>
            </template>
            <template v-else>ไม่พบรายการ</template>
          </span>
          <UPagination
            v-if="filteredCompanies.length > pageSize"
            v-model:page="page"
            :total="filteredCompanies.length"
            :items-per-page="pageSize"
          />
        </div>
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
        <div class="rounded-lg border border-default p-4 bg-muted/10 space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-highlighted flex items-center gap-1.5">
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
              <span class="font-medium text-highlighted">{{ selectedCompany.name }}</span>
            </div>
            <div>
              <span class="text-xs text-muted block">ผู้ติดต่อหลัก</span>
              <span class="font-medium text-highlighted">{{ selectedCompany.contactPerson }}</span>
            </div>
            <div>
              <span class="text-xs text-muted block">เบอร์โทรศัพท์</span>
              <a
                v-if="selectedCompany.phone"
                :href="`tel:${selectedCompany.phone}`"
                class=" text-primary hover:underline inline-flex items-center gap-1"
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
        <div class="rounded-lg border border-default p-4 bg-muted/10 space-y-2 text-sm">
          <h3 class="font-semibold text-highlighted flex items-center gap-1.5">
            <UIcon name="i-lucide-map-pin" class="size-4 text-primary" />
            ที่อยู่และภูมิภาค
          </h3>
          <p class="text-highlighted leading-relaxed">
            {{ formatFullAddress(selectedCompany) }}
          </p>
          <div class="text-xs text-muted">
            ภูมิภาค: <span class="font-medium text-highlighted">{{ getRegionByProvince(selectedCompany.province) }}</span>
          </div>
        </div>

        <!-- Section: พิกัดและการเดินทาง -->
        <div class="rounded-lg border border-default p-4 bg-muted/10 space-y-2 text-sm">
          <h3 class="font-semibold text-highlighted flex items-center gap-1.5">
            <UIcon name="i-lucide-navigation" class="size-4 text-primary" />
            พิกัดและข้อมูลการเดินทาง
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span class="text-xs text-muted block">พิกัด GPS</span>
              <div v-if="selectedCompany.latitude != null && selectedCompany.longitude != null" class="flex items-center gap-2 mt-0.5">
                <span class=" text-xs text-primary font-medium">
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
              <span v-if="selectedCompany.travelNote" class="text-xs text-highlighted">{{ selectedCompany.travelNote }}</span>
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
          label="แก้ไขข้อมูล"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          :to="`/staff/companies/${selectedCompany.id}`"
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
