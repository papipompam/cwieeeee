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

const { data, status, error, refresh } = await useFetch<{ appointments: Appointment[] }>('/api/teacher/supervision-appointments')
const statusFilter = ref<'ALL' | Appointment['status']>('ALL')
const appointments = computed(() => (data.value?.appointments || []).filter(appointment => statusFilter.value === 'ALL' || appointment.status === statusFilter.value))
const totalCount = computed(() => data.value?.appointments?.length ?? 0)
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
      <AppDashboardNavbar title="งานนิเทศและการประเมิน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><AppNotificationBell /></template>
      </AppDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-5 p-4 sm:p-6">
        <UAlert color="info" variant="subtle" icon="i-lucide-clipboard-check" title="รายการที่ได้รับมอบหมาย" description="อาจารย์ทุกคนในกลุ่มสามารถประเมินและแก้ไขผลได้ทันทีจากตารางนิเทศ" />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            size="xl"
            class="w-full sm:w-52"
            aria-label="กรองตามสถานะ"
          />
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
        </div>

        <div v-if="status === 'pending'" class="grid gap-4" aria-label="กำลังโหลดข้อมูลงานนิเทศ">
          <UCard v-for="i in 3" :key="i" :ui="{ body: 'p-5 sm:p-6' }">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="w-full max-w-xl space-y-2">
                <USkeleton class="h-6 w-1/3" />
                <USkeleton class="h-4 w-1/2" />
                <USkeleton class="h-4 w-2/3" />
              </div>
              <USkeleton class="h-10 w-28 shrink-0" />
            </div>
          </UCard>
        </div>

        <UEmpty
          v-else-if="error"
          icon="i-lucide-triangle-alert"
          title="โหลดรายการงานนิเทศไม่สำเร็จ"
          :description="error.message || 'เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง'"
          class="min-h-64"
        >
          <template #actions>
            <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="() => refresh()">
              ลองอีกครั้ง
            </UButton>
          </template>
        </UEmpty>

        <div v-else-if="appointments.length" class="grid gap-4">
          <UCard
            v-for="appointment in appointments"
            :key="appointment.id"
            :ui="{ body: 'p-5 sm:p-6' }"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-base font-semibold text-ink">{{ appointment.companyName }}</h2>
                  <UBadge
                    :label="appointment.status === 'COMPLETED' ? 'ประเมินเสร็จแล้ว' : 'รอประเมิน'"
                    :color="appointment.status === 'COMPLETED' ? 'success' : 'warning'"
                    variant="subtle"
                  />
                </div>
                <p class="mt-1 text-sm text-muted">
                  {{ formatDate(appointment.scheduledDate) }} · {{ periodLabel(appointment.period) }} · {{ appointment.supervisionGroup.name }}
                </p>
                <p v-if="appointment.timeNote" class="mt-1 text-sm text-muted">{{ appointment.timeNote }}</p>
                <p class="mt-2 text-sm text-muted">
                  นักศึกษา: {{ appointment.students.map(item => `${item.studentUser.prefix || ''}${item.studentUser.firstName || ''} ${item.studentUser.lastName || ''}`).join(', ') }}
                </p>
                <p v-if="appointment.evaluationNote" class="mt-2 rounded-control bg-surface p-3 text-sm text-muted">
                  บันทึกผล: {{ appointment.evaluationNote }}
                </p>
              </div>
              <UButton
                size="xl"
                label="ดูรายละเอียด"
                icon="i-lucide-calendar-days"
                color="primary"
                class="shrink-0"
                :to="{ path: '/teacher/visits', query: { appointmentId: String(appointment.id) } }"
              />
            </div>
          </UCard>
        </div>

        <UEmpty
          v-else-if="totalCount > 0 && statusFilter !== 'ALL'"
          icon="i-lucide-inbox"
          title="ไม่พบงานนิเทศที่ตรงกับตัวกรอง"
          description="ลองเปลี่ยนตัวเลือกสถานะหรือล้างตัวกรองที่ใช้อยู่"
          class="min-h-64"
        >
          <template #actions>
            <UButton size="xl" color="neutral" variant="outline" @click="statusFilter = 'ALL'">
              ล้างตัวกรอง
            </UButton>
          </template>
        </UEmpty>

        <UEmpty
          v-else
          icon="i-lucide-calendar-off"
          title="ยังไม่มีงานนิเทศที่ได้รับมอบหมาย"
          description="รายการจะแสดงเมื่อเจ้าหน้าที่มอบหมายตารางนิเทศให้คุณ"
          class="min-h-64"
        />
      </div>
    </template>
  </UDashboardPanel>

</template>
