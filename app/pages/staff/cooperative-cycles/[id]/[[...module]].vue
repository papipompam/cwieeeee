<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

type CooperativeCycle = {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  internshipStartDate: string
  internshipEndDate: string
  status: 'OPEN_FOR_APPLICATION' | 'APPLICATION_CLOSED' | 'IN_PROGRESS' | 'CLOSED'
}

const route = useRoute()
const cycleId = computed(() => String(route.params.id))
const moduleKey = computed(() => {
  const value = route.params.module
  return Array.isArray(value) ? value[0] : value
})
const moduleTitles: Record<string, string> = {
  applications: 'คำร้อง',
  placements: 'สถานประกอบการ',
  supervisors: 'อาจารย์นิเทศ',
  visits: 'ตารางนิเทศ',
  evaluations: 'การประเมิน',
  budgets: 'งบประมาณ',
  documents: 'เอกสาร'
}
const statusLabels: Record<CooperativeCycle['status'], string> = {
  OPEN_FOR_APPLICATION: 'เปิดรับคำร้อง',
  APPLICATION_CLOSED: 'ปิดรับคำร้อง',
  IN_PROGRESS: 'กำลังฝึกงาน',
  CLOSED: 'ปิดรอบ'
}
const { data: cycle, status, error, refresh } = await useFetch<CooperativeCycle>(() => `/api/cooperative-cycles/${cycleId.value}`)
const workspacePath = (module = '') => `/staff/cooperative-cycles/${cycleId.value}${module ? `/${module}` : ''}`
const items = computed<NavigationMenuItem[]>(() => [
  { label: 'ภาพรวม', icon: 'i-lucide-layout-dashboard', to: workspacePath() },
  { label: 'คำร้อง', icon: 'i-lucide-file-check-2', to: workspacePath('applications') },
  { label: 'สถานประกอบการ', icon: 'i-lucide-building-2', to: workspacePath('placements') },
  { label: 'อาจารย์นิเทศ', icon: 'i-lucide-users-round', to: workspacePath('supervisors') },
  { label: 'ตารางนิเทศ', icon: 'i-lucide-calendar-days', to: workspacePath('visits') },
  { label: 'การประเมิน', icon: 'i-lucide-clipboard-check', to: workspacePath('evaluations') },
  { label: 'งบประมาณ', icon: 'i-lucide-wallet-cards', to: workspacePath('budgets') },
  { label: 'เอกสาร', icon: 'i-lucide-files', to: workspacePath('documents') }
])
const title = computed(() => moduleKey.value ? moduleTitles[moduleKey.value] || 'รอบสหกิจ' : 'ภาพรวมรอบสหกิจ')
</script>

<template>
  <UDashboardPanel id="cooperative-cycle-workspace">
    <template #header>
      <UDashboardNavbar :title="title" icon="i-lucide-calendar-range">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="กลับไปรายการรอบ" icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/staff/cooperative-cycles" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 p-4 sm:p-6">
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          title="ไม่สามารถเปิดรอบสหกิจได้"
          :description="error.message"
          :actions="[{ label: 'ลองใหม่', onClick: () => refresh() }]"
        />

        <template v-else-if="cycle">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-lg font-semibold text-highlighted">{{ cycle.term }}/{{ cycle.academicYear }} · รุ่น {{ cycle.cohortYear }}</p>
              <p class="text-sm text-muted">{{ new Date(cycle.internshipStartDate).toLocaleDateString('th-TH') }} – {{ new Date(cycle.internshipEndDate).toLocaleDateString('th-TH') }}</p>
            </div>
            <UBadge :label="statusLabels[cycle.status]" :color="cycle.status === 'CLOSED' ? 'neutral' : 'primary'" variant="subtle" />
          </div>

          <UNavigationMenu :items="items" orientation="horizontal" class="overflow-x-auto" />

          <UAlert
            v-if="cycle.status === 'CLOSED'"
            color="warning"
            icon="i-lucide-lock"
            title="รอบนี้ปิดแล้ว"
            description="ข้อมูลในรอบนี้เป็นแบบอ่านอย่างเดียว"
          />

          <UCard v-if="!moduleKey">
            <div class="space-y-2">
              <h2 class="font-semibold text-highlighted">ภาพรวมการดำเนินงาน</h2>
              <p class="text-sm text-muted">เลือกโมดูลด้านบนเพื่อทำงานภายในรอบสหกิจ {{ cycle.term }}/{{ cycle.academicYear }}</p>
            </div>
          </UCard>

          <UAlert
            v-else
            color="info"
            icon="i-lucide-info"
            :title="`${title} ของรอบ ${cycle.term}/${cycle.academicYear}`"
            description="โครงสร้างและ context ของรอบพร้อมแล้ว ส่วนการจัดการข้อมูลของโมดูลนี้จะเพิ่มเป็น vertical slice เมื่อเริ่ม feature นั้น"
          />
        </template>

        <div v-else-if="status === 'pending'" class="py-12 text-center text-muted">กำลังโหลดข้อมูลรอบสหกิจ…</div>
      </div>
    </template>
  </UDashboardPanel>
</template>
