<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

type AppointmentStatus = 'PUBLISHED' | 'RESCHEDULED'

interface TeacherContext {
  teacher: { name: string, teacherId: string }
  appointments: Array<{
    id: number
    companyName: string
    companyAddress: string | null
    province: string | null
    scheduledDate: string
    period: string
    timeNote: string | null
    status: AppointmentStatus
    supervisionGroup: { name: string }
    supervisionRound: { roundNo: number, cooperativeCycle: { term: number, academicYear: number } }
    _count: { students: number }
  }>
}

const { data: context, status, error, refresh } = await useFetch<TeacherContext>('/api/teacher/context')
const nextAppointment = computed(() => context.value?.appointments[0] ?? null)
const formatThaiDate = (value: string) => new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
const periodLabel = (period: string) => period === 'AFTERNOON' ? 'ช่วงบ่าย' : 'ช่วงเช้า'
const statusBadge = (appointmentStatus: AppointmentStatus) => appointmentStatus === 'RESCHEDULED'
  ? { label: 'เลื่อนนัด', color: 'warning' as const }
  : { label: 'เผยแพร่แล้ว', color: 'success' as const }
</script>

<template>
  <UDashboardPanel id="teacher-overview">
    <template #header>
      <UDashboardNavbar title="ภาพรวมอาจารย์นิเทศ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6 pb-12">
        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดตารางนิเทศได้" :description="error.message" :actions="[{ label: 'ลองอีกครั้ง', color: 'error', variant: 'subtle', onClick: () => refresh() }]" />

        <template v-else-if="status === 'pending'">
          <USkeleton class="h-32 rounded-xl" />
          <div class="grid gap-4 md:grid-cols-2"><USkeleton class="h-36 rounded-xl" /><USkeleton class="h-36 rounded-xl" /></div>
        </template>

        <template v-else-if="context">
          <section class="rounded-xl border border-default bg-default p-6 shadow-xs">
            <p class="text-sm text-muted">ยินดีต้อนรับ</p>
            <h1 class="mt-1 text-xl font-semibold text-highlighted">{{ context.teacher.name }}</h1>
            <p class="mt-1 text-sm text-muted">รหัสอาจารย์ {{ context.teacher.teacherId }}</p>
          </section>

          <div class="grid gap-4 md:grid-cols-2">
            <section class="rounded-xl border border-default bg-default p-5 shadow-xs">
              <div class="flex items-center gap-2 text-sm text-muted"><UIcon name="i-lucide-calendar-days" class="size-4 text-primary" />ตารางนิเทศที่ได้รับมอบหมาย</div>
              <p class="mt-3 text-3xl font-semibold tabular-nums text-highlighted">{{ context.appointments.length }}</p>
              <p class="mt-1 text-sm text-muted">รายการที่เผยแพร่แล้ว</p>
            </section>
            <section class="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
              <div class="flex items-center gap-2 text-sm text-primary"><UIcon name="i-lucide-clock-3" class="size-4" />กำหนดการถัดไป</div>
              <template v-if="nextAppointment">
                <p class="mt-3 font-semibold text-highlighted">{{ nextAppointment.companyName }}</p>
                <p class="mt-1 text-sm text-muted">{{ formatThaiDate(nextAppointment.scheduledDate) }} · {{ periodLabel(nextAppointment.period) }}</p>
              </template>
              <p v-else class="mt-3 text-sm text-muted">ยังไม่มีตารางนิเทศที่เผยแพร่</p>
            </section>
          </div>

          <section class="rounded-xl border border-default bg-default shadow-xs">
            <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-4">
              <div><h2 class="font-semibold text-highlighted">ตารางนิเทศของฉัน</h2><p class="mt-0.5 text-sm text-muted">แสดงเฉพาะรายการที่เจ้าหน้าที่เผยแพร่แล้ว</p></div>
              <UBadge color="primary" variant="subtle" :label="`${context.appointments.length} รายการ`" />
            </div>

            <div v-if="context.appointments.length" class="divide-y divide-default">
              <article v-for="appointment in context.appointments" :key="appointment.id" class="p-5">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2"><h3 class="font-medium text-highlighted">{{ appointment.companyName }}</h3><UBadge :color="statusBadge(appointment.status).color" variant="subtle" size="sm">{{ statusBadge(appointment.status).label }}</UBadge></div>
                    <p class="mt-1 text-sm text-muted">{{ appointment.companyAddress || appointment.province || 'ไม่ระบุที่อยู่' }}</p>
                  </div>
                  <div class="text-sm text-muted sm:text-right"><p class="font-medium text-highlighted">{{ formatThaiDate(appointment.scheduledDate) }} · {{ periodLabel(appointment.period) }}</p><p v-if="appointment.timeNote" class="mt-1">{{ appointment.timeNote }}</p></div>
                </div>
                <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-users-round" class="size-4" />{{ appointment.supervisionGroup.name }}</span>
                  <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-graduation-cap" class="size-4" />นักศึกษา {{ appointment._count.students }} คน</span>
                  <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-calendar-range" class="size-4" />ครั้งที่ {{ appointment.supervisionRound.roundNo }} · {{ appointment.supervisionRound.cooperativeCycle.term }}/{{ appointment.supervisionRound.cooperativeCycle.academicYear }}</span>
                </div>
              </article>
            </div>
            <div v-else class="px-5 py-14 text-center"><UIcon name="i-lucide-calendar-check-2" class="mx-auto size-10 text-dimmed" /><p class="mt-3 font-medium text-highlighted">ยังไม่มีตารางนิเทศที่เผยแพร่</p><p class="mt-1 text-sm text-muted">ตารางจะแสดงเมื่อเจ้าหน้าที่มอบหมายและเผยแพร่รายการนิเทศแล้ว</p></div>
          </section>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
