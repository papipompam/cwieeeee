<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface Placement {
  id: number
  companyName: string
  internshipLocationName: string | null
  position: string | null
  address: string | null
  province: string | null
  confirmedAt: string
  cycle: { academicYear: number; term: string }
}

const { data, status, error, refresh } = await useFetch<{ placement: Placement | null, currentRequest: { id: number } | null }>('/api/student/placement')

const formatThaiDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
  : '—'
</script>

<template>
  <UDashboardPanel id="student-placement-page">
    <template #header>
      <AppDashboardNavbar title="สถานที่ฝึกงาน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดข้อมูลสถานที่ฝึกงาน" :description="error.message" />

      <div v-else-if="status === 'pending'" class="space-y-4">
        <USkeleton class="h-48 rounded-xl" />
      </div>

      <UCard v-else-if="data?.placement" class="mx-auto max-w-3xl">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-building-2" class="size-5 text-success" />
            <div>
              <h1 class="font-semibold text-highlighted">{{ data.placement.companyName }}</h1>
              <p class="text-sm text-muted">ยืนยันสถานที่ฝึกงานแล้ว</p>
            </div>
          </div>
        </template>

        <dl class="grid gap-5 text-sm sm:grid-cols-2">
          <div><dt class="text-muted">สถานที่ฝึกจริง</dt><dd class="mt-1 text-highlighted">{{ data.placement.internshipLocationName || data.placement.companyName }}</dd></div>
          <div><dt class="text-muted">ตำแหน่ง</dt><dd class="mt-1 text-highlighted">{{ data.placement.position || '—' }}</dd></div>
          <div><dt class="text-muted">ที่อยู่</dt><dd class="mt-1 text-highlighted">{{ data.placement.address || '—' }}</dd></div>
          <div><dt class="text-muted">รอบสหกิจ</dt><dd class="mt-1 text-highlighted">{{ data.placement.cycle.academicYear }}/{{ data.placement.cycle.term }}</dd></div>
        </dl>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs text-muted">ยืนยันเมื่อ {{ formatThaiDate(data.placement.confirmedAt) }}</span>
            <UButton color="primary" label="ดูคำร้อง" :to="`/student/requests/${data.placement.id}`" />
          </div>
        </template>
      </UCard>

      <UEmpty v-else icon="i-lucide-map-pin" title="ยังไม่มีสถานที่ฝึกงานที่ยืนยันแล้ว" description="สถานที่ฝึกงานจะแสดงที่นี่หลังเจ้าหน้าที่ตรวจสอบเอกสารเสร็จสิ้น">
        <template v-if="data?.currentRequest" #links>
          <UButton color="primary" label="ติดตามคำร้อง" :to="`/student/requests/${data.currentRequest.id}`" />
        </template>
      </UEmpty>
    </template>
  </UDashboardPanel>
</template>
