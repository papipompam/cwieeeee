<script setup lang="ts">
import type { InputDateProps } from '@nuxt/ui'
import type { Ref } from 'vue'

interface StudentUser {
  id: number
  loginId: string
  prefix: string
  firstName: string
  lastName: string
  cohortYear: number
  classGroup: number
  phone: string | null
}

interface RequestDocument {
  id: number
  fileName: string
  fileSize: number
  mimeType: string
  status: string
  version: number
  createdAt: string
}

interface RequestDetail {
  id: number
  companyApplicationId: number
  status: string
  companyName: string
  internshipLocationName: string | null
  position: string | null
  address: string | null
  province: string | null
  recipientName: string | null
  recipientPosition: string | null
  letterAddress: string | null
  appliedAt: string | null
  confirmedAt: string
  returnedReason: string | null
  rejectedReason: string | null
  studentNote: string | null
  letterFilePath: string | null
  letterOriginalName: string | null
  letterIssuedAt: string | null
  signedDocumentPath: string | null
  signedDocumentOriginalName: string | null
  signedDocumentSubmittedAt: string | null
  activeLetterVersion: {
    version: number
    source: 'GENERATED' | 'UPLOADED'
    letterNumber: string | null
    issueDate: string | null
    templateVersion: string | null
    signerName: string | null
    signerTitle: string | null
    issuedByUser: { prefix: string | null, firstName: string | null, lastName: string | null } | null
  } | null
  activeSendingLetterVersion: {
    version: number
    letterNumber: string
    issueDate: string
    referenceLetterNumber: string
    referenceIssueDate: string
    templateVersion: string
    createdAt: string
  } | null
  letterCycle: {
    term: number
    academicYear: number
    internshipHours: number | null
    internshipStartDate: string
    internshipEndDate: string
  }
  companyApplication: {
    studentUser: StudentUser
  }
  documents: RequestDocument[]
}

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  status: string
}

const route = useRoute()
const router = useRouter()
const cycleId = computed(() => Number(route.params.cycleId))
const requestId = computed(() => Number(route.params.requestId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')
const notify = useNotify()

const { data: request, status: fetchStatus, refresh, error } = await useFetch<RequestDetail>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}`
)

const isClosed = computed(() => cycle?.value?.status === 'CLOSED')
const canManageLetter = computed(() => request.value && !isClosed.value && !['PLACEMENT_CONFIRMED', 'REJECTED', 'CANCELLED'].includes(request.value.status))

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '—'
  const d = new Date(dStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '—'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const requestStatusDisplay: Record<string, { label: string; color: 'info' | 'warning' | 'error' | 'success' | 'neutral' }> = {
  SUBMITTED: { label: 'ยื่นคำร้องแล้ว', color: 'info' },
  STAFF_PROCESSING: { label: 'กำลังดำเนินการ', color: 'info' },
  LETTER_READY: { label: 'หนังสือพร้อมแล้ว', color: 'warning' },
  DOCUMENT_UNDER_REVIEW: { label: 'รอตรวจสอบเอกสาร', color: 'warning' },
  RETURNED_FOR_REVISION: { label: 'ส่งกลับแก้ไข', color: 'error' },
  PLACEMENT_CONFIRMED: { label: 'ยืนยันสถานที่แล้ว', color: 'success' },
  REJECTED: { label: 'ปฏิเสธ', color: 'neutral' },
  CANCELLED: { label: 'ยกเลิก', color: 'neutral' }
}

// Letter upload & replace
const letterFileInput = ref<HTMLInputElement | null>(null)
const isLetterUploading = ref(false)
const isConfirmReplaceOpen = ref(false)

const triggerLetterUpload = () => {
  if (request.value?.letterFilePath) {
    isConfirmReplaceOpen.value = true
  } else {
    letterFileInput.value?.click()
  }
}

const onConfirmedReplace = () => {
  isConfirmReplaceOpen.value = false
  letterFileInput.value?.click()
}

const handleLetterUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    notify.error('อนุญาตเฉพาะไฟล์ PDF เท่านั้น')
    target.value = ''
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    notify.error('ขนาดไฟล์ต้องไม่เกิน 10MB')
    target.value = ''
    return
  }

  isLetterUploading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/letter`, {
      method: 'POST',
      body: formData
    })
    notify.success('แนบหนังสือขอความอนุเคราะห์สำเร็จ')
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์')
  } finally {
    isLetterUploading.value = false
    target.value = ''
  }
}

const isLetterModalOpen = ref(false)
const letterKind = ref<'request' | 'sending'>('request')
const isLetterPreviewing = ref(false)
const isLetterGenerating = ref(false)
const letterPreviewError = ref('')
const letterNumberError = ref('')
const issueDateError = ref('')
const letterPreviewUrl = ref<string | null>(null)
const letterNumber = ref('')
const issueDate = shallowRef<InputDateProps<false>['modelValue']>()

const revokeLetterPreview = () => {
  if (letterPreviewUrl.value) URL.revokeObjectURL(letterPreviewUrl.value)
  letterPreviewUrl.value = null
}

const openLetterModal = () => {
  letterKind.value = 'request'
  revokeLetterPreview()
  letterPreviewError.value = ''
  letterNumberError.value = ''
  issueDateError.value = ''
  letterNumber.value = request.value?.activeLetterVersion?.letterNumber || ''
  issueDate.value = undefined
  isLetterModalOpen.value = true
}

const openSendingLetterModal = () => {
  letterKind.value = 'sending'
  revokeLetterPreview()
  letterPreviewError.value = ''
  letterNumberError.value = ''
  issueDateError.value = ''
  letterNumber.value = request.value?.activeSendingLetterVersion?.letterNumber || ''
  issueDate.value = undefined
  isLetterModalOpen.value = true
}

const closeLetterModal = () => {
  isLetterModalOpen.value = false
  revokeLetterPreview()
}

const getLetterInput = () => {
  const normalizedLetterNumber = letterNumber.value.trim()
  const normalizedIssueDate = issueDate.value?.toString()
  letterNumberError.value = normalizedLetterNumber ? '' : 'กรุณาระบุเลขที่หนังสือ'
  issueDateError.value = normalizedIssueDate ? '' : 'กรุณาเลือกวันที่ออกหนังสือ'
  return normalizedLetterNumber && normalizedIssueDate
    ? { letterNumber: normalizedLetterNumber, issueDate: normalizedIssueDate }
    : null
}

const getApiErrorMessage = async (err: any, fallback: string) => {
  if (err?.data instanceof Blob) {
    try {
      const body = JSON.parse(await err.data.text())
      if (typeof body?.message === 'string') return body.message
    } catch {
      // Fall through to the safe fallback below.
    }
  }
  return err?.data?.message || fallback
}

const previewLetter = async () => {
  const input = getLetterInput()
  if (!input) return

  isLetterPreviewing.value = true
  letterPreviewError.value = ''
  revokeLetterPreview()
  try {
    const endpoint = letterKind.value === 'sending' ? 'sending-letter/preview' : 'letter/preview'
    const pdf = await $fetch<Blob>(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/${endpoint}`, {
      method: 'POST',
      body: input,
      responseType: 'blob'
    })
    letterPreviewUrl.value = URL.createObjectURL(pdf)
  } catch (err: any) {
    const message = await getApiErrorMessage(err, 'ไม่สามารถสร้างตัวอย่างเอกสารได้')
    letterPreviewError.value = message
    notify.error(message)
  } finally {
    isLetterPreviewing.value = false
  }
}

const openFullPagePreview = () => {
  const input = getLetterInput()
  if (!input) return

  const previewRoute = router.resolve({
    path: `/staff/cooperative-cycles/${cycleId.value}/applications/${requestId.value}-letter-preview`,
    query: { ...input, kind: letterKind.value }
  })
  window.open(previewRoute.href, '_blank', 'noopener')
}

const generateLetter = async () => {
  const input = getLetterInput()
  if (!input) return

  isLetterGenerating.value = true
  try {
    const endpoint = letterKind.value === 'sending' ? 'sending-letter/generate' : 'letter/generate'
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/${endpoint}`, {
      method: 'POST',
      body: input
    })
    notify.success(letterKind.value === 'sending' ? 'จัดทำหนังสือส่งตัวเรียบร้อยแล้ว' : 'จัดทำหนังสือขอความอนุเคราะห์เรียบร้อยแล้ว')
    closeLetterModal()
    await refresh()
  } catch (err: any) {
    const message = await getApiErrorMessage(err, 'ไม่สามารถจัดทำหนังสือได้')
    letterPreviewError.value = message
    notify.error(message)
  } finally {
    isLetterGenerating.value = false
  }
}

onBeforeUnmount(revokeLetterPreview)

// Return for revision modal state
const isReturnOpen = ref(false)
const returnReason = ref('')
const returnReasonError = ref('')
const isReturning = ref(false)

const openReturnModal = () => {
  returnReason.value = ''
  returnReasonError.value = ''
  isReturnOpen.value = true
}

const handleReturn = async () => {
  if (!returnReason.value.trim()) {
    returnReasonError.value = 'กรุณาระบุสิ่งที่นักศึกษาต้องแก้ไข'
    return
  }
  returnReasonError.value = ''
  isReturning.value = true

  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/return`, {
      method: 'POST',
      body: { reason: returnReason.value.trim() }
    })
    notify.success('ส่งกลับให้นักศึกษาแก้ไขเรียบร้อยแล้ว')
    isReturnOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถส่งกลับแก้ไขได้')
  } finally {
    isReturning.value = false
  }
}

// Reject modal state
const isRejectOpen = ref(false)
const rejectReason = ref('')
const rejectReasonError = ref('')
const isRejecting = ref(false)

const openRejectModal = () => {
  rejectReason.value = ''
  rejectReasonError.value = ''
  isRejectOpen.value = true
}

const handleReject = async () => {
  if (!rejectReason.value.trim()) {
    rejectReasonError.value = 'กรุณาระบุเหตุผลในการปฏิเสธ'
    return
  }
  rejectReasonError.value = ''
  isRejecting.value = true

  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value.trim() }
    })
    notify.success('ปฏิเสธคำร้องเรียบร้อยแล้ว')
    isRejectOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถปฏิเสธคำร้องได้')
  } finally {
    isRejecting.value = false
  }
}

// Confirm placement modal state
const isConfirmPlacementOpen = ref(false)
const isConfirmingPlacement = ref(false)

const handleConfirmPlacement = async () => {
  isConfirmingPlacement.value = true

  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/confirm-placement`, {
      method: 'POST'
    })
    notify.success('ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว')
    isConfirmPlacementOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถยืนยันสถานที่ฝึกงานได้')
  } finally {
    isConfirmingPlacement.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb & Back Action -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :to="`/staff/cooperative-cycles/${cycleId}/applications`"
          aria-label="กลับไปคิวคำร้อง"
        />
        <div>
          <h2 class="text-base font-bold text-ink flex items-center gap-2">
            รายละเอียดคำร้อง #{{ requestId }}
            <UBadge
              v-if="request"
              :label="requestStatusDisplay[request.status]?.label || request.status"
              :color="requestStatusDisplay[request.status]?.color || 'neutral'"
              variant="subtle"
            />
          </h2>
          <p v-if="request" class="text-xs text-muted">
            {{ request.companyApplication.studentUser.prefix }}{{ request.companyApplication.studentUser.firstName }}
            {{ request.companyApplication.studentUser.lastName }} ({{ request.companyApplication.studentUser.loginId }})
          </p>
        </div>
      </div>

      <!-- Action buttons -->
      <div v-if="request && !isClosed" class="flex flex-wrap items-center justify-end gap-2">
        <UButton
          v-if="canManageLetter"
          :label="request.letterFilePath ? 'ออกเอกสารฉบับใหม่' : 'ออกเอกสาร'"
          icon="i-lucide-file-pen-line"
          color="primary"
          size="xl"
          @click="openLetterModal"
        />
        <UButton
          v-if="request.status === 'PLACEMENT_CONFIRMED'"
          :label="request.activeSendingLetterVersion ? 'ออกหนังสือส่งตัวฉบับใหม่' : 'ออกหนังสือส่งตัว'"
          icon="i-lucide-send"
          color="primary"
          size="xl"
          @click="openSendingLetterModal"
        />
        <UButton
          v-if="request.activeSendingLetterVersion"
          label="เปิดหนังสือส่งตัว"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
          size="xl"
          :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${requestId}/sending-letter`"
          target="_blank"
        />
        <!-- Reject action: available in pre-confirmed states -->
        <UButton
          v-if="['SUBMITTED', 'STAFF_PROCESSING', 'DOCUMENT_UNDER_REVIEW'].includes(request.status)"
          label="ปฏิเสธคำร้อง"
          icon="i-lucide-x-circle"
          color="error"
          variant="ghost"
          size="xl"
          @click="openRejectModal"
        />

        <!-- Return for revision: only in DOCUMENT_UNDER_REVIEW -->
        <UButton
          v-if="request.status === 'DOCUMENT_UNDER_REVIEW'"
          label="ส่งกลับแก้ไข"
          icon="i-lucide-undo-2"
          color="warning"
          variant="outline"
          size="xl"
          @click="openReturnModal"
        />

        <!-- Confirm placement: only in DOCUMENT_UNDER_REVIEW -->
        <UButton
          v-if="request.status === 'DOCUMENT_UNDER_REVIEW'"
          label="ยืนยันสถานที่ฝึกงาน"
          icon="i-lucide-check-circle"
          color="success"
          size="xl"
          @click="isConfirmPlacementOpen = true"
        />
      </div>
    </div>

    <!-- Error or Loading -->
    <div v-if="fetchStatus === 'pending'" class="py-16 text-center text-muted">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin mx-auto mb-2 text-primary" />
      <p>กำลังโหลดข้อมูลคำร้อง...</p>
    </div>

    <div v-else-if="error || !request" class="p-6">
      <UEmpty
        icon="i-lucide-alert-circle"
        title="ไม่พบข้อมูลคำร้อง"
        :description="error?.message || 'คำร้องนี้อาจไม่ได้อยู่ในรอบสหกิจที่เลือก'"
        variant="subtle"
        class="min-h-64"
      >
        <template #actions>
          <UButton label="กลับไปคิวคำร้อง" color="neutral" variant="outline" :to="`/staff/cooperative-cycles/${cycleId}/applications`" />
        </template>
      </UEmpty>
    </div>

    <div v-else class="space-y-6">
      <!-- Status Notice Banners -->
      <UAlert
        v-if="request.returnedReason && request.status === 'RETURNED_FOR_REVISION'"
        color="warning"
        icon="i-lucide-alert-triangle"
        title="คำร้องนี้ถูกส่งกลับให้นักศึกษาแก้ไข"
        :description="`เหตุผลที่แจ้งนักศึกษา: ${request.returnedReason}`"
      />

      <UAlert
        v-if="request.rejectedReason && request.status === 'REJECTED'"
        color="error"
        icon="i-lucide-x-circle"
        title="คำร้องนี้ถูกปฏิเสธ"
        :description="`เหตุผล: ${request.rejectedReason}`"
      />

      <UAlert
        v-if="request.status === 'PLACEMENT_CONFIRMED'"
        color="success"
        icon="i-lucide-check-check"
        title="ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว"
        description="คำร้องนี้เสร็จสิ้นกระบวนการและบันทึกเป็นสถานที่ฝึกงานที่ยืนยันแล้วของรอบนี้"
      />

      <!-- Grid: 2 columns on large screens -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 Cols: Main details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Card: Snapshot Information -->
          <div class="rounded-panel border border-divider bg-canvas p-5 shadow-panel space-y-4">
            <h3 class="text-sm font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="size-4 text-primary" />
              ข้อมูลสถานประกอบการและตำแหน่ง (Snapshot จากคำร้อง)
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-xs text-muted block">ชื่อสถานประกอบการ</span>
                <span class="font-medium text-ink">{{ request.companyName }}</span>
              </div>

              <div>
                <span class="text-xs text-muted block">ตำแหน่งที่สมัคร</span>
                <span class="font-medium text-ink">{{ request.position || '—' }}</span>
              </div>

              <div>
                <span class="text-xs text-muted block">สถานที่ฝึกงานจริง</span>
                <span>{{ request.internshipLocationName || 'สำนักงานใหญ่ / ตามที่อยู่' }}</span>
              </div>

              <div>
                <span class="text-xs text-muted block">จังหวัด</span>
                <span>{{ request.province || '—' }}</span>
              </div>

              <div class="sm:col-span-2">
                <span class="text-xs text-muted block">ที่อยู่</span>
                <span>{{ request.address || '—' }}</span>
              </div>
            </div>

            <div class="border-t border-divider pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-xs text-muted block">ผู้รับหนังสือขอความอนุเคราะห์</span>
                <span class="font-medium text-ink">
                  {{ request.recipientName || 'ผู้จัดการฝ่ายบุคคล' }}
                  <span v-if="request.recipientPosition" class="text-muted text-xs">({{ request.recipientPosition }})</span>
                </span>
              </div>

              <div class="sm:col-span-2">
                <span class="text-xs text-muted block">ที่อยู่ระบุในหนังสือ</span>
                <span>{{ request.letterAddress || request.address || '—' }}</span>
              </div>

              <div v-if="request.studentNote" class="sm:col-span-2 bg-surface p-3 rounded-control border border-divider">
                <span class="text-xs text-muted block font-medium mb-1">หมายเหตุเพิ่มเติมจากนักศึกษา:</span>
                <p class="text-xs text-ink">{{ request.studentNote }}</p>
              </div>
            </div>
          </div>

          <!-- Card: Student Acceptance Document (เอกสารตอบรับ) -->
          <div class="rounded-panel border border-divider bg-canvas p-5 shadow-panel space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-ink flex items-center gap-2">
                <UIcon name="i-lucide-file-badge" class="size-4 text-primary" />
                หนังสือตอบรับจากสถานประกอบการ
              </h3>
              <UBadge
                v-if="request.documents.length > 0"
                :label="`มี ${request.documents.length} ฉบับ`"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>

            <div v-if="request.documents.length === 0" class="py-8 text-center text-muted">
              <UIcon name="i-lucide-file-question" class="size-8 mx-auto mb-1.5 text-muted" />
              <p class="text-sm">นักศึกษายังไม่ได้อัปโหลดหนังสือตอบรับ</p>
              <p class="text-xs text-muted mt-0.5">
                เมื่อเจ้าหน้าที่แนบหนังสือขอความอนุเคราะห์แล้ว นักศึกษาจะนำไปยื่นและอัปโหลดหนังสือตอบรับกลับมา
              </p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="doc in request.documents"
                :key="doc.id"
                class="flex items-center justify-between p-3 rounded-control border border-divider bg-surface"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="size-9 rounded-control bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-file-text" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-ink truncate">{{ doc.fileName }}</span>
                      <UBadge
                        :label="`ฉบับที่ ${doc.version}`"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                      <UBadge
                        v-if="doc.status === 'APPROVED'"
                        label="อนุมัติแล้ว"
                        color="success"
                        variant="subtle"
                        size="xs"
                      />
                      <UBadge
                        v-else-if="doc.status === 'RETURNED_FOR_REVISION'"
                        label="ส่งกลับแก้ไข"
                        color="error"
                        variant="subtle"
                        size="xs"
                      />
                      <UBadge
                        v-else
                        label="รอตรวจ"
                        color="warning"
                        variant="subtle"
                        size="xs"
                      />
                    </div>
                    <div class="text-xs text-muted mt-0.5 flex items-center gap-2">
                      <span>ขนาด {{ formatFileSize(doc.fileSize) }}</span>
                      <span>•</span>
                      <span>อัปโหลดเมื่อ {{ formatDate(doc.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <UButton
                  label="ดาวน์โหลด / เปิดดู"
                  icon="i-lucide-download"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${requestId}/documents/${doc.id}`"
                  target="_blank"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right 1 Col: Official Letter & Timeline -->
        <div class="space-y-6">
          <!-- Card: Official Letter from Staff -->
          <div class="rounded-panel border border-divider bg-canvas p-5 shadow-panel space-y-4">
            <h3 class="text-sm font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-stamp" class="size-4 text-primary" />
              หนังสือขอความอนุเคราะห์
            </h3>

            <!-- Hidden file input -->
            <input
              ref="letterFileInput"
              type="file"
              accept="application/pdf"
              class="sr-only"
              aria-label="เลือกไฟล์ PDF หนังสือขอความอนุเคราะห์"
              @change="handleLetterUpload"
            />

            <!-- Case: Has letter -->
            <div v-if="request.letterFilePath" class="space-y-3">
              <div class="p-3 rounded-control border border-divider bg-surface flex items-start gap-3">
                <UIcon name="i-lucide-file-check" class="size-6 text-success shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-ink truncate">
                    {{ request.letterOriginalName || 'official-letter.pdf' }}
                  </div>
                  <div class="text-xs text-muted mt-0.5">
                    ออกเมื่อ: {{ formatDate(request.letterIssuedAt) }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  label="เปิดดู"
                  icon="i-lucide-external-link"
                  color="primary"
                  variant="outline"
                  size="xl"
                  class="flex-1 justify-center"
                  :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${requestId}/letter`"
                  target="_blank"
                />
              </div>
              <UButton
                v-if="canManageLetter"
                label="อัปโหลดแทน"
                icon="i-lucide-upload"
                color="neutral"
                variant="outline"
                size="xl"
                class="w-full justify-center"
                :loading="isLetterUploading"
                @click="triggerLetterUpload"
              />
              <dl v-if="request.activeLetterVersion" class="grid gap-2 border-t border-divider pt-3 text-xs">
                <div v-if="request.activeLetterVersion.letterNumber" class="flex justify-between gap-3"><dt class="text-muted">เลขที่หนังสือ</dt><dd class="text-right font-medium text-ink">{{ request.activeLetterVersion.letterNumber }}</dd></div>
                <div v-if="request.activeLetterVersion.issueDate" class="flex justify-between gap-3"><dt class="text-muted">วันที่ออก</dt><dd class="text-right text-ink">{{ formatDate(request.activeLetterVersion.issueDate) }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">ฉบับเอกสาร</dt><dd class="text-right text-ink">{{ request.activeLetterVersion.version }}</dd></div>
                <div v-if="request.activeLetterVersion.templateVersion" class="flex justify-between gap-3"><dt class="text-muted">Template</dt><dd class="text-right text-ink">{{ request.activeLetterVersion.templateVersion }}</dd></div>
              </dl>
            </div>

            <!-- Case: No letter -->
            <div v-else class="space-y-3">
              <div class="p-4 text-center rounded-control border border-dashed border-divider bg-surface text-muted">
                <UIcon name="i-lucide-file-up" class="size-6 mx-auto mb-1 text-muted" />
                <p class="text-xs">ยังไม่มีการแนบหนังสือขอความอนุเคราะห์</p>
              </div>

              <div v-if="canManageLetter" class="grid gap-2">
                <p class="text-center text-xs leading-5 text-muted">กดปุ่ม “ออกเอกสาร” ด้านบนเพื่อระบุเลขที่และวันที่ออกหนังสือ</p>
                <UButton label="อัปโหลด PDF" icon="i-lucide-upload" color="neutral" variant="outline" size="xl" class="w-full justify-center" :loading="isLetterUploading" @click="triggerLetterUpload" />
              </div>
            </div>
          </div>

          <!-- Card: Student Profile Summary -->
          <div class="rounded-panel border border-divider bg-canvas p-5 shadow-panel space-y-3">
            <h3 class="text-sm font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-user" class="size-4 text-primary" />
              ข้อมูลนักศึกษา
            </h3>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-muted">ชื่อ-นามสกุล:</span>
                <span class="font-medium text-ink">
                  {{ request.companyApplication.studentUser.prefix }}{{ request.companyApplication.studentUser.firstName }}
                  {{ request.companyApplication.studentUser.lastName }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">รหัสนักศึกษา:</span>
                <span class="font-medium text-ink">{{ request.companyApplication.studentUser.loginId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">รุ่น / หมู่เรียน:</span>
                <span>รุ่น {{ request.companyApplication.studentUser.cohortYear }} · หมู่ {{ request.companyApplication.studentUser.classGroup }}</span>
              </div>
              <div v-if="request.companyApplication.studentUser.phone" class="flex justify-between">
                <span class="text-muted">เบอร์โทรศัพท์:</span>
                <span>{{ request.companyApplication.studentUser.phone }}</span>
              </div>
            </div>
          </div>

          <!-- Card: Timestamps Timeline -->
          <div class="rounded-panel border border-divider bg-canvas p-5 shadow-panel space-y-3">
            <h3 class="text-sm font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="size-4 text-primary" />
              ลำดับเวลาในระบบ
            </h3>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-muted">นักศึกษายืนยันคำร้อง:</span>
                <span>{{ formatDate(request.confirmedAt) }}</span>
              </div>
              <div v-if="request.letterIssuedAt" class="flex justify-between">
                <span class="text-muted">เจ้าหน้าที่ออกหนังสือ:</span>
                <span>{{ formatDate(request.letterIssuedAt) }}</span>
              </div>
              <div v-if="request.signedDocumentSubmittedAt" class="flex justify-between">
                <span class="text-muted">ส่งเอกสารตอบรับล่าสุด:</span>
                <span>{{ formatDate(request.signedDocumentSubmittedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="isLetterModalOpen"
      :title="letterKind === 'sending' ? 'จัดทำหนังสือส่งตัว' : 'จัดทำหนังสือขอความอนุเคราะห์'"
      :description="letterKind === 'sending' ? 'ระบุเลขที่และวันที่ออกหนังสือส่งตัว แล้วตรวจตัวอย่างก่อนบันทึกฉบับจริง' : 'ระบุเลขที่และวันที่ออกหนังสือ แล้วดูตัวอย่างก่อนบันทึกฉบับจริง'"
      :ui="{ content: 'max-w-5xl' }"
      @update:open="open => { if (!open) revokeLetterPreview() }"
    >
      <template #body>
        <div class="grid gap-6 lg:grid-cols-2">
          <UForm class="grid content-start gap-5" @submit.prevent="previewLetter">
            <UFormField label="เลขที่หนังสือ" required :error="letterNumberError">
              <UInput v-model="letterNumber" class="w-full" size="xl" placeholder="เช่น ๑๒๓/๒๕๖๙" autocomplete="off" />
            </UFormField>
            <UFormField label="วันที่ออกหนังสือ" required :error="issueDateError">
              <UPopover>
                <UInputDate v-model="issueDate" class="w-full" size="xl" locale="th-TH" aria-label="Select a date" />
                <template #content>
                  <UCalendar v-model="issueDate" locale="th-TH" />
                </template>
              </UPopover>
            </UFormField>

            <div class="rounded-panel border border-divider bg-surface p-4 text-sm">
              <h3 class="font-semibold text-ink">ข้อมูลที่ใช้จัดทำเอกสาร</h3>
              <dl class="mt-3 grid gap-2 text-muted">
                <div class="flex justify-between gap-4"><dt>ผู้รับ</dt><dd class="text-right text-ink">{{ request?.recipientName || '—' }}</dd></div>
                <div class="flex justify-between gap-4"><dt>สถานประกอบการ</dt><dd class="text-right text-ink">{{ request?.companyName || '—' }}</dd></div>
                <div class="flex justify-between gap-4"><dt>นักศึกษา</dt><dd class="text-right text-ink">{{ request?.companyApplication.studentUser.prefix }}{{ request?.companyApplication.studentUser.firstName }} {{ request?.companyApplication.studentUser.lastName }}</dd></div>
                <div class="flex justify-between gap-4"><dt>ภาคเรียน / ปีการศึกษา</dt><dd class="text-right text-ink">{{ request?.letterCycle.term }} / {{ request?.letterCycle.academicYear }}</dd></div>
                <div class="flex justify-between gap-4"><dt>ชั่วโมงฝึก</dt><dd class="text-right text-ink">{{ request?.letterCycle.internshipHours ?? 'ยังไม่กำหนด' }}</dd></div>
                <div class="flex justify-between gap-4"><dt>ระยะเวลาฝึก</dt><dd class="text-right text-ink">{{ formatDate(request?.letterCycle.internshipStartDate) }} – {{ formatDate(request?.letterCycle.internshipEndDate) }}</dd></div>
              </dl>
              <p class="mt-3 text-xs text-muted">ผู้ลงนามและลายเซ็นกำหนดจากการตั้งค่าระบบ และจะตรวจสอบเมื่อสร้างตัวอย่างหรือบันทึกเอกสาร</p>
            </div>

            <UAlert v-if="letterPreviewError" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถดำเนินการได้" :description="letterPreviewError" />
          </UForm>

          <section class="min-w-0 rounded-panel border border-divider bg-surface p-3">
            <div v-if="letterPreviewUrl" class="space-y-2">
              <p class="px-1 text-sm font-semibold text-ink">ตัวอย่างเอกสาร</p>
              <iframe :src="letterPreviewUrl" :title="letterKind === 'sending' ? 'ตัวอย่างหนังสือส่งตัว' : 'ตัวอย่างหนังสือขอความอนุเคราะห์'" class="h-[60vh] w-full rounded-control border border-divider bg-canvas" />
            </div>
            <div v-else class="grid min-h-64 place-items-center p-6 text-center text-muted">
              <div><UIcon name="i-lucide-file-search" class="mx-auto size-8" /><p class="mt-2 text-sm">กรอกข้อมูลแล้วกด “ดูตัวอย่าง”</p></div>
            </div>
          </section>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton label="ยกเลิก" color="neutral" variant="outline" size="xl" :disabled="isLetterPreviewing || isLetterGenerating" @click="closeLetterModal" />
          <UButton label="ดูตัวอย่างในหน้าต่างนี้" icon="i-lucide-eye" color="neutral" variant="outline" size="xl" :loading="isLetterPreviewing" :disabled="isLetterGenerating" @click="previewLetter" />
          <UButton label="ดูตัวอย่างเต็มหน้า" icon="i-lucide-expand" color="neutral" variant="outline" size="xl" :disabled="isLetterPreviewing || isLetterGenerating" @click="openFullPagePreview" />
          <UButton :label="letterKind === 'sending' ? 'ยืนยันจัดทำหนังสือส่งตัว' : 'ยืนยันจัดทำหนังสือ'" icon="i-lucide-file-check-2" color="primary" size="xl" :loading="isLetterGenerating" :disabled="isLetterPreviewing" @click="generateLetter" />
        </div>
      </template>
    </UModal>

    <!-- Modal: Return for revision -->
    <UModal
      v-model:open="isReturnOpen"
      title="ส่งกลับเอกสารให้นักศึกษาแก้ไข"
      description="ระบุข้อผิดพลาดหรือสิ่งที่นักศึกษาต้องดำเนินการแก้ไขและส่งกลับมาใหม่"
    >
      <template #body>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink mb-1.5">
              ข้อความแจ้งให้นักศึกษาแก้ไข <span class="text-error">*</span>
            </label>
            <UTextarea
              v-model="returnReason"
              placeholder="เช่น เอกสารยังไม่มีตราประทับบริษัท หรือเอกสารไม่สมบูรณ์..."
              :rows="4"
              class="w-full"
              size="xl"
            />
            <p v-if="returnReasonError" class="text-xs text-error mt-1">
              {{ returnReasonError }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            size="xl"
            @click="isReturnOpen = false"
          />
          <UButton
            label="ยืนยันส่งกลับแก้ไข"
            color="warning"
            size="xl"
            :loading="isReturning"
            @click="handleReturn"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Reject Request -->
    <UModal
      v-model:open="isRejectOpen"
      title="ปฏิเสธคำร้อง"
      description="คำร้องนี้จะไม่สามารถดำเนินการต่อได้ และจะแจ้งให้นักศึกษาทราบ"
      size="xl"
    >
      <template #body>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink mb-1.5">
              เหตุผลในการปฏิเสธ <span class="text-error">*</span>
            </label>
            <UTextarea
              v-model="rejectReason"
              placeholder="ระบุเหตุผลในการปฏิเสธคำร้อง..."
              :rows="4"
              class="w-full"
              size="xl"
            />
            <p v-if="rejectReasonError" class="text-xs text-error mt-1">
              {{ rejectReasonError }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            size="xl"
            @click="isRejectOpen = false"
          />
          <UButton
            label="ยืนยันปฏิเสธคำร้อง"
            color="error"
            size="xl"
            :loading="isRejecting"
            @click="handleReject"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Confirm Placement -->
    <UIConfirmModal
      :open="isConfirmPlacementOpen"
      title="ยืนยันสถานที่ฝึกงาน"
      message="ยืนยันว่าเอกสารตอบรับถูกต้องครบถ้วน และรับรองสถานที่ฝึกงานนี้เป็นสถานที่ปฏิบัติงานจริงในรอบนี้?"
      confirm-label="ยืนยันสถานที่ฝึกงาน"
      confirm-color="success"
      icon="i-lucide-check-circle"
      icon-color="success"
      :loading="isConfirmingPlacement"
      @update:open="isConfirmPlacementOpen = $event"
      @confirm="handleConfirmPlacement"
    />

    <!-- Modal: Confirm Replace Letter -->
    <UIConfirmModal
      :open="isConfirmReplaceOpen"
      title="แทนที่หนังสือขอความอนุเคราะห์"
      message="คำร้องนี้มีไฟล์หนังสือเดิมอยู่แล้ว ต้องการอัปโหลดไฟล์ใหม่แทนที่ไฟล์เดิมหรือไม่?"
      confirm-label="เลือกไฟล์ใหม่"
      confirm-color="primary"
      icon="i-lucide-refresh-cw"
      icon-color="info"
      @update:open="isConfirmReplaceOpen = $event"
      @confirm="onConfirmedReplace"
    />
  </div>
</template>
