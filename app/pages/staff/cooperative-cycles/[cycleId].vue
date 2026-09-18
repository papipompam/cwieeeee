<script setup lang="ts">
definePageMeta({
  layout: "dashboard"
})

type CooperativeCycleStatus = "OPEN_FOR_APPLICATION" | "APPLICATION_CLOSED" | "IN_PROGRESS" | "CLOSED"

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  applicationStartDate: string
  applicationEndDate: string
  internshipStartDate: string
  internshipEndDate: string
  status: CooperativeCycleStatus
  note: string | null
}

const route = useRoute()
const router = useRouter()
const cycleId = computed(() => Number(route.params.cycleId))

// Fetch current cycle
const { data: cycle, status: fetchStatus, error: fetchError } = await useFetch<CooperativeCycle>(() => `/api/cooperative-cycles/${cycleId.value}`)

// Fetch all cycles for switcher
const { data: allCycles } = await useFetch<CooperativeCycle[]>("/api/cooperative-cycles")

// Provide to child pages
provide("currentCycle", cycle)

const statusDisplayMap: Record<CooperativeCycleStatus, { label: string; color: "success" | "warning" | "info" | "neutral" }> = {
  OPEN_FOR_APPLICATION: { label: "เปิดรับคำร้อง", color: "success" },
  APPLICATION_CLOSED: { label: "ปิดรับคำร้อง", color: "warning" },
  IN_PROGRESS: { label: "กำลังฝึกงาน", color: "info" },
  CLOSED: { label: "ปิดรอบ", color: "neutral" }
}

const formatDateThai = (dateStr?: string) => {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })
}

// Cycle options for switcher
const cycleOptions = computed(() => {
  if (!allCycles.value) return []
  return allCycles.value.map(c => ({
    label: `ภาคเรียนที่ ${c.term}/${c.academicYear} (รุ่น ${c.cohortYear})`,
    value: c.id
  }))
})

const selectedCycleId = computed({
  get: () => cycleId.value,
  set: (newId: number) => {
    if (!newId || newId === cycleId.value) return
    const currentSubPath = route.path.replace(`/staff/cooperative-cycles/${cycleId.value}`, "")
    router.push(`/staff/cooperative-cycles/${newId}${currentSubPath}`)
  }
})

const moduleTitleMap: Record<string, string> = {
  '': 'ภาพรวมรอบ',
  applications: 'คำร้องนักศึกษา',
  placements: 'การจัดสถานประกอบการ',
  supervisors: 'อาจารย์นิเทศ',
  visits: 'ตารางนิเทศ',
  evaluations: 'การประเมิน',
  budgets: 'งบประมาณ',
  students: 'รายชื่อนักศึกษา'
}

const currentModuleTitle = computed(() => {
  const sub = route.path.replace(`/staff/cooperative-cycles/${cycleId.value}`, '').replace(/^\//, '').split('/')[0] || ''
  return moduleTitleMap[sub] || ''
})
</script>

<template>
  <UDashboardPanel id="staff-cycle-workspace">
    <!-- Top Navbar -->
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-2">
            <UDashboardSidebarCollapse />
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              to="/staff/cooperative-cycles"
              aria-label="กลับไปหน้ารายการรอบสหกิจ"
              title="กลับไปหน้ารายการรอบสหกิจ"
            />
            <div class="flex items-center gap-1.5 text-sm">
              <NuxtLink to="/staff/cooperative-cycles" class="text-muted hover:text-highlighted transition-colors">
                รอบสหกิจ
              </NuxtLink>
              <span class="text-xs text-muted">/</span>
              <NuxtLink
                v-if="cycle"
                :to="`/staff/cooperative-cycles/${cycle.id}`"
                class="font-medium text-highlighted hover:text-primary transition-colors truncate"
              >
                ภาคเรียนที่ {{ cycle.term }}/{{ cycle.academicYear }}
              </NuxtLink>
              <template v-if="currentModuleTitle && currentModuleTitle !== 'ภาพรวมรอบ'">
                <span class="text-xs text-muted">/</span>
                <span class="text-muted font-medium truncate">
                  {{ currentModuleTitle }}
                </span>
              </template>
            </div>
          </div>
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <!-- Cycle Switcher -->
            <USelect
              v-model="selectedCycleId"
              :items="cycleOptions"
              value-key="value"
              class="w-64 text-sm"
              icon="i-lucide-calendar-range"
              aria-label="เปลี่ยนรอบสหกิจ"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Error state -->
      <div v-if="fetchError" class="p-6">
        <UAlert
          color="error"
          icon="i-lucide-alert-circle"
          title="ไม่พบข้อมูลรอบสหกิจ"
          :description="fetchError.message"
        />
        <div class="mt-4">
          <UButton label="กลับไปหน้ารายการรอบสหกิจ" to="/staff/cooperative-cycles" />
        </div>
      </div>

      <div v-else-if="fetchStatus === 'pending'" class="py-16 text-center text-muted">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin mx-auto mb-2 text-primary" />
        <p>กำลังโหลดข้อมูลรอบสหกิจ...</p>
      </div>

      <div v-else-if="cycle" class="flex flex-col flex-1">
        <!-- Context Header Banner -->
        <div class="border-b border-default bg-muted/10 px-4 py-3 sm:px-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-calendar-range" class="size-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-lg font-bold text-highlighted">
                    ภาคเรียนที่ {{ cycle.term }}/{{ cycle.academicYear }} · นักศึกษารุ่น {{ cycle.cohortYear }}
                  </h1>
                  <UBadge
                    :label="statusDisplayMap[cycle.status]?.label || cycle.status"
                    :color="statusDisplayMap[cycle.status]?.color || 'neutral'"
                    variant="subtle"
                  />
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-0.5">
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-lucide-calendar" class="size-3.5" />
                    ช่วงรับคำร้อง: {{ formatDateThai(cycle.applicationStartDate) }} – {{ formatDateThai(cycle.applicationEndDate) }}
                  </span>
                  <span>•</span>
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-lucide-briefcase" class="size-3.5" />
                    ช่วงฝึกงาน: {{ formatDateThai(cycle.internshipStartDate) }} – {{ formatDateThai(cycle.internshipEndDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Closed cycle read-only alert -->
          <div v-if="cycle.status === 'CLOSED'" class="mt-3">
            <UAlert
              color="neutral"
              icon="i-lucide-lock"
              title="รอบสหกิจนี้ปิดรอบแล้ว"
              description="ข้อมูลในรอบนี้อยู่ในสถานะอ่านอย่างเดียว (Read-only) ไม่สามารถแก้ไขหรือเพิ่มข้อมูลใหม่ได้"
            />
          </div>
        </div>

        <!-- Nested Content Pages -->
        <div class="flex-1 p-4 sm:p-6">
          <NuxtPage />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
