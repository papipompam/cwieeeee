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
      label: 'นักศึกษารุ่นนี้',
      value: `${s?.cohortStudentsCount ?? 0} คน`,
      icon: 'i-lucide-graduation-cap',
      color: 'primary',
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
      label: 'เอกสารรอตรวจสอบ',
      value: `${s?.pendingReviewRequestsCount ?? 0} ฉบับ`,
      icon: 'i-lucide-file-check-2',
      color: (s?.pendingReviewRequestsCount ?? 0) > 0 ? 'warning' : 'neutral',
      to: `/staff/cooperative-cycles/${cycleId.value}/applications?status=DOCUMENT_UNDER_REVIEW`
    },
    {
      label: 'หนังสือพร้อมแล้ว',
      value: `${s?.letterReadyRequestsCount ?? 0} ฉบับ`,
      icon: 'i-lucide-stamp',
      color: 'info',
      to: `/staff/cooperative-cycles/${cycleId.value}/applications?status=LETTER_READY`
    },
    {
      label: 'ยืนยันสถานที่แล้ว',
      value: `${s?.confirmedPlacementsCount ?? 0} แห่ง`,
      icon: 'i-lucide-building-2',
      color: (s?.confirmedPlacementsCount ?? 0) > 0 ? 'success' : 'neutral',
      to: `/staff/cooperative-cycles/${cycleId.value}/placements`
    },
    {
      label: 'ส่งกลับแก้ไข',
      value: `${s?.returnedRequestsCount ?? 0} รายการ`,
      icon: 'i-lucide-undo-2',
      color: (s?.returnedRequestsCount ?? 0) > 0 ? 'error' : 'neutral',
      to: `/staff/cooperative-cycles/${cycleId.value}/applications?status=RETURNED_FOR_REVISION`
    }
  ]
})

// Actionable tasks checklist
const tasks = computed(() => {
  const s = summary.value
  const totalRequests = (s?.submittedRequestsCount ?? 0) + (s?.letterReadyRequestsCount ?? 0) + (s?.pendingReviewRequestsCount ?? 0) + (s?.confirmedPlacementsCount ?? 0)
  const processedLetters = (s?.letterReadyRequestsCount ?? 0) + (s?.pendingReviewRequestsCount ?? 0) + (s?.confirmedPlacementsCount ?? 0)

  return [
    {
      name: 'ตรวจสอบคำร้องและออกหนังสือขอความอนุเคราะห์',
      progress: `${processedLetters}/${totalRequests}`,
      remaining: `${s?.submittedRequestsCount ?? 0} รายการ`,
      statusLabel: (s?.submittedRequestsCount ?? 0) > 0 ? 'รอดำเนินการ' : 'เรียบร้อย',
      statusColor: (s?.submittedRequestsCount ?? 0) > 0 ? 'warning' as const : 'success' as const,
      actionLabel: 'ดูคำร้อง',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/applications`
    },
    {
      name: 'ตรวจสอบเอกสารตอบรับจากสถานประกอบการ',
      progress: `${s?.confirmedPlacementsCount ?? 0}/${(s?.pendingReviewRequestsCount ?? 0) + (s?.confirmedPlacementsCount ?? 0)}`,
      remaining: `${s?.pendingReviewRequestsCount ?? 0} ฉบับ`,
      statusLabel: (s?.pendingReviewRequestsCount ?? 0) > 0 ? 'รอตรวจ' : 'เรียบร้อย',
      statusColor: (s?.pendingReviewRequestsCount ?? 0) > 0 ? 'warning' as const : 'neutral' as const,
      actionLabel: 'ตรวจเอกสาร',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/applications?status=DOCUMENT_UNDER_REVIEW`
    },
    {
      name: 'สถานที่ฝึกงานที่ยืนยันแล้ว',
      progress: `${s?.confirmedPlacementsCount ?? 0}/${s?.studentsWithApplicationCount ?? 0}`,
      remaining: `${s?.confirmedPlacementsCount ?? 0} แห่ง`,
      statusLabel: (s?.confirmedPlacementsCount ?? 0) > 0 ? 'ยืนยันแล้ว' : 'ยังไม่เริ่ม',
      statusColor: (s?.confirmedPlacementsCount ?? 0) > 0 ? 'success' as const : 'neutral' as const,
      actionLabel: 'ดูสถานที่ฝึกงาน',
      actionTo: `/staff/cooperative-cycles/${cycleId.value}/placements`
    },
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
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
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

    <!-- Section 1: Summary Cards Grid -->
    <div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <NuxtLink
          v-for="(item, idx) in summaryMetrics"
          :key="idx"
          :to="item.to"
          class="rounded-lg border border-default p-3.5 bg-default shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-muted leading-snug group-hover:text-highlighted transition-colors">{{ item.label }}</span>
            <div class="p-1 rounded-md bg-muted/20 text-muted group-hover:text-primary transition-colors">
              <UIcon :name="item.icon" class="size-4" />
            </div>
          </div>
          <div class="text-lg font-bold text-highlighted">
            {{ item.value }}
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Section 2: Actionable Tasks Checklist Table -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-list-checks" class="size-4 text-primary" />
          ตารางงานที่ต้องดำเนินการในรอบนี้
        </h3>
        <span class="text-xs text-muted">ติดตามความคืบหน้ากระบวนการสหกิจศึกษา</span>
      </div>

      <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
        <table class="min-w-full divide-y divide-default text-sm text-left">
          <thead class="bg-muted/30 text-xs font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th scope="col" class="px-4 py-3">งานที่ต้องดำเนินการ</th>
              <th scope="col" class="px-4 py-3">ความคืบหน้า</th>
              <th scope="col" class="px-4 py-3">คงเหลือ</th>
              <th scope="col" class="px-4 py-3">สถานะ</th>
              <th scope="col" class="px-4 py-3 text-right">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(task, idx) in tasks"
              :key="idx"
              class="hover:bg-muted/10 transition-colors"
            >
              <td class="px-4 py-3.5 font-medium text-highlighted">
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
                  :to="task.actionTo"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
