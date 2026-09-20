<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface Application {
  id: number
  status: string
  applicationPosition: string | null
  appliedAt: string
  updatedAt: string
  company: {
    id: number
    name: string
    province: string
  }
  cooperativeRequest?: {
    id: number
    status: string
  } | null
}

const notify = useNotify()

const { data: contextData } = await useFetch<any>('/api/student/context')
const { data: rawApplications, status, error, refresh } = await useFetch<Application[]>('/api/student/applications')

// Filters
const search = ref('')
const statusFilter = ref('ALL')
const provinceFilter = ref('ALL')
const page = ref(1)
const pageSize = ref(10)

const availableProvinces = computed(() => {
  const set = new Set<string>()
  for (const app of rawApplications.value || []) {
    if (app.company?.province) set.add(app.company.province)
  }
  return Array.from(set).sort()
})

const filteredApplications = computed(() => {
  let list = rawApplications.value || []
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(a =>
      a.company?.name.toLowerCase().includes(q) ||
      (a.applicationPosition && a.applicationPosition.toLowerCase().includes(q))
    )
  }
  if (statusFilter.value !== 'ALL') {
    list = list.filter(a => a.status === statusFilter.value)
  }
  if (provinceFilter.value !== 'ALL') {
    list = list.filter(a => a.company?.province === provinceFilter.value)
  }
  return list
})

const hasActiveFilter = computed(() => {
  return Boolean(search.value.trim() || statusFilter.value !== 'ALL' || provinceFilter.value !== 'ALL')
})

const clearFilters = () => {
  search.value = ''
  statusFilter.value = 'ALL'
  provinceFilter.value = 'ALL'
  page.value = 1
}

watch([search, statusFilter, provinceFilter], () => {
  page.value = 1
})

const paginatedApplications = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredApplications.value.slice(start, start + pageSize.value)
})

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const getStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งข้อมูลการสมัครแล้ว', color: 'info' as const }
    case 'AWAITING_RESPONSE':
      return { label: 'รอผลตอบกลับ', color: 'warning' as const }
    case 'INTERVIEW':
      return { label: 'รอสัมภาษณ์', color: 'info' as const }
    case 'ACCEPTED':
      return { label: 'บริษัทตอบรับแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'บริษัทปฏิเสธ', color: 'error' as const }
    case 'WITHDRAWN':
      return { label: 'ยกเลิกการสมัคร', color: 'neutral' as const }
    case 'CONFIRMED':
      return { label: 'ยืนยันและส่งคำร้องแล้ว', color: 'success' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const columns: TableColumn<Application>[] = [
  { accessorKey: 'id', header: 'เลขที่' },
  { accessorKey: 'company.name', header: 'สถานประกอบการ' },
  { accessorKey: 'company.province', header: 'จังหวัด' },
  { accessorKey: 'applicationPosition', header: 'ตำแหน่ง' },
  { accessorKey: 'appliedAt', header: 'วันที่สมัคร' },
  { accessorKey: 'status', header: 'สถานะ' },
  { accessorKey: 'updatedAt', header: 'อัปเดตล่าสุด' },
  { id: 'actions', header: 'จัดการ' }
]

// Delete modal state
const isDeleteModalOpen = ref(false)
const appToDelete = ref<Application | null>(null)
const isDeleting = ref(false)

const openDeleteModal = (app: Application) => {
  appToDelete.value = app
  isDeleteModalOpen.value = true
}

const handleDeleteConfirm = async () => {
  if (!appToDelete.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/student/applications/${appToDelete.value.id}`, { method: 'DELETE' })
    notify.success('ลบรายการสมัครเรียบร้อยแล้ว')
    isDeleteModalOpen.value = false
    appToDelete.value = null
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถลบรายการได้')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="student-applications-page">
    <template #header>
      <AppDashboardNavbar title="การสมัครสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AppNotificationBell />
          <UButton
            v-if="contextData?.canApply"
            color="primary"
            icon="i-lucide-plus"
            label="เพิ่มการสมัคร"
            to="/student/applications/new"
          />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 pb-8">
        <section class="overflow-hidden rounded-xl border border-default bg-default shadow-xs" aria-labelledby="applications-heading">
          <div class="border-b border-default p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 id="applications-heading" class="text-lg font-bold text-highlighted">รายการสมัครสถานประกอบการ</h2>
                <p class="mt-1 text-sm leading-6 text-muted">ติดตามบริษัทที่สมัคร อัปเดตผลตอบกลับ และเลือกสถานที่ฝึกงาน</p>
              </div>
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-briefcase-business" class="size-5" />
              </span>
            </div>

        <!-- Control Row -->
        <div class="mt-5 flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="ค้นหาสถานประกอบการ หรือตำแหน่ง..."
            class="w-full lg:max-w-sm"
          />

          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'ทุกสถานะ', value: 'ALL' },
                { label: 'ส่งข้อมูลการสมัครแล้ว', value: 'SUBMITTED' },
                { label: 'รอผลตอบกลับ', value: 'AWAITING_RESPONSE' },
                { label: 'รอสัมภาษณ์', value: 'INTERVIEW' },
                { label: 'บริษัทตอบรับแล้ว', value: 'ACCEPTED' },
                { label: 'บริษัทปฏิเสธ', value: 'REJECTED' },
                { label: 'ยกเลิกการสมัคร', value: 'WITHDRAWN' },
                { label: 'ยืนยันและส่งคำร้องแล้ว', value: 'CONFIRMED' }
              ]"
              class="w-full sm:w-52"
            />
            <USelect
              v-if="availableProvinces.length > 0"
              v-model="provinceFilter"
              :items="[
                { label: 'ทุกจังหวัด', value: 'ALL' },
                ...availableProvinces.map(p => ({ label: p, value: p }))
              ]"
              class="w-full sm:w-40"
            />
            <UButton
              v-if="hasActiveFilter"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              label="ล้างตัวกรอง"
              size="sm"
              @click="clearFilters"
            />
            <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          </div>
        </div>
          </div>

        <!-- Reason Banner if cannot apply -->
        <div v-if="contextData && !contextData.canApply && contextData.reason" class="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-elevated px-3.5 py-2 text-xs text-muted sm:mx-6">
          <UIcon name="i-lucide-info" class="size-4 text-primary shrink-0" />
          <span>{{ contextData.reason }}</span>
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดรายการสมัครได้"
          :description="error.message"
          :actions="[{ label: 'ลองใหม่', color: 'error', variant: 'subtle', onClick: () => refresh() }]"
        />

        <!-- Table -->
        <div class="mt-4 overflow-hidden border-t border-default">
          <UTable
            :columns="columns"
            :data="paginatedApplications"
            :loading="status === 'pending'"
            class="min-w-full overflow-x-auto"
          >
            <!-- ID Column -->
            <template #id-cell="{ row }">
              <span class=" text-xs text-muted">#{{ row.original.id }}</span>
            </template>

            <!-- Company Name -->
            <template #company.name-cell="{ row }">
              <NuxtLink
                :to="`/student/applications/${row.original.id}`"
                class="font-medium text-highlighted hover:text-primary transition-colors text-sm"
              >
                {{ row.original.company.name }}
              </NuxtLink>
            </template>

            <!-- Province -->
            <template #company.province-cell="{ row }">
              <span class="text-xs text-muted">{{ row.original.company.province || '—' }}</span>
            </template>

            <!-- Position -->
            <template #applicationPosition-cell="{ row }">
              <span class="text-xs">{{ row.original.applicationPosition || '—' }}</span>
            </template>

            <!-- Applied At -->
            <template #appliedAt-cell="{ row }">
              <span class="text-xs text-muted">{{ formatThaiDate(row.original.appliedAt) }}</span>
            </template>

            <!-- Status -->
            <template #status-cell="{ row }">
              <UBadge
                :color="getStatusBadge(row.original.status).color"
                variant="subtle"
                size="sm"
              >
                {{ getStatusBadge(row.original.status).label }}
              </UBadge>
            </template>

            <!-- Updated At -->
            <template #updatedAt-cell="{ row }">
              <span class="text-xs text-muted">{{ formatThaiDate(row.original.updatedAt) }}</span>
            </template>

            <!-- Actions Column -->
            <template #actions-cell="{ row }">
              <div class="flex items-center gap-1.5">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  label="ดูรายละเอียด"
                  :to="`/student/applications/${row.original.id}`"
                />

                <!-- Edit (allowed for SUBMITTED, AWAITING_RESPONSE, INTERVIEW) -->
                <UButton
                  v-if="['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(row.original.status)"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  label="แก้ไข"
                  :to="`/student/applications/${row.original.id}/edit`"
                />
                <!-- Delete (REJECTED only) -->
                <UButton
                  v-if="row.original.status === 'REJECTED'"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  label="ลบ"
                  @click="openDeleteModal(row.original)"
                />
              </div>
            </template>

            <!-- Empty State -->
            <template #empty>
              <div class="py-12 text-center text-muted space-y-2">
                <UIcon name="i-lucide-inbox" class="size-8 mx-auto opacity-40" />
                <p v-if="hasActiveFilter" class="text-sm">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</p>
                <p v-else class="text-sm">ยังไม่มีรายการสมัครสถานประกอบการ</p>
                <UButton
                  v-if="!hasActiveFilter && contextData?.canApply"
                  color="primary"
                  size="sm"
                  label="เพิ่มการสมัครรายการแรก"
                  to="/student/applications/new"
                />
              </div>
            </template>
          </UTable>

          <!-- Pagination Row -->
          <div v-if="filteredApplications.length > 0" class="border-t border-default px-4 py-3 flex items-center justify-between text-xs text-muted">
            <div>
              แสดง {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, filteredApplications.length) }} จากทั้งหมด {{ filteredApplications.length }} รายการ
            </div>
            <UPagination
              v-model:page="page"
              :total="filteredApplications.length"
              :items-per-page="pageSize"
              size="sm"
            />
          </div>
        </div>
        </section>
      </div>

      <!-- Confirm Delete Modal for REJECTED -->
      <UIConfirmModal
        v-model:open="isDeleteModalOpen"
        title="ยืนยันการลบรายการสมัคร"
        :description="`ท่านต้องการลบรายการสมัครสำหรับ ${appToDelete?.company.name} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`"
        confirm-label="ลบรายการ"
        confirm-color="error"
        :loading="isDeleting"
        @confirm="handleDeleteConfirm"
      />
    </template>
  </UDashboardPanel>
</template>
