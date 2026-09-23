<script setup lang="ts">
import type { InputDateProps, TableColumn } from '@nuxt/ui'
import { getLocalTimeZone, today } from '@internationalized/date'
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
  companyId: number
  status: string
  companyName: string
  position: string | null
  province: string | null
  confirmedAt: string
  letterFilePath: string | null
  sendingLetterAvailable: boolean
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
interface DocumentCandidate { id: number, companyId: number, companyName: string, recipientName: string | null, student: StudentUser }
interface CompanyGroup { companyId: number, companyName: string, applicantCount: number, submittedCount: number, waitingStudentCount: number, versionCount: number, documentRequestId: number | null, responseDocument: { id: number, fileName: string, version: number, status: string } | null, workflow: { key: string, label: string, color: 'warning' | 'error' | 'success' | 'neutral' }, students: string[] }

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')
const notify = useNotify()

const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const classGroupFilter = ref<string>('all')
const activeApplicationView = ref<'companies' | 'students'>('companies')
const applicationTabs = [
  { label: 'สถานประกอบการ', icon: 'i-lucide-building-2', value: 'companies' },
  { label: 'นักศึกษา', icon: 'i-lucide-graduation-cap', value: 'students' }
]

const issueDate = shallowRef<InputDateProps<false>['modelValue']>()
const issueDateError = ref('')
const isGroupModalOpen = ref(false)
const groupCandidates = ref<DocumentCandidate[]>([])
const selectedCompany = ref('')
const selectedCompanyId = ref<number | null>(null)
const selectedGroupRequestIds = ref<number[]>([])
const groupCandidatesLoading = ref(false)
const groupLoading = ref(false)
const groupError = ref('')
const groupLetterNumber = ref('')
const selectedCompanyDocuments = ref<CompanyGroup | null>(null)
const isCompanyDocumentsOpen = ref(false)
const selectedCompanyResponse = ref<CompanyGroup | null>(null)
const isCompanyResponseOpen = ref(false)
const isPlacementConfirmationOpen = ref(false)
const isPlacementConfirming = ref(false)
const responseActionError = ref('')
const selectedCompanyGroup = ref<CompanyGroup | null>(null)
const isIncompleteConfirmationOpen = ref(false)
const isGroupGenerationConfirmationOpen = ref(false)
const isGroupPreviewOpen = ref(false)
const groupPreviewUrl = ref<string | null>(null)
const groupPreviewLoading = ref(false)
let groupCandidateLoad = 0
const visibleGroupCandidates = computed(() => groupCandidates.value.filter(item => item.companyId === selectedCompanyId.value))
const { data: companyGroupsData, refresh: refreshCompanyGroups } = await useFetch<CompanyGroup[]>(() => `/api/staff/cooperative-cycles/${cycleId.value}/document-groups/companies`)
const companyGroups = computed(() => companyGroupsData.value || [])
const companyGroupColumns: TableColumn<CompanyGroup>[] = [
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { id: 'students', header: 'นักศึกษา', meta: { class: { th: 'w-44 text-center', td: 'w-44 text-center' } } },
  { id: 'workflow', header: 'สถานะเอกสารรวม', meta: { class: { th: 'w-64', td: 'w-64' } } },
  { id: 'documents', header: 'หนังสือที่ออก', meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } } },
  { id: 'response', header: 'หนังสือตอบรับ', meta: { class: { th: 'w-40 text-center', td: 'w-40 text-center' } } },
  { id: 'actions', header: () => h('span', { class: 'block text-right' }, 'จัดการ'), meta: { class: { th: 'w-36 text-end', td: 'w-36 text-end' } } }
]
const openGroupModal = async (company: CompanyGroup) => {
  const loadId = ++groupCandidateLoad
  selectedCompany.value = company.companyName
  selectedCompanyId.value = company.companyId
  selectedCompanyGroup.value = company
  selectedGroupRequestIds.value = []
  groupCandidates.value = []
  groupError.value = ''
  issueDateError.value = ''
  issueDate.value = today(getLocalTimeZone())
  groupLetterNumber.value = ''
  isGroupModalOpen.value = true
  groupCandidatesLoading.value = true
  try {
    const [candidates, suggested] = await Promise.all([
      $fetch<DocumentCandidate[]>(`/api/staff/cooperative-cycles/${cycleId.value}/document-groups/candidates`, { query: { companyId: company.companyId } }),
      $fetch<{ letterNumber: string }>(`/api/staff/cooperative-cycles/${cycleId.value}/document-groups/next-letter-number`)
    ])
    if (loadId !== groupCandidateLoad || !isGroupModalOpen.value) return
    groupCandidates.value = candidates
    groupLetterNumber.value = suggested.letterNumber
    selectedGroupRequestIds.value = visibleGroupCandidates.value.slice(0, 6).map(candidate => candidate.id)
  } catch (error: any) {
    if (loadId === groupCandidateLoad && isGroupModalOpen.value) groupError.value = error?.data?.message || 'ไม่สามารถโหลดรายชื่อนักศึกษาได้'
  } finally {
    if (loadId === groupCandidateLoad) groupCandidatesLoading.value = false
  }
}
const hasOpenedCompanyFromQuery = ref(false)
watch(companyGroups, (groups) => {
  if (hasOpenedCompanyFromQuery.value || route.query.action !== 'create') return
  const companyId = Number(route.query.companyId)
  const company = groups.find(group => group.companyId === companyId)
  if (!company) return
  hasOpenedCompanyFromQuery.value = true
  void openGroupModal(company)
}, { immediate: true })
const toggleGroupRequest = (id: number) => { selectedGroupRequestIds.value = selectedGroupRequestIds.value.includes(id) ? selectedGroupRequestIds.value.filter(value => value !== id) : [...selectedGroupRequestIds.value, id] }
const openCompanyDocuments = (company: CompanyGroup) => { selectedCompanyDocuments.value = company; isCompanyDocumentsOpen.value = true }
const openCompanyResponse = (company: CompanyGroup) => { selectedCompanyResponse.value = company; responseActionError.value = ''; isCompanyResponseOpen.value = true }
const openGroupModalForRequest = (request: RequestRow) => {
  const company = companyGroups.value.find(group => group.companyId === request.companyId)
  if (!company) return notify.error('ไม่พบข้อมูลสถานประกอบการ กรุณารีเฟรชหน้าเว็บ')
  return openGroupModal(company)
}
const openCompanyResponseForRequest = (request: RequestRow) => {
  const company = companyGroups.value.find(group => group.companyId === request.companyId)
  if (!company?.responseDocument) return notify.error('ไม่พบหนังสือตอบรับ กรุณารีเฟรชหน้าเว็บ')
  openCompanyResponse(company)
}
const confirmPlacement = async () => {
  const company = selectedCompanyResponse.value
  if (!company?.documentRequestId || isPlacementConfirming.value) return
  isPlacementConfirming.value = true
  responseActionError.value = ''
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${company.documentRequestId}/confirm-placement`, { method: 'POST' })
    notify.success('ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว')
    isPlacementConfirmationOpen.value = false
    isCompanyResponseOpen.value = false
    await Promise.all([refresh(), refreshCompanyGroups()])
  } catch (error: any) {
    responseActionError.value = error?.data?.message || 'ไม่สามารถยืนยันสถานที่ฝึกงานได้'
  } finally {
    isPlacementConfirming.value = false
  }
}
const generateGroupLetter = async () => {
  if (groupLoading.value || groupCandidatesLoading.value) return
  const selectedDate = issueDate.value?.toString()
  issueDateError.value = selectedDate ? '' : 'กรุณาเลือกวันที่ออกหนังสือ'
  groupError.value = selectedGroupRequestIds.value.length ? '' : 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน'
  if (!selectedDate || groupError.value) return
  groupLoading.value = true
  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/document-groups/request-letter`, { method: 'POST', body: { issueDate: selectedDate, letterNumber: groupLetterNumber.value, requestIds: selectedGroupRequestIds.value } })
    notify.success('ออกหนังสือขอความอนุเคราะห์รวมเรียบร้อยแล้ว')
    isGroupGenerationConfirmationOpen.value = false
    closeGroupPreview()
    isGroupModalOpen.value = false
    await Promise.all([refresh(), refreshCompanyGroups()])
  } catch (error: any) {
    groupError.value = error?.data?.message || 'ไม่สามารถออกเอกสารได้'
  } finally {
    groupLoading.value = false
  }
}
const openGroupPreview = async () => {
  const selectedDate = issueDate.value?.toString()
  issueDateError.value = selectedDate ? '' : 'กรุณาเลือกวันที่ออกหนังสือ'
  groupError.value = selectedGroupRequestIds.value.length ? '' : 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน'
  if (!selectedDate || !groupLetterNumber.value.trim() || groupError.value) return
  if (selectedCompanyGroup.value && selectedCompanyGroup.value.waitingStudentCount > 0) {
    isIncompleteConfirmationOpen.value = true
    return
  }
  await renderGroupPreview()
}
const renderGroupPreview = async () => {
  const selectedDate = issueDate.value?.toString()
  if (!selectedDate) return
  isIncompleteConfirmationOpen.value = false
  groupPreviewLoading.value = true
  groupError.value = ''
  try {
    const pdf = await $fetch<Blob>(`/api/staff/cooperative-cycles/${cycleId.value}/document-groups/request-letter/preview`, { method: 'POST', body: { issueDate: selectedDate, letterNumber: groupLetterNumber.value, requestIds: selectedGroupRequestIds.value }, responseType: 'blob' })
    if (groupPreviewUrl.value) URL.revokeObjectURL(groupPreviewUrl.value)
    groupPreviewUrl.value = URL.createObjectURL(pdf)
    isGroupPreviewOpen.value = true
  } catch (error: any) {
    groupError.value = error?.data?.message || 'ไม่สามารถสร้างตัวอย่างเอกสารได้'
  } finally {
    groupPreviewLoading.value = false
  }
}
const closeGroupPreview = () => {
  if (groupPreviewUrl.value) URL.revokeObjectURL(groupPreviewUrl.value)
  groupPreviewUrl.value = null
  isGroupPreviewOpen.value = false
}

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
    id: 'documents',
    header: 'หนังสือที่ออก',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    id: 'latestDocument',
    header: 'หนังสือตอบรับ',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-36 text-end', td: 'w-36 text-end' } }
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
              ออกหนังสือขออนุเคราะห์
            </h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              คิวตรวจสอบคำร้องและออกหนังสือขอความอนุเคราะห์ (ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }})
            </p>
            <UTabs v-model="activeApplicationView" :items="applicationTabs" size="xl" :content="false" class="mt-4" />
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

      <div v-if="activeApplicationView === 'companies' && fetchStatus !== 'pending' && companyGroups.length" class="border-t border-divider">
        <div class="w-full overflow-x-auto"><UTable :data="companyGroups" :columns="companyGroupColumns" class="min-w-full" :ui="{ base: 'w-full min-w-180' }">
          <template #companyName-cell="{ row }"><div><p class="font-medium text-ink">{{ row.original.companyName }}</p><p class="mt-0.5 text-xs text-muted">{{ row.original.students.join(', ') }}</p></div></template>
          <template #students-cell="{ row }"><div class="text-center"><p class="font-semibold tabular-nums text-ink">{{ row.original.submittedCount }} / {{ row.original.applicantCount }} คน</p><p v-if="row.original.waitingStudentCount" class="mt-0.5 text-xs text-muted">รอยืนยัน {{ row.original.waitingStudentCount }} คน</p><p v-else class="mt-0.5 text-xs text-success">ยืนยันครบแล้ว</p></div></template>
          <template #workflow-cell="{ row }"><div><UBadge :label="row.original.workflow.label" :color="row.original.workflow.color" variant="subtle" /><p v-if="row.original.waitingStudentCount" class="mt-1 text-xs leading-5 text-muted">ยังออกเอกสารได้เฉพาะ {{ row.original.submittedCount }} คนที่ส่งคำร้องแล้ว</p></div></template>
          <template #documents-cell="{ row }"><UButton v-if="row.original.documentRequestId" label="ดูเอกสาร" icon="i-lucide-folder-open" color="neutral" variant="outline" size="xs" @click="openCompanyDocuments(row.original)" /><UButton v-else-if="row.original.submittedCount" label="สร้างเอกสาร" icon="i-lucide-file-pen-line" size="xs" @click="openGroupModal(row.original)" /><span v-else class="text-muted">รอยืนยันสถานประกอบการ</span></template>
          <template #response-cell="{ row }"><UButton v-if="row.original.responseDocument" label="ดู/ตรวจ" icon="i-lucide-file-search" color="warning" variant="outline" size="xs" @click="openCompanyResponse(row.original)" /><span v-else class="text-muted">{{ row.original.workflow.key === 'returned_for_revision' ? 'รอส่งแก้ไข' : row.original.documentRequestId ? 'รอนักศึกษาส่ง' : 'ยังไม่มีเอกสาร' }}</span></template>
          <template #actions-cell="{ row }"><div class="flex justify-end"><UButton label="รายละเอียด" icon="i-lucide-arrow-right" color="neutral" variant="ghost" size="xs" :to="`/staff/cooperative-cycles/${cycleId}/applications/companies/${row.original.companyId}`" /></div></template>
        </UTable></div>
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
          :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ไม่พบข้อมูลคำร้องขอเอกสารขอความอนุเคราะห์ในรอบนี้'"
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
      <template v-else-if="activeApplicationView === 'students'">
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

            <template #documents-cell="{ row }">
              <UButton
                v-if="row.original.sendingLetterAvailable"
                label="ดูหนังสือส่งตัว"
                icon="i-lucide-file-text"
                color="neutral"
                variant="outline"
                size="xs"
                :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${row.original.id}/sending-letter`"
                target="_blank"
              />
              <UButton
                v-else-if="row.original.letterFilePath"
                label="ดูเอกสาร"
                icon="i-lucide-folder-open"
                color="neutral"
                variant="outline"
                size="xs"
                :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${row.original.id}/letter`"
                target="_blank"
              />
              <UButton
                v-else-if="cycle?.status !== 'CLOSED'"
                label="สร้างเอกสาร"
                icon="i-lucide-file-pen-line"
                size="xs"
                @click="openGroupModalForRequest(row.original)"
              />
              <span v-else class="text-xs text-muted">รอบสหกิจปิดแล้ว</span>
            </template>

            <!-- Latest Acceptance Document -->
            <template #latestDocument-cell="{ row }">
              <UButton
                v-if="row.original.latestDocument"
                :label="['UPLOADED', 'UNDER_REVIEW'].includes(row.original.latestDocument.status) ? 'ดู/ตรวจ' : 'ดูเอกสาร'"
                icon="i-lucide-file-search"
                :color="['UPLOADED', 'UNDER_REVIEW'].includes(row.original.latestDocument.status) ? 'warning' : 'neutral'"
                variant="outline"
                size="xs"
                @click="openCompanyResponseForRequest(row.original)"
              />
              <span v-else class="text-xs text-muted">{{ row.original.letterFilePath ? 'รอนักศึกษาส่ง' : 'ยังไม่มีเอกสาร' }}</span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  label="รายละเอียด"
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

    <UModal v-model:open="isCompanyDocumentsOpen" title="เอกสารสถานประกอบการ" :description="selectedCompanyDocuments?.companyName" :ui="{ content: 'max-w-5xl' }">
      <template #body><div v-if="selectedCompanyDocuments?.documentRequestId" class="space-y-3"><div class="flex items-center justify-between gap-3 rounded-panel border border-divider p-4"><div><p class="font-semibold text-ink">หนังสือขอความอนุเคราะห์</p><p class="mt-1 text-sm text-muted">{{ selectedCompanyDocuments.versionCount }} ฉบับ</p></div><div class="flex flex-wrap justify-end gap-2"><UButton :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyDocuments.documentRequestId}/letter`" target="_blank" label="ดูเต็มหน้า" icon="i-lucide-external-link" color="neutral" variant="outline" size="sm" /><UButton :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyDocuments.documentRequestId}/letter`" :download="true" label="ดาวน์โหลด" icon="i-lucide-download" color="primary" size="sm" /></div></div><div class="h-[55vh] overflow-hidden rounded-panel border border-divider bg-surface"><iframe :src="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyDocuments.documentRequestId}/letter`" title="ตัวอย่างหนังสือขอความอนุเคราะห์" class="h-full w-full" /></div></div></template>
      <template #footer><div class="flex w-full justify-end"><UButton label="ปิด" size="xl" color="neutral" variant="outline" @click="isCompanyDocumentsOpen = false" /></div></template>
    </UModal>
    <UModal v-model:open="isCompanyResponseOpen" title="หนังสือตอบรับจากสถานประกอบการ" :description="selectedCompanyResponse?.companyName" :ui="{ content: 'max-w-5xl' }">
      <template #body>
        <div v-if="selectedCompanyResponse?.responseDocument && selectedCompanyResponse.documentRequestId" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-divider p-4">
            <div><p class="font-semibold text-ink">{{ selectedCompanyResponse.responseDocument.fileName }}</p><p class="mt-1 text-sm text-muted">ฉบับที่ {{ selectedCompanyResponse.responseDocument.version }}</p></div>
            <div class="flex flex-wrap gap-2"><UButton :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyResponse.documentRequestId}/documents/${selectedCompanyResponse.responseDocument.id}`" target="_blank" label="ดูเต็มหน้า" icon="i-lucide-external-link" color="neutral" variant="outline" size="sm" /><UButton :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyResponse.documentRequestId}/documents/${selectedCompanyResponse.responseDocument.id}`" :download="true" label="ดาวน์โหลด" icon="i-lucide-download" color="primary" size="sm" /></div>
          </div>
          <UAlert v-if="responseActionError" color="error" title="ไม่สามารถยืนยันสถานที่ฝึกงานได้" :description="responseActionError" />
          <div class="h-[60vh] overflow-hidden rounded-panel border border-divider bg-surface"><iframe :src="`/api/staff/cooperative-cycles/${cycleId}/requests/${selectedCompanyResponse.documentRequestId}/documents/${selectedCompanyResponse.responseDocument.id}`" title="หนังสือตอบรับจากสถานประกอบการ" class="h-full w-full" /></div>
        </div>
      </template>
      <template #footer><div class="flex w-full flex-wrap justify-end gap-2"><UButton label="ปิด" size="xl" color="neutral" variant="outline" :disabled="isPlacementConfirming" @click="isCompanyResponseOpen = false" /><UButton v-if="selectedCompanyResponse?.workflow.key === 'response_under_review'" label="ยืนยันสถานที่ฝึกงาน" icon="i-lucide-check-circle-2" color="success" size="xl" :loading="isPlacementConfirming" @click="isPlacementConfirmationOpen = true" /></div></template>
    </UModal>
    <UIConfirmModal v-model:open="isPlacementConfirmationOpen" title="ยืนยันสถานที่ฝึกงาน" description="ระบบจะยืนยันสถานที่ฝึกงานและแจ้งผลให้นักศึกษาทุกคนในชุดเอกสารนี้" confirm-label="ยืนยันสถานที่ฝึกงาน" confirm-color="success" :loading="isPlacementConfirming" @confirm="confirmPlacement" />
    <UIConfirmModal v-model:open="isIncompleteConfirmationOpen" title="นักศึกษายืนยันสถานประกอบการไม่ครบ" :description="`มีนักศึกษาส่งคำร้องแล้ว ${selectedCompanyGroup?.submittedCount || 0} จาก ${selectedCompanyGroup?.applicantCount || 0} คน หากดำเนินการต่อ หนังสือฉบับนี้จะรวมเฉพาะผู้ที่ส่งคำร้องแล้ว ต้องการสร้างตัวอย่างต่อหรือไม่?`" confirm-label="สร้างตัวอย่างต่อ" confirm-color="warning" :loading="groupPreviewLoading" @confirm="renderGroupPreview" />

    <UModal v-model:open="isGroupModalOpen" title="จัดทำหนังสือขอความอนุเคราะห์รวม" description="ตรวจสอบรายชื่อนักศึกษาที่จะอยู่ในเอกสารฉบับนี้" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <UForm class="space-y-4" @submit.prevent="generateGroupLetter">
          <div>
            <p class="text-sm font-semibold text-ink">สถานประกอบการ</p>
            <p class="mt-1 text-base text-ink">{{ selectedCompany }}</p>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-semibold text-ink">นักศึกษา (เลือกได้สูงสุด 6 คน)</p>
            <p v-if="groupCandidatesLoading" class="text-sm text-muted">กำลังโหลดรายชื่อ...</p>
            <UCheckbox v-for="candidate in visibleGroupCandidates" :key="candidate.id" :model-value="selectedGroupRequestIds.includes(candidate.id)" :disabled="!selectedGroupRequestIds.includes(candidate.id) && selectedGroupRequestIds.length >= 6" size="lg" :label="`${candidate.student.prefix}${candidate.student.firstName} ${candidate.student.lastName}`" @update:model-value="toggleGroupRequest(candidate.id)" />
            <p v-if="visibleGroupCandidates.length > 6" class="text-xs text-muted">เลือก 6 คนแรกไว้ให้แล้ว สามารถปรับรายชื่อได้ก่อนออกเอกสาร</p>
            <UAlert v-if="!groupCandidatesLoading && !visibleGroupCandidates.length && !groupError" color="info" variant="subtle" title="ไม่มีรายชื่อที่สามารถเพิ่มได้" description="นักศึกษาที่อยู่ในเอกสารรวมฉบับที่ยังมีผล จะไม่สามารถเลือกซ้ำได้" />
          </div>
          <UFormField label="เลขที่หนังสือ" required>
            <UInput v-model="groupLetterNumber" size="xl" class="w-full" autocomplete="off" />
            <template #help>ระบบแนะนำเลขลำดับต่อปี สามารถแก้ไขก่อนออกเอกสารได้</template>
          </UFormField>
          <UFormField label="วันที่ออกหนังสือ" required :error="issueDateError">
            <UPopover>
              <UInputDate v-model="issueDate" size="xl" class="w-full" locale="th-TH" aria-label="วันที่ออกหนังสือ" />
              <template #content><UCalendar v-model="issueDate" locale="th-TH" /></template>
            </UPopover>
          </UFormField>
          <UAlert v-if="groupError" color="error" title="ไม่สามารถออกเอกสารได้" :description="groupError" />
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="ยกเลิก" color="neutral" variant="outline" size="xl" :disabled="groupLoading" @click="isGroupModalOpen = false" />
          <UButton label="ดูตัวอย่างเอกสาร" icon="i-lucide-eye" size="xl" :loading="groupPreviewLoading" :disabled="groupCandidatesLoading" @click="openGroupPreview" />
        </div>
      </template>
    </UModal>
    <UModal :open="isGroupPreviewOpen" title="ตัวอย่างหนังสือขอความอนุเคราะห์" :description="selectedCompany" :ui="{ content: 'max-w-5xl' }" @update:open="(open) => { if (!open) closeGroupPreview() }">
      <template #body><div class="h-[70vh] overflow-hidden rounded-panel border border-divider bg-surface"><iframe v-if="groupPreviewUrl" :src="groupPreviewUrl" title="ตัวอย่างหนังสือขอความอนุเคราะห์" class="h-full w-full" /></div></template>
      <template #footer><div class="flex w-full flex-wrap justify-end gap-2"><UButton label="กลับไปแก้ไข" color="neutral" variant="outline" size="xl" @click="closeGroupPreview" /><UButton label="ยืนยันออกเอกสาร" icon="i-lucide-file-check-2" color="primary" size="xl" :loading="groupLoading" @click="isGroupGenerationConfirmationOpen = true" /></div></template>
    </UModal>
    <UIConfirmModal v-model:open="isGroupGenerationConfirmationOpen" title="ยืนยันการออกหนังสือขอความอนุเคราะห์" description="ระบบจะบันทึกหนังสือและส่งการแจ้งเตือนพร้อมลิงก์ดาวน์โหลดให้เฉพาะนักศึกษาที่เลือกในฉบับนี้" confirm-label="ออกเอกสาร" :loading="groupLoading" @confirm="generateGroupLetter" />
  </div>
</template>
