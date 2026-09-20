<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface StudentContextResponse {
  student: { studentId: string; name: string; cohortYear: number | null; classGroup: number | null; isActive: boolean }
  cycle: { term: number; academicYear: number; applicationStartDate: string; applicationEndDate: string; internshipStartDate: string; internshipEndDate: string } | null
  canApply: boolean
  reason: string | null
  activeApplication: { id: number; status: string; appliedAt: string; applicationPosition: string | null; company: { name: string; province: string } } | null
  latestRequest: { id: number; status: string; companyName: string; position: string | null; confirmedAt: string } | null
  placement: { requestId: number; companyName: string; position: string | null; province: string | null } | null
  upcomingVisit: { id: number; visitDate: string; companyName: string } | null
  nextAction: { label: string; to: string } | null
}

const { data: context, status, error, refresh } = await useFetch<StudentContextResponse>('/api/student/context')

const formatThaiDate = (value?: string | null) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

const statusMeta = computed(() => {
  if (!context.value) return { label: 'กำลังโหลดสถานะ', color: 'neutral' as const }
  if (context.value.placement) return { label: 'ยืนยันสถานที่ฝึกงาน', color: 'success' as const }

  switch (context.value.latestRequest?.status || context.value.activeApplication?.status) {
    case 'PLACEMENT_CONFIRMED':
    case 'CONFIRMED':
    case 'ACCEPTED':
      return { label: 'ยืนยันสถานที่ฝึกงาน', color: 'success' as const }
    case 'RETURNED_FOR_REVISION':
    case 'REJECTED':
      return { label: 'ต้องดำเนินการแก้ไข', color: 'error' as const }
    case 'STAFF_PROCESSING':
    case 'AWAITING_RESPONSE':
      return { label: 'อยู่ระหว่างดำเนินการ', color: 'warning' as const }
    default:
      return context.value.canApply
        ? { label: 'พร้อมยื่นสมัคร', color: 'primary' as const }
        : { label: context.value.reason || 'ยังไม่มีรายการดำเนินการ', color: 'neutral' as const }
  }
})

const currentStep = computed(() => {
  if (context.value?.placement || context.value?.latestRequest?.status === 'PLACEMENT_CONFIRMED') return 3

  switch (context.value?.latestRequest?.status) {
    case 'DOCUMENT_UNDER_REVIEW':
    case 'RETURNED_FOR_REVISION':
      return 2
    case 'LETTER_READY':
      return 1
    case 'SUBMITTED':
    case 'STAFF_PROCESSING':
      return 0
    default:
      return context.value?.activeApplication ? 0 : 0
  }
})

const currentCompany = computed(() =>
  context.value?.placement?.companyName
  || context.value?.latestRequest?.companyName
  || context.value?.activeApplication?.company.name
  || 'ยังไม่ได้เลือกสถานประกอบการ'
)

const referenceCode = computed(() => {
  if (context.value?.latestRequest) return `REQ-${String(context.value.latestRequest.id).padStart(4, '0')}`
  if (context.value?.activeApplication) return `APP-${String(context.value.activeApplication.id).padStart(4, '0')}`
  return context.value?.student.studentId || '—'
})

const workflowSteps = [
  'ยื่นคำร้องขอเอกสารขอความอนุเคราะห์ฝึกงาน',
  'ยื่นเอกสารขอความอนุเคราะห์ให้สถานประกอบการ',
  'ส่งหนังสือตอบรับให้เจ้าหน้าที่',
  'ยืนยันสถานที่ฝึกงาน'
]

const actionCards = computed(() => [
  { title: 'เปิดคำร้องและติดตามการสมัคร', description: 'ดูสถานะและขั้นตอนถัดไปของการสมัคร', icon: 'i-lucide-clipboard-list', to: '/student/applications', primary: true },
  { title: 'ดูตารางนิเทศ', description: 'ตรวจวัน เวลา และอาจารย์นิเทศ', icon: 'i-lucide-calendar-days', to: '/student/visits', primary: false }
])
</script>

<template>
  <UDashboardPanel id="student-overview-page">
    <template #header>
      <AppDashboardNavbar>
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #title>
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-xs font-normal text-muted">CWIE BRU / หน้าหลัก</span>
            <span class="truncate text-lg font-bold text-highlighted">หน้าหลัก</span>
          </div>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
            <AppNotificationBell />
          </div>
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <main class="mx-auto w-full max-w-7xl space-y-7 pb-12">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดข้อมูลหน้าหลักได้"
          :description="error.message"
          :actions="[{ label: 'ลองอีกครั้ง', color: 'error', variant: 'subtle', onClick: () => refresh() }]"
        />

        <div v-else-if="status === 'pending'" class="space-y-6">
          <USkeleton class="h-12 w-48 rounded-lg" />
          <USkeleton class="h-64 rounded-panel" />
          <div class="grid gap-3 md:grid-cols-3"><USkeleton v-for="item in 3" :key="item" class="h-24 rounded-panel" /></div>
        </div>

        <template v-else-if="context">
          <section>
            <p class="text-xs text-muted">รอบที่กำลังแสดง</p>
            <h2 class="mt-1 text-base font-bold text-highlighted">
              {{ context.cycle ? `ภาคเรียนที่ ${context.cycle.term}/${context.cycle.academicYear}` : 'ยังไม่มีรอบสหกิจศึกษาปัจจุบัน' }}
            </h2>
          </section>

          <UCard :ui="{ root: 'rounded-panel shadow-panel', body: 'p-5 sm:p-6' }">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
                  <UIcon name="i-lucide-file-check-2" class="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 class="font-semibold text-highlighted">สถานะการดำเนินการ</h3>
                  <p class="mt-1 text-sm text-muted">
                    <template v-if="context.activeApplication || context.latestRequest">{{ referenceCode }}<template v-if="currentCompany"> · {{ currentCompany }}</template></template>
                    <template v-else>ยังไม่มีคำร้องในรอบนี้</template>
                  </p>
                </div>
              </div>
              <UBadge :color="statusMeta.color" variant="subtle" size="md">{{ statusMeta.label }}</UBadge>
            </div>

            <dl v-if="context.cycle" class="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[8rem_minmax(12rem,auto)] xl:grid-cols-[8rem_12rem_minmax(15rem,1fr)_minmax(15rem,1fr)]">
              <div><dt class="text-xs text-muted">ปีการศึกษา</dt><dd class="mt-1 font-semibold text-highlighted">{{ context.cycle.academicYear }}</dd></div>
              <div><dt class="text-xs text-muted">ภาคเรียน / รุ่น</dt><dd class="mt-1 text-highlighted">ภาคเรียน {{ context.cycle.term }} · รุ่น {{ context.student.cohortYear || '—' }}</dd></div>
              <div><dt class="text-xs text-muted">ช่วงส่งข้อมูลสถานประกอบการ</dt><dd class="mt-1 text-highlighted">{{ formatThaiDate(context.cycle.applicationStartDate) }} – {{ formatThaiDate(context.cycle.applicationEndDate) }}</dd></div>
              <div><dt class="text-xs text-muted">ช่วงฝึกงาน</dt><dd class="mt-1 text-highlighted">{{ formatThaiDate(context.cycle.internshipStartDate) }} – {{ formatThaiDate(context.cycle.internshipEndDate) }}</dd></div>
            </dl>

            <div class="mt-6 overflow-x-auto pb-1">
              <ol class="grid min-w-[52rem] grid-cols-4" aria-label="ลำดับสถานะการดำเนินการ">
                <li
                  v-for="(step, index) in workflowSteps"
                  :key="step"
                  class="relative flex flex-col items-center px-2 text-center"
                  :aria-current="index === currentStep ? 'step' : undefined"
                >
                  <span
                    v-if="index < workflowSteps.length - 1"
                    class="absolute left-1/2 top-3 h-0.5 w-full"
                    :class="index < currentStep ? 'bg-primary' : 'bg-divider'"
                    aria-hidden="true"
                  />
                  <span
                    class="relative z-10 grid size-6 place-items-center rounded-full border-2 bg-default"
                    :class="index <= currentStep ? 'border-primary bg-primary text-ink' : 'border-divider text-transparent'"
                    aria-hidden="true"
                  >
                    <UIcon v-if="index < currentStep" name="i-lucide-check" class="size-3.5" />
                    <span v-else-if="index === currentStep" class="size-2 rounded-full bg-ink" />
                  </span>
                  <span class="mt-3 text-xs font-medium leading-5" :class="index <= currentStep ? 'text-highlighted' : 'text-muted'">{{ step }}</span>
                </li>
              </ol>
            </div>
          </UCard>

          <section>
            <h2 class="text-lg font-bold text-highlighted">ดำเนินการต่อ</h2>
            <p class="mt-1 text-sm text-muted">เปิดงานสำคัญได้ทันทีโดยไม่ต้องค้นหาในเมนู</p>
            <div class="mt-3 grid gap-3 md:grid-cols-3">
              <NuxtLink
                v-for="card in actionCards"
                :key="card.title"
                :to="card.to"
                class="group flex min-h-24 items-center gap-3 rounded-panel border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                :class="card.primary ? 'border-primary bg-warning-soft hover:bg-primary/15' : 'border-default bg-default hover:bg-elevated'"
              >
                <div class="grid size-10 shrink-0 place-items-center rounded-control" :class="card.primary ? 'bg-primary text-ink' : 'bg-elevated text-muted'"><UIcon :name="card.icon" class="size-5" /></div>
                <div class="min-w-0 flex-1"><h3 class="font-bold text-highlighted">{{ card.title }}</h3><p class="mt-0.5 text-xs text-muted">{{ card.description }}</p></div>
                <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </NuxtLink>
            </div>
          </section>
        </template>
      </main>
    </template>
  </UDashboardPanel>
</template>
