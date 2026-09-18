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
      <UDashboardNavbar title="ตารางการนิเทศงานสหกิจศึกษา">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดตารางนิเทศได้"
          :description="error.message"
        />

        <div class="rounded-lg border border-default bg-default overflow-hidden">
          <UTable
            :columns="columns"
            :data="visits || []"
            :loading="status === 'pending'"
            class="min-w-full"
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
      </div>
    </template>
  </UDashboardPanel>
</template>
