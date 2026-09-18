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

const { data, status, error, refresh } = await useFetch<OverviewData>('/api/staff/overview')

const statusDisplay: Record<CycleStatus, { label: string; color: 'success' | 'warning' | 'info' | 'neutral' }> = {
  OPEN_FOR_APPLICATION: { label: 'เปิดรับคำร้อง', color: 'success' },
  APPLICATION_CLOSED: { label: 'ปิดรับคำร้อง', color: 'warning' },
  IN_PROGRESS: { label: 'กำลังฝึกงาน', color: 'info' },
  CLOSED: { label: 'ปิดรอบ', color: 'neutral' }
}

const workMetrics = computed(() => [
  { label: 'รอบที่เปิดรับคำร้อง', value: data.value?.openApplicationCyclesCount ?? 0, icon: 'i-lucide-calendar-check' },
  { label: 'รอบที่กำลังฝึกงาน', value: data.value?.internshipCyclesCount ?? 0, icon: 'i-lucide-briefcase-business' },
  { label: 'คำร้องรอดำเนินการ', value: data.value?.pendingRequestsCount ?? 0, icon: 'i-lucide-file-clock' },
  { label: 'เอกสารตอบรับรอตรวจ', value: data.value?.pendingDocumentsCount ?? 0, icon: 'i-lucide-file-check-2' }
])

const masterMetrics = computed(() => [
  { label: 'นักศึกษาที่ใช้งาน', value: data.value?.studentsCount ?? 0, icon: 'i-lucide-graduation-cap', to: '/staff/students' },
  { label: 'อาจารย์ที่ใช้งาน', value: data.value?.teachersCount ?? 0, icon: 'i-lucide-presentation', to: '/staff/teachers' },
  { label: 'เจ้าหน้าที่ที่ใช้งาน', value: data.value?.staffCount ?? 0, icon: 'i-lucide-users-round', to: '/staff/staffs' },
  { label: 'สถานประกอบการที่ใช้งาน', value: data.value?.companiesCount ?? 0, icon: 'i-lucide-building-2', to: '/staff/companies' }
])

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
      <UDashboardNavbar title="ภาพรวมระบบ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton label="จัดการรอบสหกิจ" icon="i-lucide-calendar-range" to="/staff/cooperative-cycles?select=1" />
          <AppNotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="index in 8" :key="index" class="h-28" />
      </div>

      <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" title="ไม่สามารถโหลดข้อมูลภาพรวมได้" :description="error.message">
        <template #actions><UIButtonRefresh @refresh="refresh" /></template>
      </UAlert>

      <div v-else class="space-y-7">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted">สถานะการดำเนินงาน</h2>
            <p class="mt-0.5 text-sm text-muted">ติดตามรอบสหกิจและงานที่รอดำเนินการจากทุกภาคเรียน</p>
          </div>
          <UIButtonRefresh @refresh="refresh" />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NuxtLink v-for="metric in workMetrics" :key="metric.label" to="/staff/cooperative-cycles?select=1" class="group rounded-lg border border-default bg-default p-4 shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/5">
            <div class="flex items-center justify-between gap-3"><span class="text-sm text-muted group-hover:text-highlighted">{{ metric.label }}</span><UIcon :name="metric.icon" class="size-5 text-primary" /></div>
            <p class="mt-4 text-2xl font-bold tabular-nums text-highlighted">{{ metric.value }}</p>
          </NuxtLink>
        </div>

        <section>
          <h2 class="text-base font-semibold text-highlighted">ข้อมูลหลัก</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <NuxtLink v-for="metric in masterMetrics" :key="metric.label" :to="metric.to" class="rounded-lg border border-default bg-default p-4 shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/5">
              <div class="flex items-center justify-between gap-3"><span class="text-sm text-muted">{{ metric.label }}</span><UIcon :name="metric.icon" class="size-5 text-muted" /></div>
              <p class="mt-4 text-2xl font-bold tabular-nums text-highlighted">{{ metric.value }}</p>
            </NuxtLink>
          </div>
        </section>

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
