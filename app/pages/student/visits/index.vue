<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface VisitItem {
  id: number
  visitNo: number
  visitDate: string
  period: string
  companyName: string
  companyAddress: string | null
  supervisorName: string | null
  status: string
  notes: string | null
}

const { data: visits, status, error, refresh } = await useFetch<VisitItem[]>('/api/student/visits')

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const columns: TableColumn<VisitItem>[] = [
  { accessorKey: 'visitNo', header: 'ครั้งที่' },
  { accessorKey: 'visitDate', header: 'วันที่นิเทศ' },
  { accessorKey: 'period', header: 'ช่วงเวลา' },
  { accessorKey: 'companyName', header: 'สถานที่นิเทศ' },
  { accessorKey: 'supervisorName', header: 'อาจารย์นิเทศ' },
  { accessorKey: 'notes', header: 'หมายเหตุ / ผลการนิเทศ' }
]
</script>

<template>
  <UDashboardPanel id="student-visits-page">
    <template #header>
      <AppDashboardNavbar title="ตารางการนิเทศงานสหกิจศึกษา">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 pb-8">
        <section class="overflow-hidden rounded-xl border border-default bg-default shadow-xs" aria-labelledby="visits-heading">
          <div class="flex items-start justify-between gap-4 border-b border-default p-5 sm:p-6">
            <div>
              <h2 id="visits-heading" class="text-lg font-bold text-highlighted">รายการนัดนิเทศ</h2>
              <p class="mt-1 text-sm leading-6 text-muted">ดูวัน เวลา สถานประกอบการ และอาจารย์ผู้นิเทศของคุณ</p>
            </div>
            <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-info/10 text-info">
              <UIcon name="i-lucide-calendar-days" class="size-5" />
            </span>
          </div>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดตารางนิเทศได้"
          :description="error.message"
        />

        <div class="overflow-hidden">
          <UTable
            :columns="columns"
            :data="visits || []"
            :loading="status === 'pending'"
            class="min-w-full overflow-x-auto"
          >
            <template #visitNo-cell="{ row }">
              <span class="font-semibold text-highlighted text-xs">ครั้งที่ {{ row.original.visitNo }}</span>
            </template>

            <template #visitDate-cell="{ row }">
              <span class="text-xs text-highlighted">{{ formatThaiDate(row.original.visitDate) }}</span>
            </template>

            <template #period-cell="{ row }">
              <UBadge size="xs" variant="subtle" :color="row.original.period === 'MORNING' ? 'info' : 'warning'">
                {{ row.original.period === 'MORNING' ? 'ช่วงเช้า' : 'ช่วงบ่าย' }}
              </UBadge>
            </template>

            <template #companyName-cell="{ row }">
              <div>
                <p class="font-medium text-highlighted text-xs">{{ row.original.companyName }}</p>
                <p v-if="row.original.companyAddress" class="text-muted text-[11px]">{{ row.original.companyAddress }}</p>
              </div>
            </template>

            <template #supervisorName-cell="{ row }">
              <span class="text-xs text-muted">{{ row.original.supervisorName || '—' }}</span>
            </template>

            <template #notes-cell="{ row }">
              <span class="text-xs text-muted">{{ row.original.notes || '—' }}</span>
            </template>

            <template #empty>
              <div class="py-12 text-center text-muted space-y-2">
                <UIcon name="i-lucide-calendar-days" class="size-8 mx-auto opacity-40" />
                <p class="text-sm">ยังไม่มีตารางนิเทศที่เผยแพร่</p>
                <p class="text-xs">เมื่ออาจารย์นิเทศกำหนดและเผยแพร่วันเวลานิเทศ ตารางจะแสดงที่นี่</p>
              </div>
            </template>
          </UTable>
        </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
