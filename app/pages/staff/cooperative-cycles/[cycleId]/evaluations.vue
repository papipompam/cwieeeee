<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface AppointmentStudent {
  id: number
  loginId: string
  prefix: string | null
  firstName: string | null
  lastName: string | null
}

interface AppointmentTeacher {
  id: number
  teacherId: string
  prefix: string | null
  firstName: string | null
  lastName: string | null
}

interface SupervisionAppointmentRow {
  id: number
  scheduledDate: string
  period: string
  status: string
  evaluationNote: string | null
  evaluatedAt: string | null
  group: {
    id: number
    name: string
    color: string | null
  }
  companyName: string
  province: string | null
  students: AppointmentStudent[]
  teachers: AppointmentTeacher[]
}

interface AppointmentsResponse {
  appointments: SupervisionAppointmentRow[]
  total: number
}

interface SupervisionRound {
  id: number
  roundNo: number
  title: string
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))

const searchQuery = ref('')
const selectedRoundId = ref<number | undefined>(undefined)
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

const exportEvaluations = (type: 'student' | 'company') => {
  window.location.assign(`/api/staff/cooperative-cycles/${cycleId.value}/evaluations/export?type=${type}`)
}

// Fetch Rounds
const { data: roundsData } = await useFetch<{ rounds: SupervisionRound[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`
)
const rounds = computed(() => roundsData.value?.rounds || [])

watch(rounds, (newRounds) => {
  if (newRounds.length > 0 && (!selectedRoundId.value || !newRounds.some(r => r.id === selectedRoundId.value))) {
    selectedRoundId.value = newRounds[0]?.id
  }
}, { immediate: true })

const roundOptions = computed(() => {
  return rounds.value.map(r => ({
    label: `ครั้งที่ ${r.roundNo}: ${r.title}`,
    value: r.id
  }))
})

// Fetch Appointments
const { data, status: fetchStatus, refresh } = await useFetch<AppointmentsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/appointments`,
  {
    query: computed(() => ({
      pageSize: 100
    })),
    immediate: false,
    watch: false
  }
)

watch(selectedRoundId, () => {
  if (selectedRoundId.value) refresh()
}, { immediate: true })

const allAppointments = computed<SupervisionAppointmentRow[]>(() => data.value?.appointments || [])

// Metrics across all appointments in this round
const trackingMetrics = computed(() => {
  const all = allAppointments.value
  const awaitingVisit = all.filter((a: SupervisionAppointmentRow) => a.status === 'PUBLISHED' || a.status === 'RESCHEDULED').length
  const completed = all.filter((a: SupervisionAppointmentRow) => a.status === 'COMPLETED').length
  return {
    total: all.length,
    awaitingVisit,
    completed
  }
})

// Filtered appointments
const filteredAppointments = computed(() => {
  if (!searchQuery.value.trim()) return allAppointments.value
  const q = searchQuery.value.trim().toLowerCase()
  return allAppointments.value.filter((item) => {
    const matchCompany = item.companyName?.toLowerCase().includes(q)
    const matchProvince = item.province?.toLowerCase().includes(q)
    const matchGroup = item.group?.name?.toLowerCase().includes(q)
    const matchTeacher = item.teachers?.some(t => `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase().includes(q))
    const matchStudent = item.students?.some(s => `${s.loginId || ''} ${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(q))
    return matchCompany || matchProvince || matchGroup || matchTeacher || matchStudent
  })
})

const hasFilters = computed(() => Boolean(searchQuery.value.trim()))
const clearFilters = () => {
  searchQuery.value = ''
  page.value = 1
}

watch([searchQuery, pageSize], () => {
  page.value = 1
})

const paginatedAppointments = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredAppointments.value.slice(start, start + pageSize.value)
})

const pageStart = computed(() => {
  if (filteredAppointments.value.length === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const pageEnd = computed(() => {
  return Math.min(page.value * pageSize.value, filteredAppointments.value.length)
})

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const periodLabel = (period: string) => ({
  MORNING: 'ช่วงเช้า',
  AFTERNOON: 'ช่วงบ่าย',
  FULL_DAY: 'เต็มวัน'
}[period] || period)

const columns: TableColumn<SupervisionAppointmentRow>[] = [
  {
    id: 'company',
    header: 'สถานประกอบการ'
  },
  {
    id: 'scheduledDate',
    header: 'กำหนดการนิเทศ',
    meta: { class: { th: 'w-44', td: 'w-44' } }
  },
  {
    id: 'supervisors',
    header: 'อาจารย์นิเทศ',
    meta: { class: { th: 'w-52', td: 'w-52' } }
  },
  {
    id: 'students',
    header: 'นักศึกษา',
    meta: { class: { th: 'w-48', td: 'w-48' } }
  },
  {
    id: 'evaluationStatus',
    header: 'สถานะการติดตามการประเมิน',
    meta: { class: { th: 'w-60', td: 'w-60' } }
  }
]
</script>

<template>
  <div class="w-full space-y-6">
    <UAlert
      v-if="rounds.length === 0"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="ยังไม่มีรอบนิเทศ"
      description="สร้างรอบและจัดกลุ่มพร้อมกำหนดการนิเทศจากหน้า “จัดกลุ่มและมอบหมายอาจารย์นิเทศ” ก่อน"
    />

    <template v-else>
      <!-- Summary Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-5 rounded-panel border border-divider bg-canvas shadow-panel">
          <div class="text-xs text-muted">กำหนดการนิเทศทั้งหมด</div>
          <div class="text-2xl font-bold text-ink mt-1">
            {{ trackingMetrics.total }} รายการ
          </div>
        </div>

        <div class="p-5 rounded-panel border border-divider bg-canvas shadow-panel">
          <div class="text-xs text-muted">รอออกตรวจนิเทศ</div>
          <div class="text-2xl font-bold text-warning mt-1">
            {{ trackingMetrics.awaitingVisit }} รายการ
          </div>
        </div>

        <div class="p-5 rounded-panel border border-divider bg-canvas shadow-panel">
          <div class="text-xs text-muted">ประเมินเสร็จแล้ว</div>
          <div class="text-2xl font-bold text-success mt-1">
            {{ trackingMetrics.completed }} รายการ
          </div>
        </div>
      </div>

      <!-- Informational Banner: Teacher Phase Notice -->
      <div class="rounded-panel border border-info/30 bg-info/5 p-4 flex items-start gap-3">
        <UIcon name="i-lucide-info" class="size-5 text-info shrink-0 mt-0.5" />
        <div class="text-xs">
          <div class="font-semibold text-ink">หมายเหตุการให้คะแนนและบันทึกผลการประเมิน</div>
          <p class="text-muted mt-0.5 leading-relaxed">
            อาจารย์ที่ได้รับมอบหมายจะบันทึกผลและจบการประเมินจากหน้าของตนเอง หน้านี้สำหรับเจ้าหน้าที่ใช้ติดตามผลเท่านั้น
          </p>
        </div>
      </div>

      <!-- Data Table Card Container -->
      <UCard :ui="{ body: 'p-0' }">
        <!-- Header info and controls -->
        <div class="border-b border-divider p-5 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-bold text-ink flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-check" class="size-5 text-primary" />
                ติดตามผลการประเมินการนิเทศ
              </h3>
              <p class="mt-1 text-sm leading-6 text-muted">
                ติดตามสถานะความคืบหน้าการประเมินผลการนิเทศสหกิจศึกษาตามรอบ
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
              <USelect
                v-model="selectedRoundId"
                :items="roundOptions"
                class="w-56"
                size="xl"
              />
              <UIButtonRefresh
                :loading="fetchStatus === 'pending'"
                @refresh="refresh"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-divider pt-4">
            <span class="mr-1 text-xs font-medium text-muted">การจัดการแบบประเมิน:</span>
            <UButton
              label="ส่งออกประเมินนักศึกษา"
              icon="i-lucide-file-spreadsheet"
              color="neutral"
              variant="outline"
              size="md"
              @click="exportEvaluations('student')"
            />
            <UButton
              label="ส่งออกประเมินสถานประกอบการ"
              icon="i-lucide-file-spreadsheet"
              color="neutral"
              variant="outline"
              size="md"
              @click="exportEvaluations('company')"
            />
          </div>

          <!-- Control Row -->
          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <UFormField label="ค้นหาตารางประเมิน" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
              <UInput
                v-model="searchQuery"
                type="search"
                size="xl"
                icon="i-lucide-search"
                class="w-full"
                placeholder="ค้นหาสถานประกอบการ อาจารย์ หรือนักศึกษา..."
                aria-label="ค้นหาตารางประเมิน"
              />
            </UFormField>
          </div>

          <!-- Active Filter Chips -->
          <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-muted">ตัวกรองที่ใช้:</span>
            <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
              คำค้น “{{ searchQuery }}”
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              label="ล้างตัวกรอง"
              @click="clearFilters"
            />
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="fetchStatus === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
          <div v-for="row in 4" :key="row" class="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 max-md:grid-cols-[1fr_7rem]">
            <USkeleton class="h-10" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!filteredAppointments.length" class="p-5 sm:p-6">
          <UEmpty
            icon="i-lucide-clipboard-check"
            class="min-h-64"
            :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลการประเมินผลในรอบนี้'"
            :description="hasFilters ? 'ลองเปลี่ยนคำค้นหา' : 'เมื่อมีการสร้างและเผยแพร่ตารางนิเทศ ระบบจะเริ่มติดตามสถานะการประเมินที่นี่'"
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
              :data="paginatedAppointments"
              :columns="columns"
              class="min-w-full"
              :ui="{ base: 'w-full min-w-200' }"
            >
              <!-- Company -->
              <template #company-cell="{ row }">
                <div>
                  <div class="font-semibold text-sm text-ink">
                    {{ row.original.companyName }}
                  </div>
                  <div class="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
                    <span>{{ row.original.province || 'ไม่ระบุจังหวัด' }}</span>
                    <span>· {{ row.original.group?.name }}</span>
                  </div>
                </div>
              </template>

              <!-- Scheduled Date -->
              <template #scheduledDate-cell="{ row }">
                <div>
                  <div class="font-medium text-ink text-sm flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                    {{ formatDate(row.original.scheduledDate) }}
                  </div>
                  <div class="text-xs text-muted mt-0.5">
                    {{ periodLabel(row.original.period) }}
                  </div>
                </div>
              </template>

              <!-- Supervisors -->
              <template #supervisors-cell="{ row }">
                <div class="text-sm">
                  <div
                    v-for="t in row.original.teachers"
                    :key="t.id"
                    class="truncate text-ink font-medium"
                  >
                    {{ t.prefix }}{{ t.firstName }} {{ t.lastName }}
                  </div>
                  <div v-if="!row.original.teachers || row.original.teachers.length === 0" class="text-muted italic text-xs">
                    ยังไม่ระบุอาจารย์
                  </div>
                </div>
              </template>

              <!-- Students -->
              <template #students-cell="{ row }">
                <div class="text-sm">
                  <div class="font-medium text-ink">
                    {{ row.original.students?.length || 0 }} คน
                  </div>
                  <div class="text-xs text-muted truncate">
                    {{ row.original.students?.map(s => `${s.prefix || ''}${s.firstName}`).join(', ') }}
                  </div>
                </div>
              </template>

              <!-- Evaluation Tracking Status -->
              <template #evaluationStatus-cell="{ row }">
                <div>
                  <template v-if="row.original.status === 'COMPLETED'">
                    <UBadge label="ประเมินเสร็จแล้ว" color="success" variant="subtle" size="xs" />
                    <div v-if="row.original.evaluatedAt" class="text-xs text-muted mt-0.5">บันทึกเมื่อ {{ formatDate(row.original.evaluatedAt) }}</div>
                    <div v-if="row.original.evaluationNote" class="mt-1 line-clamp-2 text-xs text-muted">{{ row.original.evaluationNote }}</div>
                  </template>
                  <template v-else-if="row.original.status === 'PUBLISHED' || row.original.status === 'RESCHEDULED'">
                    <UBadge label="รอออกตรวจนิเทศตามนัดหมาย" color="warning" variant="subtle" size="xs" />
                    <div class="text-xs text-muted mt-0.5">ยังไม่ถึงวันตรวจหรือยังไม่ได้ตรวจเยี่ยม</div>
                  </template>
                  <template v-else-if="row.original.status === 'CANCELLED'">
                    <UBadge label="ยกเลิกการนิเทศแล้ว" color="error" variant="subtle" size="xs" />
                  </template>
                  <template v-else>
                    <UBadge :label="row.original.status" color="neutral" variant="subtle" size="xs" />
                  </template>
                </div>
              </template>
            </UTable>
          </div>

          <!-- Footer -->
          <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex flex-wrap items-center gap-3">
              <p class="whitespace-nowrap text-muted">
                แสดง {{ pageStart }}–{{ pageEnd }} จากทั้งหมด {{ filteredAppointments.length }} รายการ
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
              v-if="filteredAppointments.length > 0"
              v-model:page="page"
              :total="filteredAppointments.length"
              :items-per-page="pageSize"
              size="md"
            />
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
