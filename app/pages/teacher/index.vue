<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface Appointment {
  id: number
  companyName: string
  companyAddress: string | null
  province: string | null
  scheduledDate: string
  period: string
  timeNote: string | null
  status: 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED'
  evaluationNote: string | null
  supervisionGroup: { name: string }
  students: Array<{ studentUser: { id: number; loginId: string; prefix: string | null; firstName: string | null; lastName: string | null } }>
}

const { data, status, refresh } = await useFetch<{ appointments: Appointment[] }>('/api/teacher/supervision-appointments')
const statusFilter = ref<'ALL' | Appointment['status']>('ALL')
const appointments = computed(() => (data.value?.appointments || []).filter(appointment => statusFilter.value === 'ALL' || appointment.status === statusFilter.value))
const statusOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'รอการนิเทศ', value: 'PUBLISHED' },
  { label: 'เลื่อนนัด', value: 'RESCHEDULED' },
  { label: 'นิเทศเสร็จแล้ว', value: 'COMPLETED' }
]
const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
const periodLabel = (period: string) => ({ MORNING: 'ช่วงเช้า', AFTERNOON: 'ช่วงบ่าย', FULL_DAY: 'เต็มวัน' }[period] || period)
</script>

<template>
  <UDashboardPanel id="teacher-overview">
    <template #header>
      <AppDashboardNavbar title="งานนิเทศและการประเมิน"><template #leading><UDashboardSidebarCollapse /></template><template #right><AppNotificationBell /></template></AppDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <UAlert color="info" variant="subtle" icon="i-lucide-clipboard-check" title="รายการที่ได้รับมอบหมาย" description="อาจารย์ทุกคนในกลุ่มสามารถประเมินและแก้ไขผลได้ทันทีจากตารางนิเทศ" />
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end"><USelect v-model="statusFilter" :items="statusOptions" value-key="value" class="sm:w-48" aria-label="กรองตามสถานะ" /><UIButtonRefresh class="self-start sm:self-auto" :loading="status === 'pending'" @refresh="refresh" /></div>
        <div v-if="status === 'pending'" class="py-12 text-center text-muted"><UIcon name="i-lucide-loader-2" class="size-7 animate-spin mx-auto" /></div>
        <div v-else-if="appointments.length" class="grid gap-3">
          <article v-for="appointment in appointments" :key="appointment.id" class="rounded-lg border border-default bg-default p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><h2 class="font-semibold text-highlighted">{{ appointment.companyName }}</h2><UBadge :label="appointment.status === 'COMPLETED' ? 'ประเมินเสร็จแล้ว' : 'รอประเมิน'" :color="appointment.status === 'COMPLETED' ? 'success' : 'warning'" variant="subtle" /></div>
                <p class="mt-1 text-sm text-muted">{{ formatDate(appointment.scheduledDate) }} · {{ periodLabel(appointment.period) }} · {{ appointment.supervisionGroup.name }}</p>
                <p v-if="appointment.timeNote" class="mt-1 text-sm text-muted">{{ appointment.timeNote }}</p>
                <p class="mt-2 text-sm text-muted">นักศึกษา: {{ appointment.students.map(item => `${item.studentUser.prefix || ''}${item.studentUser.firstName || ''} ${item.studentUser.lastName || ''}`).join(', ') }}</p>
                <p v-if="appointment.evaluationNote" class="mt-2 rounded bg-muted/30 p-2 text-sm text-muted">บันทึกผล: {{ appointment.evaluationNote }}</p>
              </div>
              <UButton label="ดูรายละเอียด" icon="i-lucide-calendar-days" color="primary" :to="{ path: '/teacher/visits', query: { appointmentId: String(appointment.id) } }" />
            </div>
          </article>
        </div>
        <div v-else class="rounded-lg border border-dashed border-default py-14 text-center text-muted"><UIcon name="i-lucide-calendar-off" class="size-9 mx-auto mb-2" /><p class="font-medium text-highlighted">ยังไม่มีงานนิเทศที่ได้รับมอบหมาย</p></div>
      </div>
    </template>
  </UDashboardPanel>

</template>
