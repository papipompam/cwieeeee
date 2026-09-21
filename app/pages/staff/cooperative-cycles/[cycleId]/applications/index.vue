<script setup lang="ts">
import type { InputDateProps, TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

interface StudentUser {
  id: number
  loginId: string
  prefix: string
  firstName: string
  lastName: string
  classGroup: number
  cohortYear: number
}

interface LatestDocument {
  id: number
  fileName: string
  version: number
  status: string
  createdAt: string
}

interface RequestRow {
  id: number
  status: string
  companyName: string
  position: string | null
  province: string | null
  confirmedAt: string
  letterFilePath: string | null
  student: StudentUser
  latestDocument: LatestDocument | null
}

interface RequestsResponse {
  requests: RequestRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')
const notify = useNotify()

const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const classGroupFilter = ref<string>('all')

const selectedRequestForLetter = ref<RequestRow | null>(null)
const isLetterModalOpen = ref(false)
const isLetterGenerating = ref(false)
const letterNumber = ref('')
const issueDate = shallowRef<InputDateProps<false>['modelValue']>()
const letterNumberError = ref('')
const issueDateError = ref('')
const letterActionError = ref('')

// Fetch class groups for filter dropdown
const { data: studentsData } = await useFetch<{ students: Array<{ classGroup: number }> }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/students?pageSize=100`
)
const classGroupOptions = computed(() => {
  const groups = new Set<number>()
  studentsData.value?.students?.forEach(s => {
    if (s.classGroup) groups.add(s.classGroup)
  })
  const sorted = Array.from(groups).sort((a, b) => a - b)
  return [
    { label: 'ทุกหมู่เรียน', value: 'all' },
    ...sorted.map(g => ({ label: `หมู่ ${g}`, value: String(g) }))
  ]
})

const statusOptions = [
  { label: 'ทุกสถานะ', value: 'all' },
  { label: 'ยื่นคำร้องแล้ว', value: 'SUBMITTED' },
  { label: 'กำลังดำเนินการ', value: 'STAFF_PROCESSING' },
  { label: 'หนังสือพร้อมแล้ว', value: 'LETTER_READY' },
  { label: 'รอตรวจสอบเอกสาร', value: 'DOCUMENT_UNDER_REVIEW' },
  { label: 'ส่งกลับแก้ไข', value: 'RETURNED_FOR_REVISION' },
  { label: 'ยืนยันสถานที่แล้ว', value: 'PLACEMENT_CONFIRMED' },
  { label: 'ปฏิเสธคำร้อง', value: 'REJECTED' }
]

const { data, status: fetchStatus, refresh } = await useFetch<RequestsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/requests`,
  {
    query: computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      search: searchQuery.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      classGroup: classGroupFilter.value !== 'all' ? classGroupFilter.value : undefined
    })),
    watch: [page, searchQuery, statusFilter, classGroupFilter, pageSize]
  }
)

const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all' || classGroupFilter.value !== 'all')

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  classGroupFilter.value = 'all'
  page.value = 1
}

watch([searchQuery, statusFilter, classGroupFilter, pageSize], () => {
  page.value = 1
})

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

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '—'
  const d = new Date(dStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const canGenerateLetter = (request: RequestRow) => (
  cycle?.value?.status !== 'CLOSED'
  && ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'DOCUMENT_UNDER_REVIEW', 'RETURNED_FOR_REVISION'].includes(request.status)
)

const openLetterModal = (request: RequestRow) => {
  selectedRequestForLetter.value = request
  letterNumber.value = ''
  issueDate.value = undefined
  letterNumberError.value = ''
  issueDateError.value = ''
  letterActionError.value = ''
  isLetterModalOpen.value = true
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

const openFullPagePreview = () => {
  const input = getLetterInput()
  const request = selectedRequestForLetter.value
  if (!input || !request) return

  const previewRoute = router.resolve({
    path: `/staff/cooperative-cycles/${cycleId.value}/applications/${request.id}/letter-preview`,
    query: input
  })
  window.open(previewRoute.href, '_blank', 'noopener')
}

const generateLetter = async () => {
  const input = getLetterInput()
  const request = selectedRequestForLetter.value
  if (!input || !request) return

  isLetterGenerating.value = true
  letterActionError.value = ''
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${request.id}/letter/generate`, {
      method: 'POST',
      body: input
    })
    notify.success(`ออกหนังสือสำหรับ ${request.companyName} เรียบร้อยแล้ว`)
    isLetterModalOpen.value = false
    await refresh()
  } catch (err: any) {
    const message = err?.data?.message || 'ไม่สามารถออกหนังสือได้'
    letterActionError.value = message
    notify.error(message)
  } finally {
    isLetterGenerating.value = false
  }
}

const columns: TableColumn<RequestRow>[] = [
  {
    accessorKey: 'id',
    header: 'เลขที่คำร้อง',
    meta: { class: { th: 'w-24', td: 'w-24 font-semibold text-xs' } }
  },
  {
    id: 'student',
    header: 'นักศึกษา',
    meta: { class: { th: 'w-48', td: 'w-48' } }
  },
  {
    id: 'company',
    header: 'สถานประกอบการ'
  },
  {
    accessorKey: 'confirmedAt',
    header: 'วันที่ส่ง',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    accessorKey: 'status',
    header: 'สถานะคำร้อง',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    id: 'latestDocument',
    header: 'เอกสารตอบรับ',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-80 text-end', td: 'w-80 text-end' } }
  }
]

const pageStart = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})
const pageEnd = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize.value, data.value.total)
})
</script>

<template>
  <div class="w-full space-y-6">
    <UCard :ui="{ body: 'p-0' }">
      <!-- Header info and controls -->
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-file-check-2" class="size-5 text-primary" />
              คำร้องนักศึกษา
            </h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              คิวตรวจสอบคำร้องและออกหนังสือขอความอนุเคราะห์ (ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }})
            </p>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <UFormField label="ค้นหาคำร้อง" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
            <UInput
              v-model="searchQuery"
              type="search"
              size="xl"
              icon="i-lucide-search"
              class="w-full"
              placeholder="ค้นหารหัส ชื่อ หรือบริษัท..."
              aria-label="ค้นหาคำร้อง"
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-44">
              <USelect
                v-model="statusFilter"
                :items="statusOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="สถานะคำร้อง"
                aria-label="กรองตามสถานะคำร้อง"
              />
            </div>
            <div class="w-full sm:w-36">
              <USelect
                v-model="classGroupFilter"
                :items="classGroupOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="หมู่เรียน"
                aria-label="กรองตามหมู่เรียน"
              />
            </div>
            <UIButtonRefresh
              :loading="fetchStatus === 'pending'"
              @refresh="refresh"
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
          <span v-if="classGroupFilter !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            {{ classGroupOptions.find(o => o.value === classGroupFilter)?.label }}
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

      <!-- Loading Skeleton -->
      <div v-if="fetchStatus === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
        <div v-for="row in 4" :key="row" class="grid grid-cols-[2rem_1.2fr_1fr_8rem] gap-4 max-md:grid-cols-[1fr_7rem]">
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!data?.requests?.length" class="p-5 sm:p-6">
        <UEmpty
          icon="i-lucide-file-check-2"
          class="min-h-64"
          :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ไม่พบข้อมูลคำร้องนักศึกษาในรอบนี้'"
          :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ' : 'เมื่อนักศึกษาส่งคำร้องขอความอนุเคราะห์ ข้อมูลจะปรากฏในตารางนี้'"
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
          </template>
        </UEmpty>
      </div>

      <!-- Table -->
      <template v-else>
        <div class="w-full overflow-x-auto">
          <UTable
            :data="data?.requests || []"
            :columns="columns"
            class="min-w-full"
            :ui="{ base: 'w-full min-w-200' }"
          >
            <!-- Request ID -->
            <template #id-cell="{ row }">
              <span class="font-semibold text-ink">#{{ row.original.id }}</span>
            </template>

            <!-- Student Info -->
            <template #student-cell="{ row }">
              <div>
                <div class="font-medium text-ink text-sm truncate">
                  {{ row.original.student.prefix }}{{ row.original.student.firstName }} {{ row.original.student.lastName }}
                </div>
                <div class="text-xs text-muted mt-0.5">
                  {{ row.original.student.loginId }} · หมู่ {{ row.original.student.classGroup }}
                </div>
              </div>
            </template>

            <!-- Company Snapshot -->
            <template #company-cell="{ row }">
              <div>
                <div class="font-medium text-ink text-sm truncate">
                  {{ row.original.companyName }}
                </div>
                <div class="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                  <span v-if="row.original.position">{{ row.original.position }}</span>
                  <span v-if="row.original.position && row.original.province">•</span>
                  <span v-if="row.original.province">{{ row.original.province }}</span>
                </div>
              </div>
            </template>

            <!-- Confirmed Date -->
            <template #confirmedAt-cell="{ row }">
              <span>{{ formatDate(row.original.confirmedAt) }}</span>
            </template>

            <!-- Status Badge -->
            <template #status-cell="{ row }">
              <UBadge
                :label="requestStatusDisplay[row.original.status]?.label || row.original.status"
                :color="requestStatusDisplay[row.original.status]?.color || 'neutral'"
                variant="subtle"
              />
            </template>

            <!-- Latest Acceptance Document -->
            <template #latestDocument-cell="{ row }">
              <div v-if="row.original.latestDocument" class="text-xs">
                <span class="font-medium text-ink">ฉบับที่ {{ row.original.latestDocument.version }}</span>
                <div class="text-muted mt-0.5">
                  <UBadge
                    v-if="row.original.latestDocument.status === 'UPLOADED' || row.original.latestDocument.status === 'UNDER_REVIEW'"
                    label="รอตรวจ"
                    color="warning"
                    variant="subtle"
                    size="xs"
                  />
                  <UBadge
                    v-else-if="row.original.latestDocument.status === 'APPROVED'"
                    label="อนุมัติแล้ว"
                    color="success"
                    variant="subtle"
                    size="xs"
                  />
                  <UBadge
                    v-else-if="row.original.latestDocument.status === 'RETURNED_FOR_REVISION'"
                    label="ส่งกลับแก้ไข"
                    color="error"
                    variant="subtle"
                    size="xs"
                  />
                  <span v-else class="text-muted">{{ row.original.latestDocument.status }}</span>
                </div>
              </div>
              <span v-else class="text-muted text-xs">—</span>
            </template>

            <!-- Actions: document actions and detail navigation live together. -->
            <template #actions-cell="{ row }">
              <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                <UButton
                  v-if="canGenerateLetter(row.original)"
                  :label="row.original.letterFilePath ? 'ออกฉบับใหม่' : 'ออกเอกสาร'"
                  icon="i-lucide-file-pen-line"
                  color="primary"
                  size="xs"
                  @click="openLetterModal(row.original)"
                />
                <UButton
                  v-if="row.original.letterFilePath"
                  label="เปิดหนังสือ"
                  icon="i-lucide-external-link"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${row.original.id}/letter`"
                  target="_blank"
                />
                <UButton
                  label="ดูคำร้อง"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :to="`/staff/cooperative-cycles/${cycleId}/applications/${row.original.id}`"
                />
              </div>
            </template>
          </UTable>
        </div>

        <!-- Footer -->
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <p class="whitespace-nowrap text-muted">
              แสดง {{ pageStart }}–{{ pageEnd }} จากทั้งหมด {{ data.total }} รายการ
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
            :total="data.total"
            :items-per-page="pageSize"
            size="md"
          />
        </div>
      </template>
    </UCard>

    <UModal
      v-model:open="isLetterModalOpen"
      title="ออกหนังสือขอความอนุเคราะห์"
      :description="selectedRequestForLetter ? `สำหรับ ${selectedRequestForLetter.student.prefix}${selectedRequestForLetter.student.firstName} ${selectedRequestForLetter.student.lastName} · ${selectedRequestForLetter.companyName}` : undefined"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <UForm class="grid gap-5" @submit.prevent="generateLetter">
          <UFormField label="เลขที่หนังสือ" required :error="letterNumberError">
            <UInput v-model="letterNumber" class="w-full" size="xl" placeholder="เช่น อว ๐๖๒๔.๖/๑๒๓" autocomplete="off" />
          </UFormField>
          <UFormField label="วันที่ออกหนังสือ" required :error="issueDateError">
            <UPopover>
              <UInputDate v-model="issueDate" class="w-full" size="xl" locale="th-TH" aria-label="Select a date" />
              <template #content>
                <UCalendar v-model="issueDate" locale="th-TH" />
              </template>
            </UPopover>
          </UFormField>
          <UAlert v-if="letterActionError" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถออกเอกสารได้" :description="letterActionError" />
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton label="ยกเลิก" color="neutral" variant="outline" size="xl" :disabled="isLetterGenerating" @click="isLetterModalOpen = false" />
          <UButton label="ดูตัวอย่างเต็มหน้า" icon="i-lucide-expand" color="neutral" variant="outline" size="xl" :disabled="isLetterGenerating" @click="openFullPagePreview" />
          <UButton label="ยืนยันออกเอกสาร" icon="i-lucide-file-check-2" color="primary" size="xl" :loading="isLetterGenerating" @click="generateLetter" />
        </div>
      </template>
    </UModal>
  </div>
</template>
