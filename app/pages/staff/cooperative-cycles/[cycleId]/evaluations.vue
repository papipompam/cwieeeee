<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

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
const cycle = inject<Ref<any>>('currentCycle')

const searchQuery = ref('')
const selectedRoundId = ref<number | undefined>(undefined)

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
      search: searchQuery.value || undefined,
      pageSize: 100
    })),
    immediate: false,
    watch: false
  }
)

watch([selectedRoundId, searchQuery], () => {
  if (selectedRoundId.value) refresh()
}, { immediate: true })

const appointments = computed<SupervisionAppointmentRow[]>(() => data.value?.appointments || [])

// Metrics
const trackingMetrics = computed(() => {
  const all = appointments.value
  const awaitingVisit = all.filter((a: SupervisionAppointmentRow) => a.status === 'PUBLISHED' || a.status === 'RESCHEDULED').length
  const completed = all.filter((a: SupervisionAppointmentRow) => a.status === 'COMPLETED').length
  return {
    total: all.length,
    awaitingVisit,
    completed
  }
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
  <div class="space-y-4">
    <!-- Header & Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-clipboard-check" class="size-5 text-primary" />
          ติดตามผลการประเมินการนิเทศ
        </h2>
        <p class="text-xs text-muted mt-0.5">
          ติดตามสถานะความคืบหน้าการประเมินผลการนิเทศสหกิจศึกษา (สำหรับเจ้าหน้าที่ - โหมดติดตามเท่านั้น)
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
          <USelect
            v-model="selectedRoundId"
            :items="roundOptions"
            class="w-52"
            size="md"
          />
        </div>

        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- Informational Banner: Teacher Phase Notice -->
    <div class="rounded-lg border border-info/30 bg-info/5 p-3.5 flex items-start gap-3">
      <UIcon name="i-lucide-info" class="size-5 text-info shrink-0 mt-0.5" />
      <div class="text-xs">
        <div class="font-semibold text-highlighted">หมายเหตุการให้คะแนนและบันทึกผลการประเมิน</div>
        <p class="text-muted mt-0.5 leading-relaxed">
          อาจารย์ที่ได้รับมอบหมายจะบันทึกผลและจบการประเมินจากหน้าของตนเอง หน้านี้สำหรับเจ้าหน้าที่ใช้ติดตามผลเท่านั้น
        </p>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="p-3.5 rounded-lg border border-default bg-default shadow-xs">
        <div class="text-xs text-muted">กำหนดการนิเทศทั้งหมด</div>
        <div class="text-xl font-bold text-highlighted mt-1">
          {{ trackingMetrics.total }} รายการ
        </div>
      </div>

      <div class="p-3.5 rounded-lg border border-default bg-default shadow-xs">
        <div class="text-xs text-muted">รอออกตรวจนิเทศ</div>
        <div class="text-xl font-bold text-warning mt-1">
          {{ trackingMetrics.awaitingVisit }} รายการ
        </div>
      </div>

      <div class="p-3.5 rounded-lg border border-default bg-default shadow-xs">
          <div class="text-xs text-muted">ประเมินเสร็จแล้ว</div>
        <div class="text-xl font-bold text-success mt-1">
          {{ trackingMetrics.completed }} รายการ
        </div>
      </div>
    </div>

    <!-- Filter Row -->
    <div class="flex items-center gap-2">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="ค้นหาสถานประกอบการ อาจารย์ หรือนักศึกษา..."
        class="w-72"
        size="md"
      />
      <UButton
        v-if="searchQuery"
        label="ล้าง"
        color="neutral"
        variant="ghost"
        size="md"
        @click="searchQuery = ''"
      />
    </div>

    <!-- Data Table Container -->
    <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="appointments"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <!-- Company -->
          <template #company-cell="{ row }">
            <div>
              <div class="font-semibold text-xs text-highlighted">
                {{ row.original.companyName }}
              </div>
              <div class="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3 shrink-0" />
                <span>{{ row.original.province || 'ไม่ระบุจังหวัด' }}</span>
                <span>· {{ row.original.group.name }}</span>
              </div>
            </div>
          </template>

          <!-- Scheduled Date -->
          <template #scheduledDate-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-xs flex items-center gap-1.5">
                <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                {{ formatDate(row.original.scheduledDate) }}
              </div>
              <div class="text-[11px] text-muted mt-0.5">
                {{ periodLabel(row.original.period) }}
              </div>
            </div>
          </template>

          <!-- Supervisors -->
          <template #supervisors-cell="{ row }">
            <div class="text-xs">
              <div
                v-for="t in row.original.teachers"
                :key="t.id"
                class="truncate text-highlighted font-medium"
              >
                {{ t.prefix }}{{ t.firstName }} {{ t.lastName }}
              </div>
              <div v-if="row.original.teachers.length === 0" class="text-muted italic text-[11px]">
                ยังไม่ระบุอาจารย์
              </div>
            </div>
          </template>

          <!-- Students -->
          <template #students-cell="{ row }">
            <div class="text-xs">
              <div class="font-medium text-highlighted">
                {{ row.original.students.length }} คน
              </div>
              <div class="text-[11px] text-muted truncate">
                {{ row.original.students.map(s => `${s.prefix || ''}${s.firstName}`).join(', ') }}
              </div>
            </div>
          </template>

          <!-- Evaluation Tracking Status -->
          <template #evaluationStatus-cell="{ row }">
            <div>
              <template v-if="row.original.status === 'COMPLETED'">
                <UBadge label="ประเมินเสร็จแล้ว" color="success" variant="subtle" size="xs" />
                <div v-if="row.original.evaluatedAt" class="text-[11px] text-muted mt-0.5">บันทึกเมื่อ {{ formatDate(row.original.evaluatedAt) }}</div>
                <div v-if="row.original.evaluationNote" class="mt-1 line-clamp-2 text-[11px] text-muted">{{ row.original.evaluationNote }}</div>
              </template>
              <template v-else-if="row.original.status === 'PUBLISHED' || row.original.status === 'RESCHEDULED'">
                <UBadge label="รอออกตรวจนิเทศตามนัดหมาย" color="warning" variant="subtle" size="xs" />
                <div class="text-[11px] text-muted mt-0.5">ยังไม่ถึงวันตรวจหรือยังไม่ได้ตรวจเยี่ยม</div>
              </template>
              <template v-else-if="row.original.status === 'CANCELLED'">
                <UBadge label="ยกเลิกการนิเทศแล้ว" color="error" variant="subtle" size="xs" />
              </template>
              <template v-else>
                <UBadge :label="row.original.status" color="neutral" variant="subtle" size="xs" />
              </template>
            </div>
          </template>

          <!-- Empty State -->
          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-clipboard-check" class="size-8 mx-auto mb-2 text-dimmed" />
              <p class="font-medium text-highlighted">ยังไม่มีข้อมูลการประเมินผลในรอบนี้</p>
              <p class="text-xs text-muted mt-1">
                เมื่อมีการสร้างและเผยแพร่ตารางนิเทศ ระบบจะเริ่มติดตามสถานะการประเมินที่นี่
              </p>
            </div>
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
