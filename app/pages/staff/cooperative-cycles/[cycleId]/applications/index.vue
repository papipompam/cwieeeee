<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
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
  companyApplicationId: number
  status: string
  companyName: string
  position: string | null
  province: string | null
  confirmedAt: string
  letterFilePath: string | null
  letterOriginalName: string | null
  letterIssuedAt: string | null
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
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')
const notify = useNotify()

const page = ref(1)
const pageSize = 10
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const classGroupFilter = ref<string>('all')

const uploadingRowId = ref<number | null>(null)
const fileInputRefs = ref<Record<number, HTMLInputElement | null>>({})

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
      pageSize,
      search: searchQuery.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      classGroup: classGroupFilter.value !== 'all' ? classGroupFilter.value : undefined
    })),
    watch: [page, searchQuery, statusFilter, classGroupFilter]
  }
)

const hasFilters = computed(() => Boolean(searchQuery.value) || statusFilter.value !== 'all' || classGroupFilter.value !== 'all')

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  classGroupFilter.value = 'all'
  page.value = 1
}

watch([searchQuery, statusFilter, classGroupFilter], () => {
  page.value = 1
})

const requestStatusDisplay: Record<string, { label: string; color: 'info' | 'warning' | 'error' | 'success' | 'neutral' }> = {
  DRAFT: { label: 'ฉบับร่าง', color: 'neutral' },
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

const triggerFileInput = (requestId: number) => {
  if (cycle?.value?.status === 'CLOSED') {
    notify.warning('รอบสหกิจนี้ปิดแล้ว ไม่สามารถแนบเอกสารได้')
    return
  }
  const input = fileInputRefs.value[requestId]
  if (input) {
    input.click()
  }
}

const setFileInputRef = (id: number) => (el: unknown) => {
  fileInputRefs.value[id] = el as HTMLInputElement | null
}

const handleFileUpload = async (event: Event, request: RequestRow) => {
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

  uploadingRowId.value = request.id
  const formData = new FormData()
  formData.append('file', file)

  try {
    await $fetch(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${request.id}/letter`, {
      method: 'POST',
      body: formData
    })
    notify.success(`แนบหนังสือสำหรับ ${request.companyName} สำเร็จ`)
    await refresh()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'ไม่สามารถแนบไฟล์หนังสือได้')
  } finally {
    uploadingRowId.value = null
    target.value = ''
  }
}

const columns: TableColumn<RequestRow>[] = [
  {
    accessorKey: 'id',
    header: 'เลขที่คำร้อง',
    meta: { class: { th: 'w-24 ', td: 'w-24  text-xs text-muted' } }
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
    id: 'letter',
    header: 'หนังสือ',
    meta: { class: { th: 'w-36 text-center', td: 'w-36 text-center' } }
  },
  {
    id: 'actions',
    header: 'จัดการ',
    meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end' } }
  }
]

const pageStart = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return (page.value - 1) * pageSize + 1
})
const pageEnd = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize, data.value.total)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header info banner -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-file-check-2" class="size-5 text-primary" />
          คำร้องนักศึกษา
        </h2>
        <p class="text-xs text-muted mt-0.5">
          คิวตรวจสอบคำร้องและออกหนังสือขอความอนุเคราะห์ (ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }})
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- Filter and Control Row -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="ค้นหารหัส ชื่อ หรือบริษัท..."
        class="w-64"
        size="md"
      />

      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        class="w-44"
        size="md"
      />

      <USelect
        v-model="classGroupFilter"
        :items="classGroupOptions"
        value-key="value"
        class="w-36"
        size="md"
      />

      <UButton
        v-if="hasFilters"
        label="ล้างตัวกรอง"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="md"
        @click="clearFilters"
      />
    </div>

    <!-- Table Container -->
    <div class="rounded-lg border border-default overflow-hidden bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="data?.requests || []"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <!-- Request ID -->
          <template #id-cell="{ row }">
            <span class=" font-medium text-highlighted">#{{ row.original.id }}</span>
          </template>

          <!-- Student Info -->
          <template #student-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-sm truncate">
                {{ row.original.student.prefix }}{{ row.original.student.firstName }} {{ row.original.student.lastName }}
              </div>
              <div class="text-xs text-muted  mt-0.5">
                {{ row.original.student.loginId }} · หมู่ {{ row.original.student.classGroup }}
              </div>
            </div>
          </template>

          <!-- Company Snapshot -->
          <template #company-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-sm truncate">
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
              <span class="font-medium text-highlighted">ฉบับที่ {{ row.original.latestDocument.version }}</span>
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

          <!-- Official Letter Column -->
          <template #letter-cell="{ row }">
            <div class="flex items-center justify-center">
              <!-- Hidden accessible file input -->
              <input
                :ref="setFileInputRef(row.original.id)"
                type="file"
                accept="application/pdf"
                class="sr-only"
                :aria-label="`แนบหนังสือขอความอนุเคราะห์สำหรับคำร้องเลขที่ ${row.original.id}`"
                @change="handleFileUpload($event, row.original)"
              />

              <!-- Case 1: Has attached letter -->
              <UButton
                v-if="row.original.letterFilePath"
                label="ดาวน์โหลด"
                icon="i-lucide-download"
                color="neutral"
                variant="outline"
                size="xs"
                :to="`/api/staff/cooperative-cycles/${cycleId}/requests/${row.original.id}/letter`"
                target="_blank"
                :title="row.original.letterOriginalName || 'ดาวน์โหลดหนังสือ'"
              />

              <!-- Case 2: No letter & can upload -->
              <UButton
                v-else-if="['SUBMITTED', 'STAFF_PROCESSING'].includes(row.original.status) && cycle?.status !== 'CLOSED'"
                label="แนบหนังสือ"
                icon="i-lucide-file-up"
                color="primary"
                variant="subtle"
                size="xs"
                :loading="uploadingRowId === row.original.id"
                :disabled="uploadingRowId !== null"
                @click="triggerFileInput(row.original.id)"
              />

              <!-- Case 3: Other states with no file -->
              <span v-else class="text-muted text-xs">—</span>
            </div>
          </template>

          <!-- Action Button: ดูคำร้อง -->
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
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

          <!-- Empty State -->
          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-file-check-2" class="size-8 mx-auto mb-2 text-muted" />
              <p class="font-medium text-highlighted">ไม่พบข้อมูลคำร้องนักศึกษาในรอบนี้</p>
              <p class="text-xs text-muted mt-1">
                เมื่อนักศึกษาส่งคำร้องขอความอนุเคราะห์ ข้อมูลจะปรากฏในตารางนี้
              </p>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Pagination Footer -->
      <div v-if="data && data.total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default text-xs text-muted">
        <div>
          แสดง {{ pageStart }} - {{ pageEnd }} จากทั้งหมด {{ data.total }} รายการ
        </div>

        <UPagination
          v-model:page="page"
          :total="data.total"
          :items-per-page="pageSize"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
