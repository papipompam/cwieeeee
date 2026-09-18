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

const notify = useNotify()
const selectedAppointment = ref<Appointment | null>(null)
const evaluationNote = ref('')
const isCompleteOpen = ref(false)
const isCompleting = ref(false)
const { data, status, refresh } = await useFetch<{ appointments: Appointment[] }>('/api/teacher/supervision-appointments')
const appointments = computed(() => data.value?.appointments || [])
const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
const periodLabel = (period: string) => ({ MORNING: 'ช่วงเช้า', AFTERNOON: 'ช่วงบ่าย', FULL_DAY: 'เต็มวัน' }[period] || period)
const openComplete = (appointment: Appointment) => {
  selectedAppointment.value = appointment
  evaluationNote.value = appointment.evaluationNote || ''
  isCompleteOpen.value = true
}
const completeEvaluation = async () => {
  if (!selectedAppointment.value) return
  isCompleting.value = true
  try {
    await $fetch(`/api/teacher/supervision-appointments/${selectedAppointment.value.id}/complete`, { method: 'POST', body: { evaluationNote: evaluationNote.value } })
    notify.success('บันทึกผลและจบการประเมินเรียบร้อยแล้ว')
    isCompleteOpen.value = false
    await refresh()
  } catch (error: any) {
    notify.error(error.data?.message || 'ไม่สามารถบันทึกผลการประเมินได้')
  } finally {
    isCompleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="teacher-overview">
    <template #header>
      <UDashboardNavbar title="งานนิเทศและการประเมิน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <UAlert color="info" variant="subtle" icon="i-lucide-clipboard-check" title="รายการที่ได้รับมอบหมาย" description="เลือกงานนิเทศของท่านเพื่อบันทึกผลและจบการประเมิน" />
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
              <UButton v-if="appointment.status !== 'COMPLETED'" label="ประเมินและจบงาน" icon="i-lucide-clipboard-check" color="primary" @click="openComplete(appointment)" />
            </div>
          </article>
        </div>
        <div v-else class="rounded-lg border border-dashed border-default py-14 text-center text-muted"><UIcon name="i-lucide-calendar-off" class="size-9 mx-auto mb-2" /><p class="font-medium text-highlighted">ยังไม่มีงานนิเทศที่ได้รับมอบหมาย</p></div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="isCompleteOpen" title="บันทึกผลการประเมิน">
    <template #body><div class="space-y-3"><p class="text-sm text-muted">{{ selectedAppointment?.companyName }}</p><label class="block text-sm font-medium text-highlighted" for="evaluation-note">บันทึกผลการนิเทศ</label><UTextarea id="evaluation-note" v-model="evaluationNote" class="w-full" :rows="5" placeholder="สรุปผลการนิเทศหรือข้อเสนอแนะ (ถ้ามี)" /></div></template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="ยกเลิก" color="neutral" variant="outline" @click="isCompleteOpen = false" /><UButton label="บันทึกและจบการประเมิน" color="success" :loading="isCompleting" @click="completeEvaluation" /></div></template>
  </UModal>
</template>
