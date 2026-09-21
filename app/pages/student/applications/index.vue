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
const route = useRoute()
const isApplicationModalOpen = ref(false)
const applicationNotice = ref<string | null>(null)

const { data: contextData } = await useFetch<any>('/api/student/context')
const { data: rawApplications, status, error, refresh } = await useFetch<Application[]>('/api/student/applications')

// Filters
const search = ref('')
const statusFilter = ref('ALL')
const provinceFilter = ref('ALL')
const page = ref(1)
const pageSize = ref(10)

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'ส่งข้อมูลการสมัครแล้ว', value: 'SUBMITTED' },
  { label: 'รอผลตอบกลับ', value: 'AWAITING_RESPONSE' },
  { label: 'รอสัมภาษณ์', value: 'INTERVIEW' },
  { label: 'บริษัทตอบรับแล้ว', value: 'ACCEPTED' },
  { label: 'บริษัทปฏิเสธ', value: 'REJECTED' },
  { label: 'ยกเลิกการสมัคร', value: 'WITHDRAWN' },
  { label: 'ยืนยันสถานประกอบการแล้ว', value: 'CONFIRMED' }
]

const availableProvinces = computed(() => {
  const set = new Set<string>()
  for (const app of rawApplications.value || []) {
    if (app.company?.province) set.add(app.company.province)
  }
  return Array.from(set).sort()
})

const provinceOptions = computed(() => [
  { label: 'ทุกจังหวัด', value: 'ALL' },
  ...availableProvinces.value.map(province => ({ label: province, value: province }))
])

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

const clearedFeaturedApplicationId = ref<number | null>(null)

const featuredApplication = computed(() => {
  const activeId = contextData.value?.activeApplication?.id
  if (activeId === clearedFeaturedApplicationId.value) return null
  return rawApplications.value?.find(item => item.id === activeId) || null
})

const featuredRequest = computed(() => {
  const request = contextData.value?.latestRequest
  return request?.companyApplicationId === featuredApplication.value?.id ? request : null
})

const latestResponseDocument = computed(() => featuredRequest.value?.documents?.[0] || null)

const getRequestStatusBadge = (status?: string) => {
  switch (status) {
    case 'SUBMITTED':
    case 'STAFF_PROCESSING':
      return { label: 'เจ้าหน้าที่กำลังดำเนินการ', color: 'warning' as const }
    case 'LETTER_READY':
      return { label: 'มีหนังสือพร้อมดาวน์โหลด', color: 'primary' as const }
    case 'DOCUMENT_UNDER_REVIEW':
      return { label: 'รอตรวจสอบหนังสือตอบรับ', color: 'warning' as const }
    case 'RETURNED_FOR_REVISION':
      return { label: 'กรุณาแก้ไขหนังสือตอบรับ', color: 'error' as const }
    case 'PLACEMENT_CONFIRMED':
      return { label: 'ยืนยันสถานที่ฝึกงานแล้ว', color: 'success' as const }
    default:
      return { label: 'ยังไม่มีคำร้อง', color: 'neutral' as const }
  }
}

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

const openApplicationModal = () => {
  if (contextData.value?.canApply) {
    applicationNotice.value = null
    isApplicationModalOpen.value = true
    return
  }

  applicationNotice.value = contextData.value?.reason || 'ขออภัย ขณะนี้ยังไม่สามารถกรอกข้อมูลสถานประกอบการใหม่ได้'
}

watch([() => route.query.companyId, contextData], ([companyId, context]) => {
  if (companyId && context && Number.isInteger(Number(companyId))) openApplicationModal()
}, { immediate: true })

const applicationToUpdate = ref<Application | null>(null)
const outcomeStatus = ref('')
const isUpdatingOutcome = ref(false)
const isUploadModalOpen = ref(false)
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)

const outcomeOptions = computed(() => {
  if (!applicationToUpdate.value) return []

  const options = []
  if (applicationToUpdate.value.status === 'SUBMITTED') {
    options.push({ label: 'กำลังดำเนินการ', value: 'AWAITING_RESPONSE' })
  }
  options.push(
    { label: 'ยืนยันสถานประกอบการ', value: 'ACCEPTED' },
    { label: 'ปฏิเสธ', value: 'REJECTED' }
  )
  return options
})

const openOutcomeModal = (application: Application) => {
  applicationToUpdate.value = application
  outcomeStatus.value = application.status === 'SUBMITTED' ? 'AWAITING_RESPONSE' : 'ACCEPTED'
}

const updateOutcome = async () => {
  if (!applicationToUpdate.value || !outcomeStatus.value) return

  const applicationId = applicationToUpdate.value.id
  const targetStatus = outcomeStatus.value
  isUpdatingOutcome.value = true
  try {
    await $fetch(`/api/student/applications/${applicationId}/outcome`, {
      method: 'POST',
      body: { status: targetStatus }
    })
    notify.success('อัปเดตผลการสมัครเรียบร้อยแล้ว')
    applicationToUpdate.value = null
    if (targetStatus === 'REJECTED') clearedFeaturedApplicationId.value = applicationId
    await Promise.all([refresh(), refreshNuxtData('/api/student/context')])
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถอัปเดตผลการสมัครได้')
  } finally {
    isUpdatingOutcome.value = false
  }
}

const onFileChange = (event: Event) => {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] || null
}

const uploadSignedDocument = async () => {
  if (!featuredApplication.value || !selectedFile.value) {
    notify.warning('กรุณาเลือกไฟล์หนังสือตอบรับก่อนอัปโหลด')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    await $fetch(`/api/student/applications/${featuredApplication.value.id}/signed-document`, {
      method: 'POST',
      body: formData
    })
    notify.success('อัปโหลดหนังสือตอบรับเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ')
    isUploadModalOpen.value = false
    selectedFile.value = null
    await Promise.all([refresh(), refreshNuxtData('/api/student/context')])
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถอัปโหลดหนังสือตอบรับได้')
  } finally {
    isUploading.value = false
  }
}

const columns: TableColumn<Application>[] = [
  { id: 'company', header: 'บริษัท / ตำแหน่ง' },
  { id: 'location', header: 'ที่อยู่ / พิกัดบริษัท' },
  { id: 'recipient', header: 'ผู้รับหนังสือ / ที่อยู่ออกหนังสือ' },
  { accessorKey: 'appliedAt', header: 'วันที่สมัคร' },
  { accessorKey: 'status', header: 'สถานะ' },
  { accessorKey: 'updatedAt', header: 'อัปเดตล่าสุด' }
]

const isConfirmModalOpen = ref(false)
const isConfirming = ref(false)

const confirmFeaturedApplication = async () => {
  if (!featuredApplication.value) return

  isConfirming.value = true
  try {
    await $fetch(`/api/student/applications/${featuredApplication.value.id}/confirm`, { method: 'POST' })
    notify.success('ยืนยันสถานประกอบการและส่งคำร้องเรียบร้อยแล้ว')
    isConfirmModalOpen.value = false
    await Promise.all([refresh(), refreshNuxtData('/api/student/context')])
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถยืนยันสถานประกอบการได้')
  } finally {
    isConfirming.value = false
  }
}

</script>

<template>
  <UDashboardPanel id="student-applications-page">
    <template #header>
      <AppDashboardNavbar title="สมัครและยืนยันที่ฝึกงาน">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            color="primary"
            size="xl"
            icon="i-lucide-plus"
            label="กรอกข้อมูล"
            @click="openApplicationModal"
          />
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 pb-8">
        <UAlert
          v-if="applicationNotice"
          color="warning"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="ยังไม่สามารถกรอกข้อมูลสถานประกอบการใหม่ได้"
          :description="applicationNotice"
          :actions="[{ label: 'ปิดข้อความ', color: 'neutral', variant: 'ghost', onClick: () => { applicationNotice = null } }]"
        />

        <!-- Top Card: ข้อมูลที่ฝึกงาน (Empty State) -->
        <UCard v-if="!featuredApplication">
          <UEmpty
            icon="i-lucide-inbox"
            title="ยังไม่มีข้อมูลที่ฝึกงาน"
            description="กรอกข้อมูลบริษัท ตำแหน่ง และที่อยู่ เพื่อเริ่มต้นติดตามการสมัครที่ฝึกงาน"
            class="py-12"
          >
            <template #actions>
              <UButton
                color="primary"
                size="xl"
                icon="i-lucide-plus"
                label="กรอกข้อมูลที่ฝึกงาน"
                @click="openApplicationModal"
              />
            </template>
          </UEmpty>
        </UCard>

        <!-- Top Card: ข้อมูลที่ฝึกงาน (When featuredApplication exists) -->
        <template v-else>
          <UCard>
            <template #header>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex min-w-0 items-start gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
                    <UIcon name="i-lucide-briefcase-business" class="size-5" />
                  </span>
                  <div class="min-w-0">
                    <h2 class="font-semibold text-ink">ข้อมูลที่ฝึกงาน</h2>
                    <p class="mt-1 text-sm leading-6 text-muted">ข้อมูลบริษัท ตำแหน่ง และสถานะการสมัครล่าสุด</p>
                  </div>
                </div>
                <div class="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
                  <UBadge :color="featuredRequest ? getRequestStatusBadge(featuredRequest.status).color : getStatusBadge(featuredApplication.status).color" variant="subtle" size="md" class="shrink-0">
                    {{ featuredRequest ? getRequestStatusBadge(featuredRequest.status).label : getStatusBadge(featuredApplication.status).label }}
                  </UBadge>
                  <div class="flex flex-wrap gap-2 sm:justify-end">
                    <UButton
                      v-if="['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(featuredApplication.status)"
                      color="primary"
                      size="xl"
                      icon="i-lucide-square-pen"
                      label="อัปเดตผลการสมัคร"
                      @click="openOutcomeModal(featuredApplication)"
                    />
                    <UButton
                      v-if="featuredApplication.status === 'ACCEPTED'"
                      color="success"
                      size="xl"
                      icon="i-lucide-check-circle"
                      label="ยืนยันสถานประกอบการ"
                      @click="isConfirmModalOpen = true"
                    />
                    <UButton
                      v-if="['REJECTED', 'WITHDRAWN'].includes(featuredApplication.status) && contextData?.canApply"
                      color="primary"
                      size="xl"
                      icon="i-lucide-plus"
                      label="กรอกข้อมูลที่ฝึกงานใหม่"
                      @click="openApplicationModal"
                    />
                  </div>
                </div>
              </div>
            </template>

            <div class="space-y-7">
              <section aria-labelledby="student-information-heading">
                <h3 id="student-information-heading" class="mb-3 text-sm font-semibold text-ink">ข้อมูลนักศึกษา</h3>
                <dl class="grid gap-4 rounded-panel border border-divider bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div class="min-w-0"><dt class="text-xs text-muted">ชื่อ-นามสกุล</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ contextData?.student?.name || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-muted">รหัสนักศึกษา</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ contextData?.student?.studentId || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-muted">หมู่เรียน</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ contextData?.student?.classGroup || '—' }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-muted">รอบการศึกษา</dt><dd class="mt-1 break-words text-sm font-medium text-ink">ภาคเรียนที่ {{ featuredApplication.cooperativeCycle?.term || contextData?.cycle?.term || '—' }}/{{ featuredApplication.cooperativeCycle?.academicYear || contextData?.cycle?.academicYear || '—' }} · รุ่น {{ featuredApplication.cooperativeCycle?.cohortYear || contextData?.cycle?.cohortYear || '—' }}</dd></div>
                </dl>
              </section>

              <section aria-labelledby="active-company-heading">
                <h3 id="active-company-heading" class="mb-3 text-sm font-semibold text-ink">บริษัทที่กำลังดำเนินการ</h3>
                <dl class="grid gap-4 sm:grid-cols-2">
                  <div class="min-w-0"><dt class="text-xs text-muted">ชื่อบริษัท</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ featuredRequest?.companyName || featuredApplication.company.name }}</dd></div>
                  <div class="min-w-0"><dt class="text-xs text-muted">ตำแหน่งที่สมัคร</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ featuredRequest?.position || featuredApplication.applicationPosition || '—' }}</dd></div>
                </dl>
              </section>

              <div class="grid gap-6 border-t border-divider pt-6 lg:grid-cols-2">
                <section aria-labelledby="company-address-heading">
                  <h3 id="company-address-heading" class="mb-3 text-sm font-semibold text-ink">สถานประกอบการ</h3>
                  <dl class="space-y-4">
                    <div class="min-w-0"><dt class="text-xs text-muted">ที่อยู่บริษัท</dt><dd class="mt-1 break-words text-sm font-medium leading-6 text-ink">{{ companyAddress }}</dd></div>
                    <div class="min-w-0"><dt class="text-xs text-muted">จังหวัด</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ featuredRequest?.province || featuredApplication.company.province || '—' }}</dd></div>
                  </dl>
                  <UButton v-if="mapUrl" :to="mapUrl" target="_blank" color="neutral" variant="outline" size="sm" icon="i-lucide-map-pin" label="แสดงแผนที่" class="mt-4" />
                </section>

                <section aria-labelledby="letter-information-heading">
                  <h3 id="letter-information-heading" class="mb-3 text-sm font-semibold text-ink">ข้อมูลออกหนังสือ</h3>
                  <dl class="space-y-4">
                    <div class="min-w-0"><dt class="text-xs text-muted">เรียน (ผู้รับหนังสือ)</dt><dd class="mt-1 break-words text-sm font-medium text-ink">{{ featuredRequest?.recipientName || featuredApplication.recipientName || '—' }}</dd></div>
                    <div class="min-w-0"><dt class="text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 break-words text-sm font-medium leading-6 text-ink">{{ featuredRequest?.letterAddress || featuredApplication.letterAddress || '—' }}</dd></div>
                  </dl>
                </section>
              </div>

              <section class="rounded-panel bg-surface p-4" aria-labelledby="record-information-heading">
                <h3 id="record-information-heading" class="sr-only">ข้อมูลรายการ</h3>
                <dl class="grid gap-4 sm:grid-cols-3">
                  <div><dt class="text-xs text-muted">เลขที่รายการ</dt><dd class="mt-1 text-sm font-medium text-ink">#{{ featuredApplication.id }}</dd></div>
                  <div><dt class="text-xs text-muted">วันที่สมัคร</dt><dd class="mt-1 text-sm font-medium text-ink">{{ formatThaiDate(featuredApplication.appliedAt) }}</dd></div>
                  <div><dt class="text-xs text-muted">อัปเดตล่าสุด</dt><dd class="mt-1 text-sm font-medium text-ink">{{ formatThaiDate(featuredApplication.updatedAt) }}</dd></div>
                </dl>
              </section>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
                  <UIcon name="i-lucide-files" class="size-5" />
                </span>
                <div>
                  <h2 class="font-semibold text-ink">หนังสือขอความอนุเคราะห์และหนังสือตอบรับ</h2>
                  <p class="mt-1 text-sm leading-6 text-muted">ตรวจสอบสถานะและดาวน์โหลดเอกสารที่เกี่ยวข้องกับสถานที่ฝึกงาน</p>
                </div>
              </div>
            </template>

            <div class="grid gap-4 lg:grid-cols-2">
              <article class="flex min-w-0 flex-col rounded-panel border border-divider p-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <span class="grid size-9 shrink-0 place-items-center rounded-control bg-surface text-muted"><UIcon name="i-lucide-file-text" class="size-5" /></span>
                  <UBadge :color="featuredRequest?.letterFilePath ? 'success' : 'neutral'" variant="subtle">{{ featuredRequest?.letterFilePath ? 'พร้อมดาวน์โหลด' : 'ยังไม่พร้อม' }}</UBadge>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-ink">หนังสือขอความอนุเคราะห์</h3>
                <p class="mt-1 flex-1 text-sm leading-6 text-muted">หนังสือจากมหาวิทยาลัยสำหรับยื่นต่อสถานประกอบการ</p>
                <UButton
                  :disabled="!featuredRequest?.letterFilePath"
                  :to="featuredRequest?.letterFilePath ? `/api/student/applications/${featuredApplication.id}/letter` : undefined"
                  target="_blank"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-download"
                  label="ดาวน์โหลดหนังสือ"
                  class="mt-4 justify-center sm:self-start"
                />
              </article>

              <article class="flex min-w-0 flex-col rounded-panel border border-divider p-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <span class="grid size-9 shrink-0 place-items-center rounded-control bg-surface text-muted"><UIcon name="i-lucide-mail" class="size-5" /></span>
                  <UBadge :color="latestResponseDocument ? 'success' : 'neutral'" variant="subtle">{{ latestResponseDocument ? 'แนบเอกสารเรียบร้อย' : 'ยังไม่มีเอกสาร' }}</UBadge>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-ink">หนังสือตอบรับ</h3>
                <p class="mt-1 flex-1 text-sm leading-6 text-muted">แนบหนังสือตอบรับจากสถานประกอบการเพื่อส่งให้เจ้าหน้าที่ตรวจสอบ</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <UButton
                    v-if="featuredRequest && ['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(featuredRequest.status)"
                    color="primary"
                    size="sm"
                    icon="i-lucide-upload"
                    :label="featuredRequest.status === 'RETURNED_FOR_REVISION' ? 'อัปโหลดฉบับแก้ไข' : 'แนบหนังสือตอบรับ'"
                    @click="isUploadModalOpen = true"
                  />
                  <UButton
                    v-if="latestResponseDocument"
                    :to="`/api/student/documents/${latestResponseDocument.id}/download`"
                    target="_blank"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-download"
                    label="ดาวน์โหลดฉบับล่าสุด"
                  />
                </div>
              </article>
            </div>
          </UCard>
        </template>

        <!-- Bottom Card: ประวัติการสมัคร -->
        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-bold text-ink">ประวัติการสมัคร</h2>
                <p class="mt-1 text-sm leading-6 text-muted">ดูบริษัทที่เคยสมัครและผลการดำเนินการย้อนหลัง</p>
              </div>
            </div>

            <!-- Control Row -->
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="w-full sm:max-w-xs">
                <UInput
                  v-model="search"
                  icon="i-lucide-search"
                  size="xl"
                  placeholder="ค้นหาชื่อบริษัทหรือตำแหน่ง..."
                  class="w-full"
                  aria-label="ค้นหาชื่อบริษัทหรือตำแหน่ง"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <USelect
                  v-model="statusFilter"
                  :items="statusOptions"
                  size="xl"
                  class="w-full sm:w-48"
                  aria-label="กรองตามสถานะ"
                />

                <USelect
                  v-model="provinceFilter"
                  :items="provinceOptions"
                  size="xl"
                  class="w-full sm:w-40"
                  aria-label="กรองตามจังหวัด"
                />

                <UButton
                  v-if="hasActiveFilter"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-x"
                  label="ล้างตัวกรอง"
                  @click="clearFilters"
                />
              </div>
            </div>

            <div v-if="hasActiveFilter" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="search" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ search }}”
              </span>
              <span v-if="statusFilter !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ statusOptions.find(o => o.value === statusFilter)?.label }}
              </span>
              <span v-if="provinceFilter !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                จ.{{ provinceFilter }}
              </span>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearFilters">
                ล้างทั้งหมด
              </UButton>
            </div>
          </div>

          <div v-if="contextData && !contextData.canApply && contextData.reason" class="m-5 flex items-center gap-2 rounded-panel bg-surface p-3 text-xs text-muted border border-divider">
            <UIcon name="i-lucide-info" class="size-4 shrink-0 text-primary" />
            <span>{{ contextData.reason }}</span>
          </div>

          <div v-if="status === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
            <div v-for="row in 4" :key="row" class="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_6rem] gap-4 max-md:grid-cols-[1fr_6rem]">
              <USkeleton class="h-10" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
            </div>
          </div>

          <div v-else-if="error" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-triangle-alert"
              title="ไม่สามารถโหลดรายการสมัครได้"
              :description="error.message || 'เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง'"
              class="min-h-64"
            >
              <template #actions>
                <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="() => refresh()">
                  ลองอีกครั้ง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Empty state when no applications found -->
          <div v-else-if="filteredApplications.length === 0" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-inbox"
              :title="hasActiveFilter ? 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีรายการสมัคร'"
              :description="hasActiveFilter ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ/จังหวัด' : 'เพิ่มบริษัทที่คุณสมัครไว้เพื่อเริ่มติดตามสถานะ'"
              class="min-h-64"
            >
              <template #actions>
                <UButton v-if="hasActiveFilter" size="xl" color="neutral" variant="outline" @click="clearFilters">
                  ล้างตัวกรอง
                </UButton>
                <UButton v-else-if="contextData?.canApply" size="xl" color="primary" icon="i-lucide-plus" @click="isApplicationModalOpen = true">
                  กรอกข้อมูล
                </UButton>
              </template>
            </UEmpty>
          </div>

          <!-- Table when applications exist -->
          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                :columns="columns"
                :data="paginatedApplications"
                class="min-w-full"
                :ui="{ base: 'w-full min-w-[78rem]', td: 'py-4 align-top' }"
              >
                <template #company-cell="{ row }">
                  <div class="min-w-44 max-w-60">
                    <NuxtLink :to="`/student/applications/${row.original.id}`" class="break-words text-sm font-semibold text-ink transition-colors hover:text-primary">
                      {{ row.original.company.name }}
                    </NuxtLink>
                    <p class="mt-1 break-words text-xs text-muted">{{ row.original.applicationPosition || '—' }}</p>
                  </div>
                </template>

                <template #location-cell="{ row }">
                  <div class="min-w-48 max-w-64 text-sm">
                    <p class="break-words text-ink">{{ getApplicationAddress(row.original) }}</p>
                    <p class="mt-1 text-xs text-muted">{{ row.original.cooperativeRequest?.province || row.original.company.province || '—' }}</p>
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
                    <p class="break-words font-medium text-ink">{{ row.original.cooperativeRequest?.recipientName || row.original.recipientName || '—' }}</p>
                    <p class="mt-1 break-words text-xs text-muted">{{ row.original.cooperativeRequest?.companyName || row.original.company.name }}</p>
                    <p class="mt-1 break-words text-xs leading-5 text-muted">{{ row.original.cooperativeRequest?.letterAddress || row.original.letterAddress || '—' }}</p>
                  </div>
                </template>

                <template #appliedAt-cell="{ row }">
                  <span class="whitespace-nowrap text-sm text-ink">{{ formatThaiDate(row.original.appliedAt) }}</span>
                </template>

                <template #status-cell="{ row }">
                  <UBadge :color="getStatusBadge(row.original.status).color" variant="subtle" size="sm" class="whitespace-nowrap">
                    {{ getStatusBadge(row.original.status).label }}
                  </UBadge>
                </template>

                <template #updatedAt-cell="{ row }">
                  <span class="whitespace-nowrap text-xs text-muted">{{ formatThaiDateTime(row.original.updatedAt) }}</span>
                </template>

              </UTable>
            </div>

            <!-- Pagination Row -->
            <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="flex flex-wrap items-center gap-3">
                <span class="whitespace-nowrap text-muted">แสดง {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filteredApplications.length) }} จาก {{ filteredApplications.length }} รายการ</span>
                <div class="w-20 shrink-0">
                  <USelect v-model="pageSize" :items="[10, 20, 50]" size="md" aria-label="จำนวนรายการต่อหน้า" />
                </div>
              </div>
              <div class="flex items-center justify-center">
                <UPagination v-model:page="page" :items-per-page="pageSize" :total="filteredApplications.length" size="md" />
              </div>
            </div>
          </template>
        </UCard>
      </div>

      <!-- Confirm Delete Modal for REJECTED -->
      <UIConfirmModal
        v-model:open="isConfirmModalOpen"
        title="ยืนยันสถานประกอบการ"
        :description="`ยืนยันสถานประกอบการ ${featuredApplication?.company.name || ''} และส่งคำร้องให้เจ้าหน้าที่ใช่หรือไม่?`"
        confirm-label="ยืนยันและส่งคำร้อง"
        confirm-color="success"
        :loading="isConfirming"
        @confirm="confirmFeaturedApplication"
      />

      <UModal
        :open="Boolean(applicationToUpdate)"
        title="อัปเดตผลการสมัคร"
        description="บันทึกผลล่าสุดจากสถานประกอบการ"
        @update:open="(open) => { if (!open) applicationToUpdate = null }"
      >
        <template #body>
          <UFormField label="ผลการสมัคร" required>
            <USelect v-model="outcomeStatus" :items="outcomeOptions" size="xl" class="w-full" />
          </UFormField>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton size="xl" color="neutral" variant="outline" label="ยกเลิก" @click="applicationToUpdate = null" />
            <UButton size="xl" color="primary" label="บันทึกผลการสมัคร" :loading="isUpdatingOutcome" @click="updateOutcome" />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isUploadModalOpen"
        title="ส่งหนังสือตอบรับให้เจ้าหน้าที่"
        description="รองรับไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10MB"
      >
        <template #body>
          <UFormField label="เลือกไฟล์หนังสือตอบรับ" required>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              class="block w-full cursor-pointer text-sm text-muted file:mr-4 file:rounded-control file:border-0 file:bg-primary/10 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
              @change="onFileChange"
            >
          </UFormField>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton size="xl" color="neutral" variant="outline" label="ยกเลิก" @click="isUploadModalOpen = false" />
            <UButton size="xl" color="primary" icon="i-lucide-upload" label="อัปโหลด" :loading="isUploading" @click="uploadSignedDocument" />
          </div>
        </template>
      </UModal>

      <!-- Embedded Application Modal -->
      <UModal
        v-model:open="isApplicationModalOpen"
        title="กรอกข้อมูลที่ฝึกงาน"
        description="กรอกข้อมูลบริษัท ตำแหน่ง และสถานที่ปฏิบัติงาน"
        :ui="{ content: 'sm:max-w-4xl' }"
      >
        <template #body>
          <div class="max-h-[80vh] overflow-y-auto pr-1">
            <StudentApplicationForm :preselected-company-id="typeof route.query.companyId === 'string' ? route.query.companyId : undefined" embedded class="max-w-none" @cancel="isApplicationModalOpen = false" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
