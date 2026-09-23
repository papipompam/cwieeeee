<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InputDateProps } from '@nuxt/ui'

interface SendingLetterRow {
  id: number
  requestId: number
  requestLetterNumber: string | null
  requestIssueDate: string | null
  companyId: number
  companyName: string
  students: Array<{ studentId: string, name: string }>
  confirmedCount: number
  status: 'WAITING_CONFIRMATION' | 'READY' | 'ISSUED'
  sendingLetter: { letterNumber: string, issueDate: string } | null
}

const route = useRoute()
const notify = useNotify()
const cycleId = computed(() => Number(route.params.cycleId))
const search = ref('')
const statusFilter = ref('ALL')
const page = ref(1)
const pageSize = ref(10)
const isGenerateModalOpen = ref(false)
const isGenerating = ref(false)
const isPreviewing = ref(false)
const selectedRow = ref<SendingLetterRow | null>(null)
const letterNumber = ref('')
const issueDate = shallowRef<InputDateProps<false>['modelValue']>()
const letterNumberError = ref('')
const issueDateError = ref('')
const generateError = ref('')
const previewUrl = ref<string | null>(null)
let previewController: AbortController | null = null
const { data, status, error, refresh } = await useFetch<SendingLetterRow[]>(() => `/api/staff/cooperative-cycles/${cycleId.value}/sending-letters`)

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'พร้อมออกหนังสือ', value: 'READY' },
  { label: 'ออกหนังสือแล้ว', value: 'ISSUED' },
  { label: 'รอยืนยันสถานที่ฝึกงาน', value: 'WAITING_CONFIRMATION' }
]
const statusDisplay = {
  WAITING_CONFIRMATION: { label: 'รอยืนยันสถานที่ฝึกงาน', color: 'warning' as const },
  READY: { label: 'พร้อมออกหนังสือส่งตัว', color: 'info' as const },
  ISSUED: { label: 'ออกหนังสือส่งตัวแล้ว', color: 'success' as const }
}
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return (data.value || []).filter(row =>
    (statusFilter.value === 'ALL' || row.status === statusFilter.value)
    && (!keyword || [row.companyName, row.requestLetterNumber || '', ...row.students.flatMap(student => [student.studentId, student.name])]
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
  )
})
const paginatedRows = computed(() => filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const hasFilters = computed(() => Boolean(search.value.trim() || statusFilter.value !== 'ALL'))
const pageStart = computed(() => filteredRows.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filteredRows.value.length))
const columns: TableColumn<SendingLetterRow>[] = [
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { id: 'students', header: 'นักศึกษา' },
  { id: 'confirmation', header: 'การยืนยันสถานที่' },
  { id: 'status', header: 'สถานะหนังสือส่งตัว' },
  { id: 'actions', header: () => h('span', { class: 'block text-right' }, 'จัดการ') }
]

watch([search, statusFilter, pageSize], () => { page.value = 1 })
watch(() => filteredRows.value.length, (length) => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(length / pageSize.value)))
})

const clearFilters = () => {
  search.value = ''
  statusFilter.value = 'ALL'
}
const clearPreview = () => {
  previewController?.abort()
  previewController = null
  isPreviewing.value = false
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}
const openGenerateModal = (row: SendingLetterRow) => {
  clearPreview()
  selectedRow.value = row
  letterNumber.value = row.sendingLetter?.letterNumber || ''
  issueDate.value = undefined
  letterNumberError.value = ''
  issueDateError.value = ''
  generateError.value = ''
  isGenerateModalOpen.value = true
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
const getApiErrorMessage = async (error: any, fallback: string) => {
  if (error?.data instanceof Blob) {
    try {
      const body = JSON.parse(await error.data.text())
      if (typeof body?.message === 'string') return body.message
    } catch {
      // Fall through to the response message or fallback.
    }
  }
  return error?.data?.message || fallback
}
const previewLetter = async () => {
  const input = getLetterInput()
  if (!selectedRow.value || !input) return

  clearPreview()
  generateError.value = ''
  const controller = new AbortController()
  previewController = controller
  isPreviewing.value = true
  try {
    const pdf = await $fetch<Blob>(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${selectedRow.value.requestId}/sending-letter/preview`, {
      method: 'POST',
      body: input,
      responseType: 'blob',
      signal: controller.signal
    })
    if (previewController === controller) previewUrl.value = URL.createObjectURL(pdf)
  } catch (error: any) {
    if (!controller.signal.aborted) {
      generateError.value = await getApiErrorMessage(error, 'ไม่สามารถสร้างตัวอย่างหนังสือส่งตัวได้')
      notify.error(generateError.value)
    }
  } finally {
    if (previewController === controller) {
      previewController = null
      isPreviewing.value = false
    }
  }
}
const generateLetter = async () => {
  const input = getLetterInput()
  if (!selectedRow.value || !input) return

  isGenerating.value = true
  generateError.value = ''
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${selectedRow.value.requestId}/sending-letter/generate`, {
      method: 'POST',
      body: input
    })
    isGenerateModalOpen.value = false
    clearPreview()
    notify.success('จัดทำหนังสือส่งตัวเรียบร้อยแล้ว')
    await refresh()
  } catch (error: any) {
    generateError.value = await getApiErrorMessage(error, 'ไม่สามารถจัดทำหนังสือส่งตัวได้')
    notify.error(generateError.value)
  } finally {
    isGenerating.value = false
  }
}
watch([letterNumber, issueDate], clearPreview)
onBeforeUnmount(clearPreview)
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '—'
</script>

<template>
  <div class="w-full space-y-6">
    <div>
      <h1 class="text-xl font-bold text-ink">ออกหนังสือส่งตัว</h1>
      <p class="mt-1 text-sm leading-6 text-muted">ติดตามรายการที่ยืนยันสถานที่ฝึกงานแล้วและจัดทำหนังสือส่งตัว</p>
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <div class="border-b border-divider p-5 sm:p-6">
        <div>
          <h2 class="text-lg font-bold text-ink">รายการหนังสือส่งตัว</h2>
          <p class="mt-1 text-sm leading-6 text-muted">หนึ่งรายการอ้างอิงจากหนังสือขอความอนุเคราะห์แต่ละฉบับ</p>
        </div>
        <div class="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <UInput v-model="search" size="xl" icon="i-lucide-search" placeholder="ค้นหาสถานประกอบการ ชื่อ หรือรหัสนักศึกษา" class="min-w-0 flex-1" />
          <USelect v-model="statusFilter" size="xl" :items="statusOptions" class="w-full lg:w-64" />
          <UIButtonRefresh size="xl" :loading="status === 'pending'" @refresh="refresh" />
        </div>
        <div v-if="hasFilters" class="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
          <span>พบ {{ filteredRows.length }} รายการ</span>
          <UButton label="ล้างตัวกรอง" color="neutral" variant="ghost" size="xs" @click="clearFilters" />
        </div>
      </div>

      <div v-if="status === 'pending'" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 5" :key="index" class="h-12 w-full" />
      </div>
      <UEmpty v-else-if="error" icon="i-lucide-triangle-alert" title="ไม่สามารถโหลดรายการหนังสือส่งตัว" :description="error.message" class="min-h-64">
        <template #actions><UButton label="ลองอีกครั้ง" size="xl" @click="() => refresh()" /></template>
      </UEmpty>
      <UEmpty
        v-else-if="!filteredRows.length"
        :icon="hasFilters ? 'i-lucide-search-x' : 'i-lucide-send'"
        :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการหนังสือส่งตัว'"
        :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือสถานะ' : 'รายการจะปรากฏเมื่อมีการออกหนังสือขอความอนุเคราะห์แล้ว'"
        class="min-h-64"
      >
        <template v-if="hasFilters" #actions><UButton label="ล้างตัวกรอง" color="neutral" variant="outline" size="xl" @click="clearFilters" /></template>
      </UEmpty>
      <template v-else>
        <div class="w-full overflow-x-auto">
          <UTable :data="paginatedRows" :columns="columns" class="min-w-full" :ui="{ base: 'w-full min-w-[64rem]' }">
            <template #companyName-cell="{ row }">
              <div><p class="font-semibold text-ink">{{ row.original.companyName }}</p><p class="text-xs text-muted">หนังสืออ้างอิง {{ row.original.requestLetterNumber || '—' }} · {{ formatDate(row.original.requestIssueDate) }}</p></div>
            </template>
            <template #students-cell="{ row }">
              <div><p class="font-medium text-ink">{{ row.original.students.length }} คน</p><p class="max-w-72 truncate text-xs text-muted">{{ row.original.students.map(student => student.name).join(', ') }}</p></div>
            </template>
            <template #confirmation-cell="{ row }">
              <span class="text-sm tabular-nums text-ink">{{ row.original.confirmedCount }}/{{ row.original.students.length }} คน</span>
            </template>
            <template #status-cell="{ row }">
              <div><UBadge :color="statusDisplay[row.original.status].color" variant="subtle" :label="statusDisplay[row.original.status].label" /><p v-if="row.original.sendingLetter" class="mt-1 text-xs text-muted">เลขที่ {{ row.original.sendingLetter.letterNumber }} · {{ formatDate(row.original.sendingLetter.issueDate) }}</p></div>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-2">
                <UButton
                  v-if="row.original.status === 'ISSUED'"
                  label="ดูหนังสือ"
                  icon="i-lucide-eye"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${row.original.requestId}/sending-letter`"
                  target="_blank"
                />
                <UButton
                  v-if="row.original.status === 'ISSUED'"
                  label="ออกฉบับใหม่"
                  icon="i-lucide-file-plus-2"
                  color="primary"
                  variant="solid"
                  size="xs"
                  @click="openGenerateModal(row.original)"
                />
                <UButton
                  v-else
                  :label="row.original.status === 'READY' ? 'ออกหนังสือส่งตัว' : 'ดูรายละเอียด'"
                  :icon="row.original.status === 'READY' ? 'i-lucide-send' : 'i-lucide-arrow-right'"
                  :color="row.original.status === 'READY' ? 'primary' : 'neutral'"
                  :variant="row.original.status === 'READY' ? 'solid' : 'outline'"
                  size="xs"
                  :to="row.original.status === 'READY' ? undefined : `/staff/cooperative-cycles/${cycleId}/applications/${row.original.requestId}`"
                  @click="row.original.status === 'READY' && openGenerateModal(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex items-center gap-3"><span class="whitespace-nowrap text-muted">แสดง {{ pageStart }}–{{ pageEnd }} จาก {{ filteredRows.length }} รายการ</span><USelect v-model="pageSize" :items="[10, 20, 50]" size="md" class="w-20" aria-label="จำนวนรายการต่อหน้า" /></div>
          <UPagination v-model:page="page" :items-per-page="pageSize" :total="filteredRows.length" size="md" />
        </div>
      </template>
    </UCard>

    <UModal
      v-model:open="isGenerateModalOpen"
      title="จัดทำหนังสือส่งตัว"
      :description="selectedRow ? `${selectedRow.status === 'ISSUED' ? 'ออกฉบับใหม่แทนฉบับปัจจุบันให้' : 'ระบุเลขที่และวันที่ออกหนังสือส่งตัวให้'} ${selectedRow.companyName} แล้วตรวจตัวอย่างก่อนบันทึก` : undefined"
      :ui="{ content: 'max-w-5xl' }"
      @update:open="open => { if (!open) clearPreview() }"
    >
      <template #body>
        <div class="grid gap-6 lg:grid-cols-2">
          <UForm class="grid content-start gap-5" @submit.prevent="previewLetter">
            <UFormField label="เลขที่หนังสือ" required :error="letterNumberError">
              <UInput v-model="letterNumber" class="w-full" size="xl" placeholder="เช่น ๑๒๓/๒๕๖๙" autocomplete="off" />
            </UFormField>
            <UFormField label="วันที่ออกหนังสือ" required :error="issueDateError">
              <UPopover>
                <UInputDate v-model="issueDate" class="w-full" size="xl" locale="th-TH" aria-label="วันที่ออกหนังสือ" />
                <template #content>
                  <UCalendar v-model="issueDate" locale="th-TH" />
                </template>
              </UPopover>
            </UFormField>
            <UAlert v-if="generateError" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถดำเนินการได้" :description="generateError" />
          </UForm>
          <section class="min-w-0 rounded-panel border border-divider bg-surface p-3">
            <div v-if="previewUrl" class="space-y-2">
              <p class="px-1 text-sm font-semibold text-ink">ตัวอย่างหนังสือส่งตัว</p>
              <iframe :src="previewUrl" title="ตัวอย่างหนังสือส่งตัว" class="h-[60vh] w-full rounded-control border border-divider bg-canvas" />
            </div>
            <div v-else class="grid min-h-64 place-items-center p-6 text-center text-muted">
              <div><UIcon name="i-lucide-file-search" class="mx-auto size-8" /><p class="mt-2 text-sm">กรอกข้อมูลแล้วกด “ดูตัวอย่าง”</p></div>
            </div>
          </section>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton label="ยกเลิก" color="neutral" variant="outline" size="xl" :disabled="isPreviewing || isGenerating" @click="isGenerateModalOpen = false" />
          <UButton label="ดูตัวอย่าง" icon="i-lucide-eye" color="neutral" variant="outline" size="xl" :loading="isPreviewing" :disabled="isGenerating" @click="previewLetter" />
          <UButton label="ยืนยันออกหนังสือส่งตัว" icon="i-lucide-file-check-2" color="primary" size="xl" :loading="isGenerating" :disabled="isPreviewing" @click="generateLetter" />
        </div>
      </template>
    </UModal>
  </div>
</template>
