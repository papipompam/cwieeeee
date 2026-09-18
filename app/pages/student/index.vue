<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface StudentContextResponse {
  student: {
    id: number
    studentId: string
    name: string
    cohortYear: number | null
    classGroup: number | null
    phone: string | null
    isActive: boolean
  }
  cycle: {
    id: number
    term: number
    academicYear: number
    cohortYear: number
    status: string
    applicationStartDate: string
    applicationEndDate: string
    internshipStartDate: string
    internshipEndDate: string
    note: string | null
  } | null
  canApply: boolean
  reason: string | null
  activeApplication: {
    id: number
    status: string
    appliedAt: string
    applicationPosition: string | null
    company: { id: number; name: string; province: string }
    cooperativeRequest?: { id: number; status: string; companyName: string; position: string | null } | null
  } | null
  latestRequest: {
    id: number
    status: string
    companyName: string
    position: string | null
    confirmedAt: string
  } | null
  placement: {
    requestId: number
    companyName: string
    internshipLocationName: string | null
    position: string | null
    address: string | null
    province: string | null
    confirmedAt: string
  } | null
  upcomingVisit: {
    id: number
    visitNo: number
    visitDate: string
    period: string
    companyName: string
    supervisorName: string | null
  } | null
  unreadNotificationsCount: number
  recentNotifications: Array<{
    id: number
    title: string
    message: string
    link: string | null
    isRead: boolean
    createdAt: string
  }>
  nextAction: {
    type: string
    label: string
    to: string
  } | null
}

const { data: context, status, error, refresh } = await useFetch<StudentContextResponse>('/api/student/context')

const formatThaiDate = (value?: string | null) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value))
}

const getAppStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งข้อมูลการสมัครแล้ว', color: 'info' as const }
    case 'AWAITING_RESPONSE':
      return { label: 'รอผลตอบกลับ', color: 'warning' as const }
    case 'INTERVIEW':
      return { label: 'รอสัมภาษณ์', color: 'info' as const }
    case 'ACCEPTED':
      return { label: 'บริษัทตอบรับแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'บริษัทปฏิเสธ', color: 'error' as const }
    case 'WITHDRAWN':
      return { label: 'ยกเลิกการสมัคร', color: 'neutral' as const }
    case 'CONFIRMED':
      return { label: 'ยืนยันและส่งคำร้องแล้ว', color: 'success' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const getReqStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งคำร้องแล้ว', color: 'info' as const }
    case 'STAFF_PROCESSING':
      return { label: 'รอเจ้าหน้าที่ดำเนินการ', color: 'warning' as const }
    case 'LETTER_READY':
      return { label: 'มีหนังสือพร้อมดาวน์โหลด', color: 'primary' as const }
    case 'DOCUMENT_UNDER_REVIEW':
      return { label: 'รอตรวจสอบเอกสาร', color: 'warning' as const }
    case 'RETURNED_FOR_REVISION':
      return { label: 'ถูกส่งกลับให้แก้ไข', color: 'error' as const }
    case 'PLACEMENT_CONFIRMED':
      return { label: 'ยืนยันสถานที่ฝึกงานแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'ไม่ผ่านการยืนยัน', color: 'error' as const }
    case 'CANCELLED':
      return { label: 'ยกเลิกคำร้อง', color: 'neutral' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

const currentStep = computed(() => {
  if (!context.value?.cycle) return 1
  if (context.value.placement) return 5
  if (context.value.latestRequest) return 3
  if (context.value.activeApplication) return 2
  return 1
})

const workflowSteps = computed(() => {
  const cycle = context.value?.cycle
  return [
    {
      value: 1,
      title: 'ยื่นสมัคร',
      description: cycle ? `${formatThaiDate(cycle.applicationStartDate)} – ${formatThaiDate(cycle.applicationEndDate)}` : 'รอรอบสหกิจเปิดรับ',
      icon: 'i-lucide-send'
    },
    { value: 2, title: 'รอผลบริษัท', description: 'ติดตามผลการสมัคร', icon: 'i-lucide-clock-3' },
    { value: 3, title: 'ส่งคำร้อง', description: 'หนังสือและเอกสารตอบรับ', icon: 'i-lucide-file-check-2' },
    { value: 4, title: 'ยืนยันสถานที่', description: 'เจ้าหน้าที่ตรวจสอบเรียบร้อย', icon: 'i-lucide-badge-check' },
    {
      value: 5,
      title: 'ฝึกงานและนิเทศ',
      description: cycle ? `${formatThaiDate(cycle.internshipStartDate)} – ${formatThaiDate(cycle.internshipEndDate)}` : 'ตามกำหนดการนิเทศ',
      icon: 'i-lucide-briefcase-business'
    }
  ]
})

const personalStatus = computed(() => {
  if (!context.value) return { label: 'กำลังโหลดสถานะ', color: 'neutral' as const }
  if (context.value.placement) return { label: 'ยืนยันสถานที่ฝึกงานแล้ว', color: 'success' as const }
  if (context.value.latestRequest) return getReqStatusBadge(context.value.latestRequest.status)
  if (context.value.activeApplication) return getAppStatusBadge(context.value.activeApplication.status)
  if (context.value.canApply) return { label: 'พร้อมยื่นสมัครสถานประกอบการ', color: 'primary' as const }
  return { label: context.value.reason || 'ยังไม่มีรายการดำเนินการ', color: 'neutral' as const }
})
</script>

<template>
  <UDashboardPanel id="student-overview-page">
    <template #header>
      <UDashboardNavbar title="ภาพรวมสหกิจศึกษา">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AppNotificationBell />
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          <UButton
            v-if="context?.canApply"
            color="primary"
            icon="i-lucide-plus"
            label="ยื่นสมัครสถานประกอบการ"
            to="/student/applications/new"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6 pb-12">
        <!-- Error Alert -->
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดข้อมูลภาพรวมได้"
          :description="error.message"
          :actions="[{ label: 'ลองอีกครั้ง', color: 'error', variant: 'subtle', onClick: () => refresh() }]"
        />

        <!-- Loading Skeletons -->
        <div v-else-if="status === 'pending'" class="grid gap-4 md:grid-cols-2">
          <USkeleton class="h-40 rounded-lg" />
          <USkeleton class="h-40 rounded-lg" />
          <USkeleton class="h-40 rounded-lg md:col-span-2" />
        </div>

        <template v-else-if="context">
          <section class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="font-semibold text-highlighted">สถานะสหกิจศึกษาของฉัน</h2>
                <p v-if="context.cycle" class="mt-0.5 text-xs text-muted">
                  ภาคเรียนที่ {{ context.cycle.term }}/{{ context.cycle.academicYear }}
                </p>
              </div>
              <UBadge :color="personalStatus.color" variant="subtle" size="sm">
                {{ personalStatus.label }}
              </UBadge>
            </div>

            <UStepper
              :items="workflowSteps"
              :model-value="currentStep"
              :disabled="true"
              class="overflow-x-auto pb-1"
            />

            <p v-if="context.upcomingVisit" class="flex items-center gap-1.5 text-xs text-muted">
              <UIcon name="i-lucide-calendar-days" class="size-4 text-primary" />
              นิเทศครั้งถัดไป {{ formatThaiDate(context.upcomingVisit.visitDate) }} · {{ context.upcomingVisit.companyName }}
            </p>
          </section>

          <!-- Profile & Current Cycle Top Banner -->
          <div class="grid gap-4 md:grid-cols-3">
            <!-- Student Profile Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <UIcon name="i-lucide-user" class="size-5" />
                </div>
                <div>
                  <h2 class="font-semibold text-highlighted leading-snug">{{ context.student.name }}</h2>
                  <p class="text-xs text-muted">รหัสนักศึกษา: {{ context.student.studentId }}</p>
                </div>
              </div>
              <div class="pt-2 border-t border-default/60 flex items-center justify-between text-xs text-muted">
                <span>รุ่น {{ context.student.cohortYear || '—' }} (หมู่ {{ context.student.classGroup || '—' }})</span>
                <UBadge :color="context.student.isActive ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ context.student.isActive ? 'ปกติ' : 'ระงับ' }}
                </UBadge>
              </div>
            </div>

            <!-- Current Cycle Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-2 md:col-span-2 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">รอบสหกิจศึกษาปัจจุบัน</span>
                  <UBadge v-if="context.cycle" color="primary" variant="subtle" size="sm">
                    ภาคเรียนที่ {{ context.cycle.term }}/{{ context.cycle.academicYear }}
                  </UBadge>
                  <UBadge v-else color="neutral" variant="subtle" size="sm">ยังไม่มีรอบเปิดรับ</UBadge>
                </div>
                <div v-if="context.cycle" class="mt-2 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="text-muted block">ช่วงรับสมัคร</span>
                    <span class="font-medium text-highlighted">{{ formatThaiDate(context.cycle.applicationStartDate) }} - {{ formatThaiDate(context.cycle.applicationEndDate) }}</span>
                  </div>
                  <div>
                    <span class="text-muted block">ช่วงปฏิบัติงาน</span>
                    <span class="font-medium text-highlighted">{{ formatThaiDate(context.cycle.internshipStartDate) }} - {{ formatThaiDate(context.cycle.internshipEndDate) }}</span>
                  </div>
                </div>
                <p v-else class="text-xs text-muted mt-2">
                  {{ context.reason || 'ยังไม่มีรอบสหกิจศึกษาที่เปิดรับสมัครสำหรับรุ่นของท่าน' }}
                </p>
              </div>

              <div v-if="context.reason && context.cycle" class="text-xs text-muted bg-muted/20 px-3 py-1.5 rounded-md mt-2">
                {{ context.reason }}
              </div>
            </div>
          </div>

          <!-- Next Action (Hero Card) -->
          <div v-if="context.nextAction" class="rounded-xl border-2 border-primary/40 bg-primary/5 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-wider text-primary">งานถัดไปที่ต้องดำเนินการ</span>
              <h3 class="text-base font-semibold text-highlighted">{{ context.nextAction.label }}</h3>
            </div>
            <UButton
              color="primary"
              size="lg"
              icon="i-lucide-arrow-right"
              trailing
              :label="context.nextAction.label"
              :to="context.nextAction.to"
            />
          </div>

          <!-- Status Cards Grid -->
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Active Application Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase-business" class="size-5 text-primary" />
                  <h3 class="font-semibold text-highlighted">การสมัครสถานประกอบการ</h3>
                </div>
                <NuxtLink to="/student/applications" class="text-xs text-primary hover:underline flex items-center gap-1">
                  ดูประวัติทั้งหมด <UIcon name="i-lucide-chevron-right" class="size-3" />
                </NuxtLink>
              </div>

              <div v-if="context.activeApplication" class="space-y-3 pt-2">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="font-medium text-highlighted text-sm">{{ context.activeApplication.company.name }}</h4>
                    <p class="text-xs text-muted">จ.{{ context.activeApplication.company.province }} • ตำแหน่ง: {{ context.activeApplication.applicationPosition || '—' }}</p>
                  </div>
                  <UBadge
                    :color="getAppStatusBadge(context.activeApplication.status).color"
                    variant="subtle"
                    size="sm"
                  >
                    {{ getAppStatusBadge(context.activeApplication.status).label }}
                  </UBadge>
                </div>
                <div class="flex items-center justify-between text-xs text-muted pt-2 border-t border-default/60">
                  <span>วันที่ยื่นสมัคร: {{ formatThaiDate(context.activeApplication.appliedAt) }}</span>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    label="ดูรายละเอียด"
                    :to="`/student/applications/${context.activeApplication.id}`"
                  />
                </div>
              </div>
              <div v-else class="text-center py-6 text-xs text-muted space-y-2">
                <UIcon name="i-lucide-inbox" class="size-8 text-muted mx-auto opacity-50" />
                <p>ยังไม่มีรายการสมัครที่กำลังดำเนินการ</p>
                <UButton
                  v-if="context.canApply"
                  size="xs"
                  color="primary"
                  label="เริ่มยื่นสมัคร"
                  to="/student/applications/new"
                />
              </div>
            </div>

            <!-- Latest Request Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-file-text" class="size-5 text-primary" />
                  <h3 class="font-semibold text-highlighted">คำร้องสถานที่ฝึกงาน</h3>
                </div>
                <NuxtLink to="/student/requests" class="text-xs text-primary hover:underline flex items-center gap-1">
                  ดูคำร้องทั้งหมด <UIcon name="i-lucide-chevron-right" class="size-3" />
                </NuxtLink>
              </div>

              <div v-if="context.latestRequest" class="space-y-3 pt-2">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="font-medium text-highlighted text-sm">{{ context.latestRequest.companyName }}</h4>
                    <p class="text-xs text-muted">ตำแหน่ง: {{ context.latestRequest.position || '—' }}</p>
                  </div>
                  <UBadge
                    :color="getReqStatusBadge(context.latestRequest.status).color"
                    variant="subtle"
                    size="sm"
                  >
                    {{ getReqStatusBadge(context.latestRequest.status).label }}
                  </UBadge>
                </div>
                <div class="flex items-center justify-between text-xs text-muted pt-2 border-t border-default/60">
                  <span>ยืนยันเมื่อ: {{ formatThaiDate(context.latestRequest.confirmedAt) }}</span>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    label="ดูคำร้อง"
                    :to="`/student/requests/${context.latestRequest.id}`"
                  />
                </div>
              </div>
              <div v-else class="text-center py-6 text-xs text-muted space-y-1">
                <UIcon name="i-lucide-file-clock" class="size-8 text-muted mx-auto opacity-50" />
                <p>ยังไม่มีคำร้องสถานที่ฝึกงาน</p>
              </div>
            </div>
          </div>

          <!-- Placement & Visits Section (if confirmed) -->
          <div v-if="context.placement" class="rounded-xl border border-success/30 bg-success/5 p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-building-2" class="size-5 text-success" />
                <h3 class="font-semibold text-highlighted">สถานที่ฝึกงานที่ยืนยันแล้ว</h3>
              </div>
              <UButton size="xs" color="success" variant="ghost" label="ดูข้อมูลสถานที่ฝึกงาน" to="/student/placement" />
            </div>
            <div class="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <span class="text-muted block">สถานประกอบการ</span>
                <span class="font-medium text-highlighted text-sm">{{ context.placement.companyName }}</span>
              </div>
              <div>
                <span class="text-muted block">ตำแหน่ง</span>
                <span class="font-medium text-highlighted">{{ context.placement.position || '—' }}</span>
              </div>
              <div>
                <span class="text-muted block">จังหวัด</span>
                <span class="font-medium text-highlighted">{{ context.placement.province || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Supervision Visit (if available) -->
          <div v-if="context.upcomingVisit" class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar-days" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted">ตารางนิเทศครั้งถัดไป</h3>
              </div>
              <UButton size="xs" color="neutral" variant="ghost" label="ดูตารางนิเทศทั้งหมด" to="/student/visits" />
            </div>
            <div class="grid gap-2 text-xs sm:grid-cols-3 pt-1">
              <div>
                <span class="text-muted block">ครั้งที่ / ช่วงเวลา</span>
                <span class="font-medium text-highlighted">ครั้งที่ {{ context.upcomingVisit.visitNo }} ({{ context.upcomingVisit.period === 'MORNING' ? 'ช่วงเช้า' : 'ช่วงบ่าย' }})</span>
              </div>
              <div>
                <span class="text-muted block">วันที่นิเทศ</span>
                <span class="font-medium text-highlighted">{{ formatThaiDate(context.upcomingVisit.visitDate) }}</span>
              </div>
              <div>
                <span class="text-muted block">อาจารย์ผู้นิเทศ</span>
                <span class="font-medium text-highlighted">{{ context.upcomingVisit.supervisorName || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Notifications Widget -->
          <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-bell" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted">การแจ้งเตือนล่าสุด</h3>
                <UBadge v-if="context.unreadNotificationsCount > 0" color="error" size="sm" variant="subtle">
                  ยังไม่อ่าน {{ context.unreadNotificationsCount }}
                </UBadge>
              </div>
              <NuxtLink to="/student/notifications" class="text-xs text-primary hover:underline flex items-center gap-1">
                ดูทั้งหมด <UIcon name="i-lucide-chevron-right" class="size-3" />
              </NuxtLink>
            </div>

            <div v-if="context.recentNotifications.length > 0" class="divide-y divide-default/50">
              <NuxtLink
                v-for="n in context.recentNotifications"
                :key="n.id"
                :to="n.link || '/student/notifications'"
                class="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-muted/10 px-2 rounded-md transition-colors"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span v-if="!n.isRead" class="size-1.5 rounded-full bg-primary" />
                    <span class="font-medium text-highlighted">{{ n.title }}</span>
                  </div>
                  <p class="text-muted line-clamp-1">{{ n.message }}</p>
                </div>
                <span class="text-[11px] text-muted shrink-0">{{ formatThaiDate(n.createdAt) }}</span>
              </NuxtLink>
            </div>
            <div v-else class="py-4 text-center text-xs text-muted">
              ไม่มีการแจ้งเตือน
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
