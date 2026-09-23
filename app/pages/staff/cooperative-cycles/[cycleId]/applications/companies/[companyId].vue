<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

type ResponseStatus = 'UPLOADED' | 'UNDER_REVIEW' | 'RETURNED_FOR_REVISION' | 'APPROVED'

const route = useRoute()
const notify = useNotify()
const cycleId = computed(() => Number(route.params.cycleId))
const companyId = computed(() => Number(route.params.companyId))
const { data, status, error, refresh } = await useFetch<any>(() => `/api/staff/cooperative-cycles/${cycleId.value}/companies/${companyId.value}`)

const selectedLetter = ref<any | null>(null)
const previewKind = ref<'request' | 'response'>('request')
const isPreviewOpen = ref(false)
const isPlacementConfirmationOpen = ref(false)
const isReturnOpen = ref(false)
const isReviewing = ref(false)
const returnReason = ref('')
const returnReasonError = ref('')
const actionError = ref('')

const letters = computed<any[]>(() => data.value?.letters || [])
const applicationRows = computed<any[]>(() => data.value?.company.companyApplications || [])
const activeLetter = computed(() => letters.value.find(letter => letter.isActive) || null)
const latestLetterUrl = computed(() => activeLetter.value ? requestLetterUrl(activeLetter.value) : null)
const canGenerateSendingLetter = computed(() => Boolean(activeLetter.value?.participants?.length) && activeLetter.value.participants.every((item: any) => item.cooperativeRequest.status === 'PLACEMENT_CONFIRMED'))

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const requestStatus = (value?: string) => ({
  SUBMITTED: 'ยื่นคำร้องแล้ว', STAFF_PROCESSING: 'กำลังดำเนินการ', LETTER_READY: 'หนังสือพร้อมแล้ว', DOCUMENT_UNDER_REVIEW: 'รอตรวจสอบเอกสาร', RETURNED_FOR_REVISION: 'ส่งกลับแก้ไข', PLACEMENT_CONFIRMED: 'ยืนยันสถานที่แล้ว', REJECTED: 'ปฏิเสธคำร้อง', CANCELLED: 'ยกเลิกคำร้อง'
}[value || ''] || '—')
const responseStatus = (value?: ResponseStatus): { label: string, color: 'warning' | 'error' | 'success' | 'neutral' } => {
  const statuses: Record<ResponseStatus, { label: string, color: 'warning' | 'error' | 'success' }> = {
    UPLOADED: { label: 'ได้รับหนังสือตอบรับ รอตรวจสอบ', color: 'warning' },
    UNDER_REVIEW: { label: 'ได้รับหนังสือตอบรับ รอตรวจสอบ', color: 'warning' },
    RETURNED_FOR_REVISION: { label: 'ส่งกลับแก้ไขหนังสือตอบรับ', color: 'error' },
    APPROVED: { label: 'ยืนยันสถานที่ฝึกแล้ว', color: 'success' }
  }
  return value ? statuses[value] : { label: 'รอนักศึกษาส่งหนังสือตอบรับ', color: 'neutral' }
}
const requestLetterUrl = (letter: any) => `/api/staff/cooperative-cycles/${cycleId.value}/requests/${letter.cooperativeRequestId}/letter`
const responseDocumentUrl = (letter: any) => `/api/staff/cooperative-cycles/${cycleId.value}/requests/${letter.cooperativeRequestId}/documents/${letter.responseDocuments[0].id}`
const openPreview = (letter: any, kind: 'request' | 'response') => { selectedLetter.value = letter; previewKind.value = kind; actionError.value = ''; isPreviewOpen.value = true }
const openReturnModal = () => { returnReason.value = ''; returnReasonError.value = ''; isReturnOpen.value = true }

const confirmPlacement = async () => {
  if (!selectedLetter.value || isReviewing.value) return
  isReviewing.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${selectedLetter.value.cooperativeRequestId}/confirm-placement`, { method: 'POST' })
    notify.success('ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว')
    isPlacementConfirmationOpen.value = false
    isPreviewOpen.value = false
    await refresh()
  } catch (error: any) {
    actionError.value = error?.data?.message || 'ไม่สามารถยืนยันสถานที่ฝึกงานได้'
  } finally {
    isReviewing.value = false
  }
}

const returnResponse = async () => {
  if (!selectedLetter.value || isReviewing.value) return
  if (!returnReason.value.trim()) { returnReasonError.value = 'กรุณาระบุสิ่งที่นักศึกษาต้องแก้ไข'; return }
  isReviewing.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${selectedLetter.value.cooperativeRequestId}/return`, { method: 'POST', body: { reason: returnReason.value.trim() } })
    notify.success('ส่งกลับให้นักศึกษาแก้ไขเรียบร้อยแล้ว')
    isReturnOpen.value = false
    isPreviewOpen.value = false
    await refresh()
  } catch (error: any) {
    actionError.value = error?.data?.message || 'ไม่สามารถส่งกลับแก้ไขได้'
  } finally {
    isReviewing.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 class="text-xl font-bold text-ink">รายละเอียดสถานประกอบการ</h1><p class="mt-1 text-sm text-muted">จัดการชุดเอกสารและนักศึกษาในรอบสหกิจนี้</p></div>
      <div class="flex flex-wrap gap-2">
        <UButton :to="`/staff/cooperative-cycles/${cycleId}/applications?companyId=${companyId}&action=create`" color="primary" size="xl" icon="i-lucide-file-plus-2" label="ออกหนังสือฉบับใหม่" />
        <UButton v-if="canGenerateSendingLetter" :to="`/staff/cooperative-cycles/${cycleId}/applications/${activeLetter.cooperativeRequestId}`" color="success" size="xl" icon="i-lucide-send" label="ออกหนังสือส่งตัว" />
        <UButton v-if="latestLetterUrl" :to="latestLetterUrl" target="_blank" color="neutral" variant="outline" size="xl" icon="i-lucide-external-link" label="ดูเอกสารล่าสุด" />
        <UButton :to="`/staff/cooperative-cycles/${cycleId}/applications`" color="neutral" variant="outline" size="xl" icon="i-lucide-arrow-left" label="กลับไปคำร้อง" />
        <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
      </div>
    </div>

    <div v-if="status === 'pending'" class="space-y-4 p-5 sm:p-6"><USkeleton class="h-36" /><USkeleton class="h-72" /></div>
    <div v-else-if="error" class="p-5 sm:p-6"><UEmpty icon="i-lucide-triangle-alert" title="ไม่สามารถโหลดข้อมูลสถานประกอบการ" :description="error.message"><template #actions><UButton size="xl" @click="() => refresh()">ลองอีกครั้ง</UButton></template></UEmpty></div>
    <template v-else-if="data">
      <UCard>
        <h2 class="text-xl font-bold text-ink">{{ data.company.name }}</h2>
        <p class="mt-1 text-sm text-muted">{{ data.company.address || data.company.province || 'ไม่มีข้อมูลที่อยู่' }}</p>
        <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt class="text-muted">รอบสหกิจ</dt><dd class="mt-1 font-medium text-ink">{{ data.cycle.term }}/{{ data.cycle.academicYear }}</dd></div><div><dt class="text-muted">ระยะเวลาฝึก</dt><dd class="mt-1 font-medium text-ink">{{ formatDate(data.cycle.internshipStartDate) }} – {{ formatDate(data.cycle.internshipEndDate) }}</dd></div><div><dt class="text-muted">ชั่วโมงฝึก</dt><dd class="mt-1 font-medium text-ink">{{ data.cycle.internshipHours || '—' }} ชั่วโมง</dd></div></dl>
      </UCard>

      <UCard :ui="{ body: 'p-0' }"><div class="border-b border-divider p-5 sm:p-6"><h2 class="text-lg font-bold text-ink">นักศึกษาในสถานประกอบการ</h2></div><div class="w-full overflow-x-auto"><UTable :data="applicationRows" class="min-w-full" :columns="[{ id: 'student', header: 'นักศึกษา' }, { id: 'position', header: 'ตำแหน่ง' }, { id: 'status', header: 'สถานะ' }]" :ui="{ base: 'w-full min-w-[42rem]' }"><template #student-cell="{ row }"><div><p class="font-medium text-ink">{{ row.original.studentUser.prefix }}{{ row.original.studentUser.firstName }} {{ row.original.studentUser.lastName }}</p><p class="text-xs text-muted">{{ row.original.studentUser.loginId }}</p></div></template><template #position-cell="{ row }">{{ row.original.cooperativeRequest?.position || row.original.applicationPosition || '—' }}</template><template #status-cell="{ row }"><UBadge variant="subtle" :label="requestStatus(row.original.cooperativeRequest?.status)" /></template></UTable></div></UCard>

      <UCard :ui="{ body: 'p-0' }"><div class="border-b border-divider p-5 sm:p-6"><h2 class="text-lg font-bold text-ink">ประวัติเอกสาร</h2><p class="mt-1 text-sm text-muted">แต่ละฉบับเก็บรายชื่อนักศึกษาตามวันที่ออกเอกสาร</p></div><div class="divide-y divide-divider"><div v-for="letter in letters" :key="letter.id" class="p-5 sm:p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="font-semibold text-ink">หนังสือขอความอนุเคราะห์ เลขที่ {{ letter.letterNumber || '—' }}</p><p class="mt-1 text-sm text-muted">ออกวันที่ {{ formatDate(letter.issueDate) }} · {{ letter.isActive ? 'ฉบับปัจจุบัน' : 'ฉบับเดิม' }}</p></div><UBadge :color="responseStatus(letter.responseDocuments[0]?.status).color" variant="subtle" :label="responseStatus(letter.responseDocuments[0]?.status).label" /></div><p class="mt-3 text-sm text-muted">{{ letter.participants.map((item: any) => item.studentName).join(', ') }}</p><div class="mt-4 flex flex-wrap gap-2"><UButton label="ดูหนังสือ" icon="i-lucide-eye" color="neutral" variant="outline" size="sm" @click="openPreview(letter, 'request')" /><UButton v-if="letter.responseDocuments[0]" :label="letter.isActive && ['UPLOADED', 'UNDER_REVIEW'].includes(letter.responseDocuments[0].status) ? 'ตรวจหนังสือตอบรับ' : 'ดูหนังสือตอบรับ'" icon="i-lucide-file-search" :color="letter.isActive && ['UPLOADED', 'UNDER_REVIEW'].includes(letter.responseDocuments[0].status) ? 'warning' : 'neutral'" variant="outline" size="sm" @click="openPreview(letter, 'response')" /></div></div><UEmpty v-if="!letters.length" icon="i-lucide-file-x" title="ยังไม่มีเอกสาร" description="ยังไม่เคยออกหนังสือสำหรับสถานประกอบการนี้" class="min-h-44" /></div></UCard>
    </template>

    <UModal v-model:open="isPreviewOpen" :title="previewKind === 'request' ? 'หนังสือขอความอนุเคราะห์' : 'หนังสือตอบรับจากสถานประกอบการ'" :description="selectedLetter?.letterNumber ? `เลขที่ ${selectedLetter.letterNumber}` : undefined" :ui="{ content: 'max-w-5xl' }"><template #body><div v-if="selectedLetter" class="space-y-3"><UAlert v-if="actionError" color="error" title="ไม่สามารถดำเนินการได้" :description="actionError" /><div class="h-[60vh] overflow-hidden rounded-panel border border-divider bg-surface"><iframe :src="previewKind === 'request' ? requestLetterUrl(selectedLetter) : responseDocumentUrl(selectedLetter)" :title="previewKind === 'request' ? 'หนังสือขอความอนุเคราะห์' : 'หนังสือตอบรับ'" class="h-full w-full" /></div></div></template><template #footer><div class="flex w-full flex-wrap justify-end gap-2"><UButton v-if="selectedLetter" :to="previewKind === 'request' ? requestLetterUrl(selectedLetter) : responseDocumentUrl(selectedLetter)" target="_blank" label="ดูเต็มหน้า" icon="i-lucide-external-link" color="neutral" variant="outline" size="xl" /><UButton v-if="selectedLetter" :to="previewKind === 'request' ? requestLetterUrl(selectedLetter) : responseDocumentUrl(selectedLetter)" :download="true" label="ดาวน์โหลด" icon="i-lucide-download" color="primary" variant="outline" size="xl" /><UButton v-if="previewKind === 'response' && selectedLetter?.isActive && ['UPLOADED', 'UNDER_REVIEW'].includes(selectedLetter?.responseDocuments[0]?.status)" label="ส่งกลับแก้ไข" color="error" variant="outline" size="xl" :disabled="isReviewing" @click="openReturnModal" /><UButton v-if="previewKind === 'response' && selectedLetter?.isActive && ['UPLOADED', 'UNDER_REVIEW'].includes(selectedLetter?.responseDocuments[0]?.status)" label="ยืนยันสถานที่ฝึกงาน" icon="i-lucide-check-circle-2" color="success" size="xl" :loading="isReviewing" @click="isPlacementConfirmationOpen = true" /><UButton label="ปิด" color="neutral" variant="outline" size="xl" :disabled="isReviewing" @click="isPreviewOpen = false" /></div></template></UModal>
    <UIConfirmModal v-model:open="isPlacementConfirmationOpen" title="ยืนยันสถานที่ฝึกงาน" description="ระบบจะยืนยันสถานที่ฝึกงานและแจ้งผลให้นักศึกษาทุกคนในชุดเอกสารนี้" confirm-label="ยืนยันสถานที่ฝึกงาน" confirm-color="success" :loading="isReviewing" @confirm="confirmPlacement" />
    <UModal v-model:open="isReturnOpen" title="ส่งกลับเอกสารให้นักศึกษาแก้ไข" description="ข้อความนี้จะแจ้งให้นักศึกษาทุกคนในชุดเอกสารทราบ" :ui="{ content: 'max-w-xl' }"><template #body><UFormField label="สิ่งที่ต้องแก้ไข" required :error="returnReasonError"><UTextarea v-model="returnReason" class="w-full" size="xl" :rows="4" /></UFormField></template><template #footer><div class="flex w-full justify-end gap-2"><UButton label="ยกเลิก" color="neutral" variant="outline" size="xl" :disabled="isReviewing" @click="isReturnOpen = false" /><UButton label="ยืนยันส่งกลับแก้ไข" color="error" size="xl" :loading="isReviewing" @click="returnResponse" /></div></template></UModal>
  </div>
</template>
