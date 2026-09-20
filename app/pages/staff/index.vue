<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type CycleStatus = 'OPEN_FOR_APPLICATION' | 'APPLICATION_CLOSED' | 'IN_PROGRESS' | 'CLOSED'

interface RecentCycle {
  id: number
  term: number
  academicYear: number
  status: CycleStatus
  applicationStartDate: string
  applicationEndDate: string
  internshipStartDate: string
  internshipEndDate: string
  enrolledStudentsCount: number
}

interface CooperativeCycle extends Omit<RecentCycle, 'enrolledStudentsCount'> {
  cohortYear: number
  note?: string | null
}

interface OverviewData {
  openApplicationCyclesCount: number
  internshipCyclesCount: number
  pendingRequestsCount: number
  pendingDocumentsCount: number
  studentsCount: number
  teachersCount: number
  staffCount: number
  companiesCount: number
  recentCycles: RecentCycle[]
}

interface CycleSummaryData {
  cohortStudentsCount: number
  submittedRequestsCount: number
  pendingReviewRequestsCount: number
  supervisionGroupsCount?: number
  supervisionPublishedAppointmentsCount?: number
  placementOverview: {
    notApplied: number
    inProgress: number
    needsAction: number
    confirmed: number
  }
}

const { data, status, error, refresh } = await useFetch<OverviewData>('/api/staff/overview')
const { activeCycleId: savedCycleId, setActiveCycle } = useStaffActiveCycle()
const { data: cycles } = await useFetch<CooperativeCycle[]>('/api/cooperative-cycles')
const selectedCycleId = ref<number | undefined>(
  cycles.value?.some(cycle => cycle.id === Number(savedCycleId.value))
    ? Number(savedCycleId.value)
    : cycles.value?.[0]?.id
)
const { data: cycleSummary, refresh: refreshCycleSummary } = await useFetch<CycleSummaryData>(
  () => `/api/staff/cooperative-cycles/${selectedCycleId.value}/summary`,
  { immediate: Boolean(selectedCycleId.value) }
)

watch(selectedCycleId, cycleId => setActiveCycle(cycleId ?? null), { immediate: true })

const cycleOptions = computed(() => (cycles.value ?? []).map(cycle => ({
  value: cycle.id,
  label: `ภาคเรียนที่ ${cycle.term}/${cycle.academicYear} · รุ่น ${String(cycle.cohortYear).slice(-2)}`
})))

const statusDisplay: Record<CycleStatus, { label: string; color: 'success' | 'warning' | 'info' | 'neutral' }> = {
  OPEN_FOR_APPLICATION: { label: 'เปิดรับคำร้อง', color: 'success' },
  APPLICATION_CLOSED: { label: 'ปิดรับคำร้อง', color: 'warning' },
  IN_PROGRESS: { label: 'กำลังฝึกงาน', color: 'info' },
  CLOSED: { label: 'ปิดรอบ', color: 'neutral' }
}

const workMetrics = computed(() => [
  { label: 'คำร้องขอออกหนังสือ', value: cycleSummary.value?.submittedRequestsCount ?? data.value?.pendingRequestsCount ?? 0, icon: 'i-lucide-clipboard-list' },
  { label: 'เอกสารลงนามรอตรวจ', value: cycleSummary.value?.pendingReviewRequestsCount ?? data.value?.pendingDocumentsCount ?? 0, icon: 'i-lucide-file-check-2' },
  { label: 'รอจัดกลุ่มนิเทศ ครั้งที่ 1', value: cycleSummary.value?.supervisionGroupsCount ?? 0, icon: 'i-lucide-users-round' },
  { label: 'นัดนิเทศที่เผยแพร่', value: cycleSummary.value?.supervisionPublishedAppointmentsCount ?? 0, icon: 'i-lucide-calendar-days' }
])

const placementItems = computed(() => {
  const overview = cycleSummary.value?.placementOverview
  const total = cycleSummary.value?.cohortStudentsCount ?? 0
  const items = [
    { key: 'confirmed', label: 'ยืนยันแล้ว', count: overview?.confirmed ?? 0, colorClass: 'text-success', dotClass: 'bg-success' },
    { key: 'waiting', label: 'รอยืนยัน', count: (overview?.inProgress ?? 0) + (overview?.needsAction ?? 0), colorClass: 'text-primary', dotClass: 'bg-primary' },
    { key: 'pending', label: 'ยังไม่ดำเนินการ', count: overview?.notApplied ?? 0, colorClass: 'text-muted/30', dotClass: 'bg-muted/30' }
  ]

  return items.map(item => ({
    ...item,
    percent: total ? Math.round(item.count / total * 100) : 0
  }))
})

const donutCircumference = 2 * Math.PI * 40
const placementSegments = computed(() => {
  const total = cycleSummary.value?.cohortStudentsCount ?? 0
  let offset = 0

  return placementItems.value.map((item) => {
    const length = total ? item.count / total * donutCircumference : 0
    const segment = { ...item, length, offset }
    offset += length
    return segment
  })
})

const refreshDashboard = async () => {
  await Promise.all([refresh(), refreshCycleSummary()])
}

const cycleColumns: TableColumn<RecentCycle>[] = [
  { id: 'cycle', header: 'รอบสหกิจ' },
  { id: 'applicationPeriod', header: 'ช่วงรับคำร้อง' },
  { id: 'internshipPeriod', header: 'ช่วงฝึกงาน' },
  { accessorKey: 'enrolledStudentsCount', header: 'นักศึกษาในรอบ', meta: { class: { th: 'text-end', td: 'text-end tabular-nums' } } },
  { id: 'status', header: 'สถานะ' },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'text-end', td: 'text-end' } } }
]

const formatDate = (value: string) => new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <UDashboardPanel id="staff-overview">
    <template #header>
      <AppDashboardNavbar title="ภาพรวมระบบ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton label="จัดการรอบสหกิจ" icon="i-lucide-calendar-range" to="/staff/cooperative-cycles?select=1" />
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="index in 8" :key="index" class="h-28" />
      </div>

      <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" title="ไม่สามารถโหลดข้อมูลภาพรวมได้" :description="error.message">
        <template #actions><UIButtonRefresh @refresh="refresh" /></template>
      </UAlert>

      <div v-else class="space-y-7">
        <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 class="text-base font-bold text-highlighted">สถานะการดำเนินงาน</h2>
            <p class="mt-0.5 text-sm font-normal text-muted">ติดตามรอบสหกิจและงานที่รอดำเนินการจากทุกภาคเรียน</p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-3">
            <label class="block w-full sm:w-72">
              <span class="mb-1.5 block text-sm font-semibold text-highlighted">รอบสหกิจศึกษา</span>
              <USelectMenu
                v-model="selectedCycleId"
                :items="cycleOptions"
                value-key="value"
                label-key="label"
                :search-input="false"
                trailing-icon="i-lucide-chevron-down"
                placeholder="เลือกรอบสหกิจศึกษา"
                class="w-full"
                :ui="{ base: 'min-h-11 rounded-xl bg-default px-3', content: 'min-w-(--reka-combobox-trigger-width)' }"
                aria-label="เลือกรอบสหกิจศึกษา"
              />
            </label>
            <UIButtonRefresh @refresh="refreshDashboard" />
          </div>
        </div>

        <div class="grid items-stretch gap-4 xl:grid-cols-2">
          <div class="grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="metric in workMetrics"
              :key="metric.label"
              to="/staff/cooperative-cycles?select=1"
              class="group flex min-h-30 flex-col justify-between rounded-xl border border-default bg-default p-5 shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/5 sm:p-6"
            >
              <div class="flex items-start justify-between gap-4">
                <span class="text-sm font-medium leading-6 text-muted group-hover:text-highlighted">{{ metric.label }}</span>
                <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-muted/40 text-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <UIcon :name="metric.icon" class="size-5" />
                </span>
              </div>
              <p class="mt-4 text-3xl font-extrabold tabular-nums leading-none text-highlighted">{{ metric.value }}</p>
            </NuxtLink>
          </div>

          <UCard variant="outline" class="h-full" :ui="{ body: 'h-full p-5 sm:p-6' }">
            <h3 class="text-base font-bold text-highlighted">สถานะการยืนยันสถานประกอบการ</h3>
            <div class="mt-5 grid min-h-55 items-center gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div
                class="relative mx-auto size-44 shrink-0"
                role="img"
                :aria-label="`นักศึกษาทั้งหมด ${cycleSummary?.cohortStudentsCount ?? 0} คน`"
              >
                <svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="11" class="text-muted/15" />
                  <circle
                    v-for="segment in placementSegments"
                    :key="segment.key"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="11"
                    stroke-linecap="butt"
                    :stroke-dasharray="`${segment.length} ${donutCircumference - segment.length}`"
                    :stroke-dashoffset="-segment.offset"
                    :class="segment.colorClass"
                  />
                </svg>
                <div class="absolute inset-0 grid place-content-center text-center">
                  <strong class="text-3xl font-extrabold tabular-nums text-highlighted">{{ cycleSummary?.cohortStudentsCount ?? 0 }}</strong>
                  <span class="mt-1 text-xs font-medium text-muted">นักศึกษา</span>
                </div>
              </div>

              <dl class="divide-y divide-default">
                <div v-for="item in placementItems" :key="item.key" class="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span class="size-2.5 shrink-0 rounded-full" :class="item.dotClass" aria-hidden="true" />
                  <dt class="min-w-0 flex-1 text-sm font-medium text-muted">{{ item.label }}</dt>
                  <dd class="flex items-baseline gap-3 text-right">
                    <strong class="min-w-6 text-base font-bold tabular-nums text-highlighted">{{ item.count }}</strong>
                    <span class="w-10 text-xs font-medium tabular-nums text-muted">{{ item.percent }}%</span>
                  </dd>
                </div>
              </dl>
            </div>
          </UCard>
        </div>

        <section>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div><h2 class="text-base font-semibold text-highlighted">รอบสหกิจล่าสุด</h2><p class="mt-0.5 text-sm text-muted">เลือกเข้าสู่รอบเพื่อจัดการคำร้อง นักศึกษา และการนิเทศ</p></div>
            <UButton label="ดูทุกรอบ" icon="i-lucide-arrow-right" color="neutral" variant="outline" to="/staff/cooperative-cycles?select=1" />
          </div>
          <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
            <UTable :data="data?.recentCycles ?? []" :columns="cycleColumns" class="min-w-full">
              <template #cycle-cell="{ row }"><span class="font-medium text-highlighted">ภาคเรียนที่ {{ row.original.term }}/{{ row.original.academicYear }}</span></template>
              <template #applicationPeriod-cell="{ row }"><span class="text-muted">{{ formatDate(row.original.applicationStartDate) }} – {{ formatDate(row.original.applicationEndDate) }}</span></template>
              <template #internshipPeriod-cell="{ row }"><span class="text-muted">{{ formatDate(row.original.internshipStartDate) }} – {{ formatDate(row.original.internshipEndDate) }}</span></template>
              <template #enrolledStudentsCount-cell="{ row }">{{ row.original.enrolledStudentsCount }} คน</template>
              <template #status-cell="{ row }"><UBadge :label="statusDisplay[row.original.status].label" :color="statusDisplay[row.original.status].color" variant="subtle" /></template>
              <template #actions-cell="{ row }"><UButton label="เข้าสู่รอบ" icon="i-lucide-arrow-right" color="primary" variant="ghost" size="xs" :to="`/staff/cooperative-cycles/${row.original.id}`" /></template>
              <template #empty><div class="py-12 text-center text-muted"><UIcon name="i-lucide-calendar-x" class="mx-auto mb-2 size-8" /><p>ยังไม่มีรอบสหกิจ</p></div></template>
            </UTable>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
