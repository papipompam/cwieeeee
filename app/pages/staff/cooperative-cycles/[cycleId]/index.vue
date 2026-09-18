<script setup lang="ts">
import type { Ref } from "vue"

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  status: string
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>("currentCycle")

// Fetch students count matching this cohort
const { data: students } = await useFetch<any[]>("/api/students")
const cohortStudentsCount = computed(() => {
  if (!students.value || !cycle?.value) return 0
  return students.value.filter(s => s.cohortYear === cycle.value?.cohortYear).length
})

// Summary metrics
const summaryMetrics = computed(() => [
  {
    label: "นักศึกษารุ่นนี้",
    value: `${cohortStudentsCount.value} คน`,
    icon: "i-lucide-graduation-cap",
    color: "primary"
  },
  {
    label: "คำร้องรอตรวจสอบ",
    value: "0 รายการ",
    icon: "i-lucide-file-check-2",
    color: "warning"
  },
  {
    label: "รอจัดอาจารย์นิเทศ",
    value: "0 คน",
    icon: "i-lucide-users-round",
    color: "neutral"
  },
  {
    label: "การนิเทศรอกำหนดวัน",
    value: "0 ครั้ง",
    icon: "i-lucide-calendar-days",
    color: "neutral"
  },
  {
    label: "แบบประเมินคงค้าง",
    value: "0 ฉบับ",
    icon: "i-lucide-clipboard-check",
    color: "neutral"
  },
  {
    label: "งบประมาณรอจัดสรร",
    value: "0 รายการ",
    icon: "i-lucide-wallet-cards",
    color: "neutral"
  }
])

// Actionable tasks checklist
const tasks = computed(() => [
  {
    name: "ตรวจสอบคำร้องนักศึกษา",
    progress: `0/${cohortStudentsCount.value || 0}`,
    remaining: `${cohortStudentsCount.value || 0} คน`,
    statusLabel: "เตรียมเปิดรับ",
    statusColor: "info" as const,
    actionLabel: "ดูคำร้อง",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/applications`
  },
  {
    name: "จัดสถานประกอบการและผู้รับหนังสือ",
    progress: "0/0",
    remaining: "0 แห่ง",
    statusLabel: "ยังไม่เริ่ม",
    statusColor: "neutral" as const,
    actionLabel: "จัดสถานประกอบการ",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/placements`
  },
  {
    name: "จัดอาจารย์นิเทศประจำกลุ่ม",
    progress: "0/0",
    remaining: "0 คน",
    statusLabel: "ยังไม่เริ่ม",
    statusColor: "neutral" as const,
    actionLabel: "จัดกลุ่มอาจารย์",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/supervisors`
  },
  {
    name: "กำหนดการนิเทศและตารางตรวจเยี่ยม",
    progress: "0/0",
    remaining: "0 ครั้ง",
    statusLabel: "ยังไม่เริ่ม",
    statusColor: "neutral" as const,
    actionLabel: "จัดตารางนิเทศ",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/visits`
  },
  {
    name: "ติดตามการประเมิน (นักศึกษา/สถานประกอบการ)",
    progress: "0/0",
    remaining: "0 ฉบับ",
    statusLabel: "ยังไม่เริ่ม",
    statusColor: "neutral" as const,
    actionLabel: "ดูการประเมิน",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/evaluations`
  },
  {
    name: "จัดสรรงบประมาณนิเทศ",
    progress: "0/0",
    remaining: "0 รายการ",
    statusLabel: "ยังไม่เริ่ม",
    statusColor: "neutral" as const,
    actionLabel: "จัดการงบประมาณ",
    actionTo: `/staff/cooperative-cycles/${cycleId.value}/budgets`
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Section 1: Summary Cards Grid -->
    <div>
      <h2 class="text-sm font-semibold text-highlighted mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-layout-grid" class="size-4 text-primary" />
        สรุปภาพรวมรอบสหกิจ
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          v-for="(item, idx) in summaryMetrics"
          :key="idx"
          class="rounded-lg border border-default p-3.5 bg-default shadow-xs flex flex-col justify-between"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-muted leading-snug">{{ item.label }}</span>
            <div class="p-1 rounded-md bg-muted/20 text-muted">
              <UIcon :name="item.icon" class="size-4 text-primary" />
            </div>
          </div>
          <div class="text-lg font-bold text-highlighted">
            {{ item.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Actionable Tasks Checklist Table -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-list-checks" class="size-4 text-primary" />
          ตารางงานที่ต้องดำเนินการในรอบนี้
        </h2>
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
              <td class="px-4 py-3.5  text-muted">
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
