<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface RequestDocumentItem {
  id: number
  documentType: string
  fileName: string
  version: number
  status: string
  createdAt: string
  reviewerNote?: string | null
}

interface RequestItem {
  id: number
  status: string
  companyName: string
  position: string | null
  province: string | null
  confirmedAt: string
  returnedReason: string | null
  rejectedReason: string | null
  letterFilePath: string | null
  letterOriginalName: string | null
  documents: RequestDocumentItem[]
}

const notify = useNotify()
const { data: requests, status, error, refresh } = await useFetch<RequestItem[]>('/api/student/requests')

const search = ref('')
const statusFilter = ref('ALL')

// Upload modal state
const uploadRequestId = ref<number | null>(null)
const isUploadModalOpen = ref(false)
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)

const openUploadModal = (reqId: number) => {
  uploadRequestId.value = reqId
  selectedFile.value = null
  isUploadModalOpen.value = true
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleUpload = async () => {
  if (!uploadRequestId.value || !selectedFile.value) {
    notify.error('กรุณาเลือกไฟล์เอกสาร')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    await $fetch(`/api/student/requests/${uploadRequestId.value}/signed-document`, {
      method: 'POST',
      body: formData
    })

    notify.success('อัปโหลดหนังสือตอบรับเรียบร้อยแล้ว')
    isUploadModalOpen.value = false
    selectedFile.value = null
    uploadRequestId.value = null
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถอัปโหลดเอกสารได้')
  } finally {
    isUploading.value = false
  }
}

const filteredRequests = computed(() => {
  let list = requests.value || []
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(r =>
      r.companyName.toLowerCase().includes(q) ||
      (r.position && r.position.toLowerCase().includes(q))
    )
  }
  if (statusFilter.value !== 'ALL') {
    list = list.filter(r => r.status === statusFilter.value)
  }
  return list
})

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const getReqStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งคำร้องแล้ว', color: 'info' as const }
    case 'STAFF_PROCESSING':
      return { label: 'รอเจ้าหน้าที่ดำเนินการ', color: 'warning' as const }
    case 'LETTER_READY':
      return { label: 'มีหนังสือพร้อมดาวน์โหลด', color: 'primary' as const }
    case 'DOCUMENT_UNDER_REVIEW':
      return { label: 'รอตรวจสอบเอกสาร', color: 'warning' as const }
    case 'RETURNED_FOR_REVISION':
      return { label: 'ถูกส่งกลับให้แก้ไข', color: 'error' as const }
    case 'PLACEMENT_CONFIRMED':
      return { label: 'ยืนยันสถานที่ฝึกงานแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'ไม่ผ่านการยืนยัน', color: 'error' as const }
    case 'CANCELLED':
      return { label: 'ยกเลิกคำร้อง', color: 'neutral' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const getDocStatusBadge = (s: string) => {
  switch (s) {
    case 'WAITING_UPLOAD':
      return { label: 'รอส่ง', color: 'warning' as const }
    case 'UPLOADED':
      return { label: 'ส่งไฟล์แล้ว', color: 'info' as const }
    case 'UNDER_REVIEW':
      return { label: 'รอตรวจ', color: 'warning' as const }
    case 'APPROVED':
      return { label: 'ผ่านการตรวจสอบ', color: 'success' as const }
    case 'RETURNED_FOR_REVISION':
      return { label: 'แก้ไข', color: 'error' as const }
    case 'SUPERSEDED':
      return { label: 'ฉบับเก่า', color: 'neutral' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const columns: TableColumn<RequestItem>[] = [
  { accessorKey: 'id', header: 'เลขที่คำร้อง' },
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { accessorKey: 'position', header: 'ตำแหน่ง' },
  { accessorKey: 'province', header: 'จังหวัด' },
  { accessorKey: 'status', header: 'สถานะคำร้อง' },
  { id: 'documents', header: 'เอกสาร' },
  { id: 'actions', header: 'จัดการ' }
]
</script>

<template>
  <UDashboardPanel id="student-requests-page">
    <template #header>
      <UDashboardNavbar title="คำร้องสถานที่ฝึกงาน">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AppNotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Control Row -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="ค้นหาตามชื่อบริษัท หรือตำแหน่ง..."
            class="w-full sm:w-64"
          />

          <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'ทุกสถานะ', value: 'ALL' },
                { label: 'ส่งคำร้องแล้ว', value: 'SUBMITTED' },
                { label: 'รอเจ้าหน้าที่ดำเนินการ', value: 'STAFF_PROCESSING' },
                { label: 'มีหนังสือพร้อมดาวน์โหลด', value: 'LETTER_READY' },
                { label: 'รอตรวจสอบเอกสาร', value: 'DOCUMENT_UNDER_REVIEW' },
                { label: 'ถูกส่งกลับให้แก้ไข', value: 'RETURNED_FOR_REVISION' },
                { label: 'ยืนยันสถานที่ฝึกงานแล้ว', value: 'PLACEMENT_CONFIRMED' }
              ]"
              class="w-52"
            />
            <UButton
              v-if="search || statusFilter !== 'ALL'"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              label="ล้างตัวกรอง"
              size="sm"
              @click="search = ''; statusFilter = 'ALL'"
            />
            <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          </div>
        </div>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดคำร้องได้"
          :description="error.message"
        />

        <div class="rounded-lg border border-default bg-default overflow-hidden">
          <UTable
            :columns="columns"
            :data="filteredRequests"
            :loading="status === 'pending'"
            class="min-w-full"
          >
            <template #id-cell="{ row }">
              <span class=" text-xs text-muted">REQ-{{ String(row.original.id).padStart(4, '0') }}</span>
            </template>

            <template #companyName-cell="{ row }">
              <NuxtLink
                :to="`/student/requests/${row.original.id}`"
                class="font-medium text-highlighted hover:text-primary transition-colors text-sm"
              >
                {{ row.original.companyName }}
              </NuxtLink>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="getReqStatusBadge(row.original.status).color"
                variant="subtle"
                size="sm"
              >
                {{ getReqStatusBadge(row.original.status).label }}
              </UBadge>
            </template>

            <!-- Integrated Documents Column -->
            <template #documents-cell="{ row }">
              <div class="flex flex-col gap-1.5 py-1">
                <!-- Official Letter -->
                <div v-if="row.original.letterFilePath || ['LETTER_READY', 'DOCUMENT_UNDER_REVIEW', 'RETURNED_FOR_REVISION', 'PLACEMENT_CONFIRMED'].includes(row.original.status)">
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-download"
                    label="หนังสือขอความอนุเคราะห์"
                    :to="`/api/student/requests/${row.original.id}/letter`"
                    target="_blank"
                  />
                </div>

                <!-- Signed Document status & download/upload -->
                <template v-if="row.original.documents && row.original.documents[0]">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <UBadge
                      size="xs"
                      variant="subtle"
                      :color="getDocStatusBadge(row.original.documents[0].status).color"
                    >
                      ตอบรับ v.{{ row.original.documents[0].version }} ({{ getDocStatusBadge(row.original.documents[0].status).label }})
                    </UBadge>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-download"
                      :to="`/api/student/documents/${row.original.documents[0].id}/download`"
                      target="_blank"
                    />
                  </div>
                </template>

                <!-- Quick upload trigger -->
                <div v-if="['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(row.original.status)">
                  <UButton
                    size="xs"
                    :color="row.original.status === 'RETURNED_FOR_REVISION' ? 'error' : 'success'"
                    variant="outline"
                    icon="i-lucide-upload"
                    :label="row.original.status === 'RETURNED_FOR_REVISION' ? 'อัปโหลดฉบับแก้ไข' : 'ส่งหนังสือตอบรับ'"
                    @click="openUploadModal(row.original.id)"
                  />
                </div>

                <span
                  v-if="!row.original.letterFilePath && (!row.original.documents || row.original.documents.length === 0) && !['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(row.original.status)"
                  class="text-xs text-muted"
                >
                  รอออกหนังสือ
                </span>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                label="ดูรายละเอียด"
                :to="`/student/requests/${row.original.id}`"
              />
            </template>

            <template #empty>
              <div class="py-12 text-center text-muted space-y-2">
                <UIcon name="i-lucide-file-text" class="size-8 mx-auto opacity-40" />
                <p class="text-sm">ยังไม่มีคำร้องสถานที่ฝึกงาน</p>
                <p class="text-xs">เมื่อท่านได้รับการตอบรับจากบริษัทและกดยืนยัน คำร้องและเอกสารจะปรากฏที่นี่</p>
              </div>
            </template>
          </UTable>
        </div>
      </div>

      <!-- Upload Signed Document Modal -->
      <UModal v-model:open="isUploadModalOpen">
        <template #content>
          <div class="p-6 space-y-4">
            <h3 class="text-base font-semibold text-highlighted">อัปโหลดหนังสือตอบรับสถานประกอบการ</h3>
            <p class="text-xs text-muted leading-relaxed">
              รองรับไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10MB กรุณาตรวจสอบให้แน่ใจว่าเอกสารมีตราประทับหรือลายเซ็นผู้มีอำนาจครบถ้วน
            </p>

            <div class="space-y-2 pt-2">
              <label class="block text-xs font-medium text-highlighted">เลือกไฟล์เอกสาร</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                class="block w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                @change="onFileChange"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" label="ยกเลิก" @click="isUploadModalOpen = false" />
              <UButton
                color="primary"
                icon="i-lucide-upload"
                label="อัปโหลด"
                :loading="isUploading"
                :disabled="!selectedFile"
                @click="handleUpload"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
