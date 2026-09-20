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
    addressNo?: string | null
    street?: string | null
    subdistrict?: string | null
    district?: string | null
    postalCode?: string | null
    latitude?: number | null
    longitude?: number | null
  }
  cooperativeCycle?: {
    term: string
    academicYear: number
    cohortYear: number
  } | null
  cooperativeRequest?: {
    id: number
    status: string
    letterFilePath?: string | null
    signedDocumentPath?: string | null
    companyName?: string
    recipientName?: string | null
    letterAddress?: string | null
    address?: string | null
    province?: string | null
    latitude?: number | null
    longitude?: number | null
  } | null
  recipientName?: string | null
  letterAddress?: string | null
  internshipLocationName?: string | null
  internshipLatitude?: number | null
  internshipLongitude?: number | null
}

const notify = useNotify()
const isApplicationModalOpen = ref(false)

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

watch([search, statusFilter, provinceFilter, pageSize], () => {
  page.value = 1
})

const paginatedApplications = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredApplications.value.slice(start, start + pageSize.value)
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredApplications.value.length / pageSize.value)))

watch(pageCount, count => {
  if (page.value > count) page.value = count
})

const featuredApplication = computed(() => {
  const activeId = contextData.value?.activeApplication?.id
  return rawApplications.value?.find(item => item.id === activeId) || rawApplications.value?.[0] || null
})

const featuredRequest = computed(() => {
  const request = contextData.value?.latestRequest
  return request?.companyApplicationId === featuredApplication.value?.id ? request : null
})

const latestResponseDocument = computed(() => featuredRequest.value?.documents?.[0] || null)

const companyAddress = computed(() => {
  if (featuredRequest.value?.address) return featuredRequest.value.address
  const company = featuredApplication.value?.company
  if (!company) return '—'
  return [company.addressNo, company.street, company.subdistrict, company.district, company.province, company.postalCode]
    .filter(Boolean)
    .join(' ') || '—'
})

const mapUrl = computed(() => {
  const latitude = featuredRequest.value?.latitude ?? featuredApplication.value?.internshipLatitude
  const longitude = featuredRequest.value?.longitude ?? featuredApplication.value?.internshipLongitude
  return latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : null
})

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const formatThaiDateTime = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(val))
}

const getApplicationAddress = (application: Application) => application.cooperativeRequest?.address || [
  application.company.addressNo,
  application.company.street,
  application.company.subdistrict,
  application.company.district
].filter(Boolean).join(' ') || '—'

const getApplicationMapUrl = (application: Application) => {
  const latitude = application.cooperativeRequest?.latitude ?? application.internshipLatitude ?? application.company.latitude
  const longitude = application.cooperativeRequest?.longitude ?? application.internshipLongitude ?? application.company.longitude
  return latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : null
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
      return { label: 'ยืนยันสถานประกอบการแล้ว', color: 'success' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const columns: TableColumn<Application>[] = [
  { id: 'company', header: 'บริษัท / ตำแหน่ง' },
  { id: 'location', header: 'ที่อยู่ / พิกัดบริษัท' },
  { id: 'recipient', header: 'ผู้รับหนังสือ / ที่อยู่ออกหนังสือ' },
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
      <AppDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <div class="flex flex-col">
            <span class="text-[11px] font-normal leading-tight text-gray-400 font-['Prompt',sans-serif]">CWIE BRU / สมัครและยืนยันที่ฝึกงาน</span>
            <span class="text-sm font-bold leading-tight text-gray-900 font-['Prompt',sans-serif]">สมัครและยืนยันที่ฝึกงาน</span>
          </div>
        </template>
        <template #right>
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 pb-8 font-['Prompt',sans-serif]">
        <!-- Page Title & Top Action -->
        <div class="flex items-center justify-between">
          <h1 class="text-[22px] sm:text-[24px] font-bold text-gray-900 tracking-tight">สมัครและยืนยันที่ฝึกงาน</h1>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            label="กรอกข้อมูล"
            class="h-[40px] px-4 rounded-xl bg-primary text-gray-900 font-medium text-xs sm:text-sm shadow-none hover:bg-primary/90 transition-colors cursor-pointer"
            @click="isApplicationModalOpen = true"
          />
        </div>

        <!-- Top Card: ข้อมูลที่ฝึกงาน (Empty State) -->
        <section v-if="!featuredApplication" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs" aria-labelledby="no-placement-heading">
          <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 px-6 text-center">
            <div class="mb-3.5 grid size-10 place-items-center rounded-xl bg-gray-50 text-gray-400">
              <UIcon name="i-lucide-inbox" class="size-5" />
            </div>
            <h2 id="no-placement-heading" class="text-sm font-bold text-gray-900">ยังไม่มีข้อมูลที่ฝึกงาน</h2>
            <p class="mt-1 text-xs text-gray-500">กรอกข้อมูลบริษัท ตำแหน่ง และที่อยู่ เพื่อเริ่มต้นติดตามการสมัครที่ฝึกงาน</p>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="กรอกข้อมูลที่ฝึกงาน"
              class="mt-5 h-[40px] rounded-xl bg-primary px-5 text-xs font-medium text-gray-900 shadow-none hover:bg-primary/90 transition-colors cursor-pointer"
              @click="isApplicationModalOpen = true"
            />
          </div>
        </section>

        <!-- Top Card: ข้อมูลที่ฝึกงาน (When featuredApplication exists) -->
        <template v-else>
          <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs" aria-labelledby="placement-information-heading">
            <div class="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div class="flex min-w-0 items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UIcon name="i-lucide-briefcase-business" class="size-5" />
                </span>
                <div class="min-w-0">
                  <h2 id="placement-information-heading" class="font-semibold text-gray-900">ข้อมูลที่ฝึกงาน</h2>
                  <p class="mt-1 text-sm leading-6 text-gray-500">ข้อมูลบริษัท ตำแหน่ง และสถานะการสมัครล่าสุด</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                <UBadge :color="getStatusBadge(featuredApplication.status).color" variant="subtle" size="md" class="shrink-0">
                  {{ featuredRequest?.status === 'PLACEMENT_CONFIRMED' ? 'ยืนยันสถานที่ฝึกงานแล้ว' : getStatusBadge(featuredApplication.status).label }}
                </UBadge>
                <UButton
                  color="primary"
                  icon="i-lucide-plus"
                  label="กรอกข้อมูล"
                  :disabled="!contextData?.canApply"
                  :title="contextData?.canApply ? 'กรอกข้อมูลการสมัคร' : (contextData?.reason || 'ยังไม่สามารถกรอกข้อมูลได้')"
                  class="h-[40px] px-4 rounded-xl bg-primary text-gray-900 font-medium text-xs sm:text-sm shadow-none hover:bg-primary/90"
                  @click="isApplicationModalOpen = true"
                />
              </div>
            </div>

            <div class="space-y-7 p-5 sm:p-6">
              <section aria-labelledby="student-information-heading">
                <h3 id="student-information-heading" class="mb-3 text-sm font-semibold text-gray-900">ข้อมูลนักศึกษา</h3>
                <dl class="grid gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div class="min-w-0"><dt class="text-xs text-gray-500">ชื่อ-นามสกุล</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ contextData?.student?.name || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-gray-500">รหัสนักศึกษา</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ contextData?.student?.studentId || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-gray-500">หมู่เรียน</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ contextData?.student?.classGroup || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-gray-500">รอบการศึกษา</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">ภาคเรียนที่ {{ featuredApplication.cooperativeCycle?.term || contextData?.cycle?.term || '—' }}/{{ featuredApplication.cooperativeCycle?.academicYear || contextData?.cycle?.academicYear || '—' }} · รุ่น {{ featuredApplication.cooperativeCycle?.cohortYear || contextData?.cycle?.cohortYear || '—' }}</dd></div>
                </dl>
              </section>

              <section aria-labelledby="active-company-heading">
                <h3 id="active-company-heading" class="mb-3 text-sm font-semibold text-gray-900">บริษัทที่กำลังดำเนินการ</h3>
                <dl class="grid gap-4 sm:grid-cols-2">
                  <div class="min-w-0"><dt class="text-xs text-gray-500">ชื่อบริษัท</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ featuredRequest?.companyName || featuredApplication.company.name }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-gray-500">ตำแหน่งที่สมัคร</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ featuredRequest?.position || featuredApplication.applicationPosition || '—' }}</dd></div>
                </dl>
              </section>

              <div class="grid gap-6 border-t border-gray-100 pt-6 lg:grid-cols-2">
                <section aria-labelledby="company-address-heading">
                  <h3 id="company-address-heading" class="mb-3 text-sm font-semibold text-gray-900">สถานประกอบการ</h3>
                  <dl class="space-y-4">
                    <div class="min-w-0"><dt class="text-xs text-gray-500">ที่อยู่บริษัท</dt><dd class="mt-1 break-words text-sm font-medium leading-6 text-gray-900">{{ companyAddress }}</dd></div>
                    <div class="min-w-0"><dt class="text-xs text-gray-500">จังหวัด</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ featuredRequest?.province || featuredApplication.company.province || '—' }}</dd></div>
                  </dl>
                  <UButton v-if="mapUrl" :to="mapUrl" target="_blank" color="neutral" variant="outline" icon="i-lucide-map-pin" label="แสดงแผนที่" class="mt-4" />
                </section>

                <section aria-labelledby="letter-information-heading">
                  <h3 id="letter-information-heading" class="mb-3 text-sm font-semibold text-gray-900">ข้อมูลออกหนังสือ</h3>
                  <dl class="space-y-4">
                    <div class="min-w-0"><dt class="text-xs text-gray-500">เรียน (ผู้รับหนังสือ)</dt><dd class="mt-1 break-words text-sm font-medium text-gray-900">{{ featuredRequest?.recipientName || featuredApplication.recipientName || '—' }}</dd></div>
                    <div class="min-w-0"><dt class="text-xs text-gray-500">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 break-words text-sm font-medium leading-6 text-gray-900">{{ featuredRequest?.letterAddress || featuredApplication.letterAddress || '—' }}</dd></div>
                  </dl>
                </section>
              </div>

              <section class="rounded-xl bg-gray-50/60 p-4" aria-labelledby="record-information-heading">
                <h3 id="record-information-heading" class="sr-only">ข้อมูลรายการ</h3>
                <dl class="grid gap-4 sm:grid-cols-3">
                  <div><dt class="text-xs text-gray-500">เลขที่รายการ</dt><dd class="mt-1 text-sm font-medium text-gray-900">#{{ featuredApplication.id }}</dd></div>
                  <div><dt class="text-xs text-gray-500">วันที่สมัคร</dt><dd class="mt-1 text-sm font-medium text-gray-900">{{ formatThaiDate(featuredApplication.appliedAt) }}</dd></div>
                  <div><dt class="text-xs text-gray-500">อัปเดตล่าสุด</dt><dd class="mt-1 text-sm font-medium text-gray-900">{{ formatThaiDate(featuredApplication.updatedAt) }}</dd></div>
                </dl>
              </section>
            </div>
          </section>

          <section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="documents-heading">
            <div class="flex items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-files" class="size-5" />
              </span>
              <div>
                <h2 id="documents-heading" class="font-semibold text-gray-900">หนังสือขอความอนุเคราะห์และหนังสือตอบรับ</h2>
                <p class="mt-1 text-sm leading-6 text-gray-500">ตรวจสอบสถานะและดาวน์โหลดเอกสารที่เกี่ยวข้องกับสถานที่ฝึกงาน</p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <article class="flex min-w-0 flex-col rounded-xl border border-gray-200 p-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500"><UIcon name="i-lucide-file-text" class="size-5" /></span>
                  <UBadge :color="featuredRequest?.letterFilePath ? 'success' : 'neutral'" variant="subtle">{{ featuredRequest?.letterFilePath ? 'พร้อมดาวน์โหลด' : 'ยังไม่พร้อม' }}</UBadge>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-gray-900">หนังสือขอความอนุเคราะห์</h3>
                <p class="mt-1 flex-1 text-sm leading-6 text-gray-500">หนังสือจากมหาวิทยาลัยสำหรับยื่นต่อสถานประกอบการ</p>
                <UButton :disabled="!featuredRequest?.letterFilePath" :to="featuredRequest?.letterFilePath ? `/api/student/requests/${featuredRequest.id}/letter` : undefined" target="_blank" color="neutral" variant="outline" icon="i-lucide-download" label="ดาวน์โหลดหนังสือ" class="mt-4 justify-center sm:self-start" />
              </article>

              <article class="flex min-w-0 flex-col rounded-xl border border-gray-200 p-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500"><UIcon name="i-lucide-mail" class="size-5" /></span>
                  <UBadge :color="latestResponseDocument ? 'success' : 'neutral'" variant="subtle">{{ latestResponseDocument ? 'มีเอกสารแล้ว' : 'ยังไม่มีเอกสาร' }}</UBadge>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-gray-900">หนังสือตอบรับ</h3>
                <p class="mt-1 flex-1 text-sm leading-6 text-gray-500">หนังสือตอบรับฉบับล่าสุดที่ส่งกลับจากสถานประกอบการ</p>
                <UButton :disabled="!latestResponseDocument" :to="latestResponseDocument ? `/api/student/documents/${latestResponseDocument.id}/download` : undefined" target="_blank" color="neutral" variant="outline" icon="i-lucide-download" label="ดาวน์โหลดหนังสือ" class="mt-4 justify-center sm:self-start" />
              </article>
            </div>
          </section>
        </template>

        <!-- Bottom Card: ประวัติการสมัคร -->
        <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs" aria-labelledby="applications-heading">
          <div class="p-6 pb-5 space-y-4">
            <div>
              <h2 id="applications-heading" class="text-sm font-bold text-gray-900">ประวัติการสมัคร</h2>
              <p class="mt-0.5 text-xs text-gray-400">ดูบริษัทที่เคยสมัครและผลการดำเนินการย้อนหลัง</p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <!-- Search Input -->
              <div class="relative flex-1 max-w-sm">
                <UInput
                  v-model="search"
                  icon="i-lucide-search"
                  placeholder="ค้นหาชื่อบริษัทหรือตำแหน่ง"
                  class="w-full"
                  :ui="{
                    base: 'h-[40px] rounded-xl border-0 ring-1 ring-gray-200 bg-white text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-primary font-[\'Prompt\',sans-serif]'
                  }"
                />
              </div>

              <!-- Filters on the Right -->
              <div class="flex flex-wrap items-center gap-2">
                <USelect
                  v-model="statusFilter"
                  :items="[
                    { label: 'ทุกสถานะ', value: 'ALL' },
                    { label: 'ส่งข้อมูลการสมัครแล้ว', value: 'SUBMITTED' },
                    { label: 'รอผล', value: 'AWAITING_RESPONSE' },
                    { label: 'รอสัมภาษณ์', value: 'INTERVIEW' },
                    { label: 'บริษัทตอบรับแล้ว', value: 'ACCEPTED' },
                    { label: 'ปฏิเสธ', value: 'REJECTED' },
                    { label: 'ยกเลิกการสมัคร', value: 'WITHDRAWN' },
                    { label: 'ยืนยันสถานประกอบการแล้ว', value: 'CONFIRMED' }
                  ]"
                  class="w-36"
                  :ui="{
                    base: 'h-[40px] rounded-xl border-0 ring-1 ring-gray-200 bg-white text-xs font-[\'Prompt\',sans-serif]'
                  }"
                />

                <USelect
                  v-model="provinceFilter"
                  :items="[
                    { label: 'ทุกจังหวัด', value: 'ALL' },
                    ...availableProvinces.map(province => ({ label: province, value: province }))
                  ]"
                  class="w-36"
                  :ui="{
                    base: 'h-[40px] rounded-xl border-0 ring-1 ring-gray-200 bg-white text-xs font-[\'Prompt\',sans-serif]'
                  }"
                />

                <button
                  type="button"
                  title="รีเซ็ตตัวกรอง"
                  aria-label="รีเซ็ตตัวกรอง"
                  class="size-[40px] flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
                  @click="clearFilters"
                >
                  <UIcon name="i-lucide-rotate-ccw" class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="contextData && !contextData.canApply && contextData.reason" class="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2 text-xs text-gray-500 border border-gray-200">
            <UIcon name="i-lucide-info" class="size-4 shrink-0 text-primary" />
            <span>{{ contextData.reason }}</span>
          </div>

          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-circle-alert"
            title="ไม่สามารถโหลดรายการสมัครได้"
            :description="error.message"
            :actions="[{ label: 'ลองใหม่', color: 'error', variant: 'subtle', onClick: () => refresh() }]"
            class="m-6"
          />

          <!-- Empty state when no applications found -->
          <div v-if="filteredApplications.length === 0" class="mx-6 mb-6">
            <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 px-6 text-center">
              <div class="mb-3.5 grid size-10 place-items-center rounded-xl bg-gray-50 text-gray-400">
                <UIcon name="i-lucide-inbox" class="size-5" />
              </div>
              <h3 class="text-sm font-bold text-gray-900">
                {{ hasActiveFilter ? 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีรายการสมัคร' }}
              </h3>
              <p class="mt-1 text-xs text-gray-400">
                {{ hasActiveFilter ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ/จังหวัด' : 'เพิ่มบริษัทที่คุณสมัครไว้เพื่อเริ่มติดตามสถานะ' }}
              </p>
            </div>
          </div>

          <!-- Table when applications exist -->
          <template v-else>
            <div class="overflow-x-auto border-t border-gray-100">
              <UTable
                :columns="columns"
                :data="paginatedApplications"
                :loading="status === 'pending'"
                class="min-w-[78rem]"
                :ui="{ tr: 'hover:bg-gray-50/60', td: 'py-4 align-top' }"
              >
                <template #company-cell="{ row }">
                  <div class="min-w-44 max-w-60">
                    <NuxtLink :to="`/student/applications/${row.original.id}`" class="break-words text-sm font-semibold text-gray-900 transition-colors hover:text-primary">
                      {{ row.original.company.name }}
                    </NuxtLink>
                    <p class="mt-1 break-words text-xs text-gray-500">{{ row.original.applicationPosition || '—' }}</p>
                  </div>
                </template>

                <template #location-cell="{ row }">
                  <div class="min-w-48 max-w-64 text-sm">
                    <p class="break-words text-gray-900">{{ getApplicationAddress(row.original) }}</p>
                    <p class="mt-1 text-xs text-gray-500">{{ row.original.cooperativeRequest?.province || row.original.company.province || '—' }}</p>
                    <a
                      v-if="getApplicationMapUrl(row.original)"
                      :href="getApplicationMapUrl(row.original) || undefined"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <UIcon name="i-lucide-map-pin" class="size-3.5" />
                      แสดงแผนที่
                    </a>
                  </div>
                </template>

                <template #recipient-cell="{ row }">
                  <div class="min-w-48 max-w-64 text-sm">
                    <p class="break-words font-medium text-gray-900">{{ row.original.cooperativeRequest?.recipientName || row.original.recipientName || '—' }}</p>
                    <p class="mt-1 break-words text-xs text-gray-500">{{ row.original.cooperativeRequest?.companyName || row.original.company.name }}</p>
                    <p class="mt-1 break-words text-xs leading-5 text-gray-500">{{ row.original.cooperativeRequest?.letterAddress || row.original.letterAddress || '—' }}</p>
                  </div>
                </template>

                <template #appliedAt-cell="{ row }">
                  <span class="whitespace-nowrap text-sm text-gray-900">{{ formatThaiDate(row.original.appliedAt) }}</span>
                </template>

                <template #status-cell="{ row }">
                  <UBadge :color="getStatusBadge(row.original.status).color" variant="subtle" size="sm" class="whitespace-nowrap rounded-full font-medium">
                    <span class="mr-1.5 size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {{ getStatusBadge(row.original.status).label }}
                  </UBadge>
                </template>

                <template #updatedAt-cell="{ row }">
                  <span class="whitespace-nowrap text-xs text-gray-500">{{ formatThaiDateTime(row.original.updatedAt) }}</span>
                </template>

                <template #actions-cell="{ row }">
                  <div class="flex items-center gap-1">
                    <UTooltip v-if="['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(row.original.status)" text="แก้ไข">
                      <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-pencil" :to="`/student/applications/${row.original.id}/edit`" aria-label="แก้ไข" />
                    </UTooltip>
                    <UTooltip v-if="['REJECTED', 'WITHDRAWN'].includes(row.original.status) && contextData?.canApply" text="สมัครใหม่">
                      <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-refresh-cw" aria-label="สมัครใหม่" @click="isApplicationModalOpen = true" />
                    </UTooltip>
                    <UTooltip v-if="row.original.status === 'REJECTED'" text="ลบ">
                      <UButton size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="ลบ" @click="openDeleteModal(row.original)" />
                    </UTooltip>
                  </div>
                </template>
              </UTable>
            </div>

            <!-- Pagination Row -->
            <div v-if="filteredApplications.length > 0" class="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="flex flex-wrap items-center gap-3">
                <span>แสดง {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filteredApplications.length) }} จาก {{ filteredApplications.length }} รายการ</span>
                <USelect v-model="pageSize" :items="[10, 20, 50]" class="w-20" aria-label="จำนวนรายการต่อหน้า" />
              </div>
              <div class="flex items-center justify-between gap-2 sm:justify-end">
                <UButton color="neutral" variant="outline" label="ก่อนหน้า" :disabled="page <= 1" @click="page--" />
                <span class="whitespace-nowrap px-2">หน้า {{ page }} / {{ pageCount }}</span>
                <UButton color="neutral" variant="outline" label="ถัดไป" :disabled="page >= pageCount" @click="page++" />
              </div>
            </div>
          </template>
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

      <UModal v-model:open="isApplicationModalOpen" title="กรอกข้อมูลที่ฝึกงาน" description="กรอกข้อมูลบริษัท ตำแหน่ง และสถานที่ปฏิบัติงาน" :ui="{ content: 'sm:max-w-5xl' }">
        <template #content>
          <div class="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">กรอกข้อมูลที่ฝึกงาน</h2>
                <p class="mt-1 text-sm text-muted">กรอกข้อมูลบริษัท ตำแหน่ง และสถานที่ปฏิบัติงาน</p>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-lucide-x" aria-label="ปิด" @click="isApplicationModalOpen = false" />
            </div>
            <StudentApplicationForm embedded class="max-w-none" @cancel="isApplicationModalOpen = false" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
