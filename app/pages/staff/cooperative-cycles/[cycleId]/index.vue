<script setup lang="ts">
import type { Ref } from 'vue'

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  status: string
}

interface SummaryData {
  cohortStudentsCount: number
  studentsWithApplicationCount: number
  submittedRequestsCount: number
  letterReadyRequestsCount: number
  pendingReviewRequestsCount: number
  returnedRequestsCount: number
  confirmedPlacementsCount: number
  rejectedRequestsCount: number
  supervisionGroupsCount?: number
  supervisionAppointmentsCount?: number
  supervisionPublishedAppointmentsCount?: number
  supervisionCompletedAppointmentsCount?: number
  supervisionAssignedTeachersCount?: number
  supervisionTravelPlansCount?: number
  supervisionBudgetEstimate?: number
  placementOverview: {
    notApplied: number
    inProgress: number
    needsAction: number
    confirmed: number
  }
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')

const { data: summary, status: fetchStatus, refresh } = await useFetch<SummaryData>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/summary`
)

// Summary metrics
const summaryMetrics = computed(() => {
  const s = summary.value
  return [
    {
      label: 'นักศึกษาในรอบนี้',
      value: `${s?.cohortStudentsCount ?? 0} คน`,
      icon: 'i-lucide-graduation-cap',
      color: 'primary',
      to: `/staff/cooperative-cycles/${cycleId.value}/students`
    },
    {
      label: 'เริ่มยื่นสถานประกอบการ',
      value: `${s?.studentsWithApplicationCount ?? 0} คน`,
      icon: 'i-lucide-send',
      color: 'info',
      to: `/staff/cooperative-cycles/${cycleId.value}/students`
    },
    {
      label: 'คำร้องรอดำเนินการ',
      value: `${s?.submittedRequestsCount ?? 0} รายการ`,
      icon: 'i-lucide-file-text',
      color: (s?.submittedRequestsCount ?? 0) > 0 ? 'warning' : 'neutral',
      to: `/staff/cooperative-cycles/${cycleId.value}/applications?status=SUBMITTED`
    },
    {
      label: 'เอกสารตอบรับรอตรวจ',
      value: `${s?.pendingReviewRequestsCount ?? 0} ฉบับ`,
      icon: 'i-lucide-file-check-2',
      color: (s?.pendingReviewRequestsCount ?? 0) > 0 ? 'warning' : 'neutral',
      to: `/staff/cooperative-cycles/${cycleId.value}/applications?status=DOCUMENT_UNDER_REVIEW`
    }
  ]
})

const donutCircumference = 2 * Math.PI * 38
const placementSegments = computed(() => {
  const overview = summary.value?.placementOverview
  const total = summary.value?.cohortStudentsCount ?? 0
  const segments = [
    { key: 'notApplied', label: 'ยังไม่เริ่มยื่น', colorClass: 'text-neutral', count: overview?.notApplied ?? 0 },
    { key: 'inProgress', label: 'อยู่ระหว่างดำเนินการ', colorClass: 'text-info', count: overview?.inProgress ?? 0 },
    { key: 'needsAction', label: 'ต้องแก้ไขหรือยื่นใหม่', colorClass: 'text-warning', count: overview?.needsAction ?? 0 },
    { key: 'confirmed', label: 'ยืนยันสถานประกอบการแล้ว', colorClass: 'text-success', count: overview?.confirmed ?? 0 }
  ]
  let offset = 0

  return segments.map((segment) => {
    const length = total ? (segment.count / total) * donutCircumference : 0
    const result = {
      ...segment,
      percent: total ? Math.round((segment.count / total) * 100) : 0,
      dashArray: `${length} ${donutCircumference - length}`,
      dashOffset: -offset
    }
    offset += length
    return result
  })
})

const openTask = (path: string) => navigateTo(path)

// Actionable tasks checklist
const tasks = computed(() => {
  const s = summary.value

  return [
    {
      name: 'จัดอาจารย์นิเทศประจำกลุ่ม',
      progress: `${s?.supervisionGroupsCount ?? 0} กลุ่ม`,
      remaining: `${s?.supervisionAssignedTeachersCount ?? 0} ท่าน`,
      statusLabel: (s?.supervisionGroupsCount ?? 0) > 0 ? 'จัดกลุ่มแล้ว' : 'ยังไม่เริ่ม',
      statusColor: (s?.supervisionGroupsCount ?? 0) > 0 ? 'success' as const : 'neutral' as const,
      actionLabel: 'จัดกลุ่มอาจารย์',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/supervisors`
    },
    {
      name: 'กำหนดการนิเทศและตารางตรวจเยี่ยม',
      progress: `${s?.supervisionPublishedAppointmentsCount ?? 0}/${s?.supervisionAppointmentsCount ?? 0}`,
      remaining: `${(s?.supervisionAppointmentsCount ?? 0) - (s?.supervisionPublishedAppointmentsCount ?? 0)} ร่าง`,
      statusLabel: (s?.supervisionPublishedAppointmentsCount ?? 0) > 0 ? 'เผยแพร่แล้ว' : ((s?.supervisionAppointmentsCount ?? 0) > 0 ? 'ฉบับร่าง' : 'ยังไม่เริ่ม'),
      statusColor: (s?.supervisionPublishedAppointmentsCount ?? 0) > 0 ? 'success' as const : ((s?.supervisionAppointmentsCount ?? 0) > 0 ? 'warning' as const : 'neutral' as const),
      actionLabel: 'จัดตารางนิเทศ',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/visits`
    },
    {
      name: 'ติดตามการประเมิน (นักศึกษา/สถานประกอบการ)',
      progress: `${s?.supervisionCompletedAppointmentsCount ?? 0}/${s?.supervisionAppointmentsCount ?? 0}`,
      remaining: `${(s?.supervisionAppointmentsCount ?? 0) - (s?.supervisionCompletedAppointmentsCount ?? 0)} รายการ`,
      statusLabel: (s?.supervisionCompletedAppointmentsCount ?? 0) > 0 ? 'เสร็จสิ้น' : 'รอการนิเทศ',
      statusColor: (s?.supervisionCompletedAppointmentsCount ?? 0) > 0 ? 'info' as const : 'neutral' as const,
      actionLabel: 'ดูการประเมิน',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/evaluations`
    },
    {
      name: 'จัดสรรงบประมาณนิเทศ',
      progress: `${s?.supervisionTravelPlansCount ?? 0} แผน`,
      remaining: `฿${(s?.supervisionBudgetEstimate ?? 0).toLocaleString('th-TH')}`,
      statusLabel: (s?.supervisionTravelPlansCount ?? 0) > 0 ? 'มีแผนเดินทาง' : 'ยังไม่มีแผน',
      statusColor: (s?.supervisionTravelPlansCount ?? 0) > 0 ? 'success' as const : 'neutral' as const,
      actionLabel: 'จัดการงบประมาณ',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/budgets`
    }
  ]
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header banner -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-ink flex items-center gap-2">
          <UIcon name="i-lucide-layout-grid" class="size-5 text-primary" />
          สรุปภาพรวมรอบสหกิจ
        </h2>
        <p class="text-xs text-muted mt-0.5">
          ภาพรวมความคืบหน้ากระบวนการสหกิจศึกษา ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }}
        </p>
      </div>

      <UIButtonRefresh
        :loading="fetchStatus === 'pending'"
        @refresh="refresh"
      />
    </div>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] lg:items-stretch">
      <div class="grid grid-cols-2 gap-3 content-start">
        <NuxtLink
          v-for="item in summaryMetrics"
          :key="item.label"
          :to="item.to"
          class="rounded-panel border border-divider p-3.5 bg-canvas shadow-panel flex flex-col justify-between hover:border-primary/50 transition-colors group min-h-28"
        >
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-xs text-muted leading-snug group-hover:text-ink transition-colors">{{ item.label }}</span>
            <div class="p-1 rounded-md bg-surface text-muted group-hover:text-primary transition-colors">
              <UIcon :name="item.icon" class="size-4" />
            </div>
          </div>
          <div class="text-lg font-bold text-ink tabular-nums">
            {{ item.value }}
          </div>
        </NuxtLink>
      </div>

      <UCard class="h-full" :ui="{ body: 'h-full p-4 sm:p-6' }">
        <div class="flex h-full flex-col items-center justify-center gap-4 sm:flex-row sm:items-center">
          <div class="relative size-44 shrink-0" role="img" aria-label="แผนภูมิวงกลมแสดงสถานะการได้สถานประกอบการของนักศึกษา">
            <svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="13" class="text-muted/20" />
              <circle
                v-for="segment in placementSegments"
                :key="segment.key"
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="currentColor"
                stroke-width="13"
                :stroke-dasharray="segment.dashArray"
                :stroke-dashoffset="segment.dashOffset"
                class="transition-[stroke-dasharray,stroke-dashoffset] duration-300 motion-reduce:transition-none"
                :class="segment.colorClass"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-2xl font-bold tabular-nums text-ink">{{ summary?.cohortStudentsCount ?? 0 }}</span>
              <span class="text-xs text-muted">นักศึกษา</span>
            </div>
          </div>

          <ul class="w-full space-y-2" aria-label="รายละเอียดสถานะการได้สถานประกอบการ">
            <li v-for="segment in placementSegments" :key="segment.key" class="flex items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2 text-muted">
                <span class="size-2.5 shrink-0 rounded-full" :class="segment.colorClass.replace('text-', 'bg-')" />
                <span class="truncate">{{ segment.label }}</span>
              </span>
              <span class="shrink-0 font-medium tabular-nums text-ink">{{ segment.count }} คน ({{ segment.percent }}%)</span>
            </li>
          </ul>
        </div>
      </UCard>
    </section>

    <!-- Section 2: Actionable Tasks Checklist Table -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-ink flex items-center gap-2">
          <UIcon name="i-lucide-list-checks" class="size-4 text-primary" />
          งานนิเทศและงบประมาณในรอบนี้
        </h3>
        <span class="text-xs text-muted">หลังยืนยันสถานประกอบการแล้ว</span>
      </div>

      <UCard :ui="{ body: 'p-0' }">
        <div class="w-full overflow-x-auto">
          <table class="min-w-full divide-y divide-divider text-sm text-left">
            <thead class="bg-surface text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-4 py-3">งานที่ต้องดำเนินการ</th>
                <th scope="col" class="px-4 py-3">ความคืบหน้า</th>
                <th scope="col" class="px-4 py-3">คงเหลือ</th>
                <th scope="col" class="px-4 py-3">สถานะ</th>
                <th scope="col" class="px-4 py-3 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr
                v-for="(task, idx) in tasks"
                :key="idx"
                class="group cursor-pointer transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
                role="link"
                tabindex="0"
                @click="openTask(task.actionTo)"
                @keydown.enter.prevent="openTask(task.actionTo)"
                @keydown.space.prevent="openTask(task.actionTo)"
              >
                <td class="px-4 py-3.5 font-medium text-ink transition-colors group-hover:text-primary">
                  {{ task.name }}
                </td>
                <td class="px-4 py-3.5 text-muted">
                  {{ task.progress }}
                </td>
                <td class="px-4 py-3.5 text-muted">
                  {{ task.remaining }}
                </td>
                <td class="px-4 py-3.5">
                  <UBadge
                    :label="task.statusLabel"
                    :color="task.statusColor"
                    variant="subtle"
                  />
                </td>
                <td class="px-4 py-3.5 text-right">
                  <UButton
                    :label="task.actionLabel"
                    icon="i-lucide-arrow-right"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    class="group-hover:bg-primary/10"
                    :to="task.actionTo"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </div>
</template>
