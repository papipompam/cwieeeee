<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface Company {
  id: number
  name: string
  contactPerson: string
  province: string
  district: string
}

const search = ref('')
const { data: companies, status, error, refresh } = await useFetch<Company[]>('/api/student/companies', {
  query: computed(() => ({ search: search.value })),
  watch: [search]
})

const columns: TableColumn<Company>[] = [
  { accessorKey: 'name', header: 'สถานประกอบการ' },
  { accessorKey: 'province', header: 'จังหวัด' },
  { accessorKey: 'contactPerson', header: 'ผู้ติดต่อ' },
  { id: 'actions', header: 'จัดการ' }
]
</script>

<template>
  <UDashboardPanel id="student-company-search-page">
    <template #header>
      <AppDashboardNavbar title="ค้นหาสถานประกอบการ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0' }">
        <div class="border-b border-divider p-5 sm:p-6">
          <h1 class="text-lg font-bold text-ink">ค้นหาสถานประกอบการ</h1>
          <p class="mt-1 text-sm leading-6 text-muted">ค้นหาจากชื่อสถานประกอบการหรือจังหวัด แล้วเลือกเพื่อกรอกข้อมูลการสมัคร</p>
          <UInput v-model="search" size="xl" icon="i-lucide-search" placeholder="ค้นหาชื่อสถานประกอบการหรือจังหวัด" class="mt-4 w-full sm:max-w-xl" aria-label="ค้นหาสถานประกอบการหรือจังหวัด" />
        </div>

        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="ไม่สามารถค้นหาสถานประกอบการได้" :description="error.message" class="m-5" />
        <div v-else-if="status === 'pending'" class="space-y-3 p-5 sm:p-6">
          <USkeleton v-for="item in 5" :key="item" class="h-12 w-full" />
        </div>
        <UEmpty v-else-if="!companies?.length" icon="i-lucide-building-2" title="ไม่พบสถานประกอบการ" :description="search ? 'ลองเปลี่ยนคำค้นหาหรือจังหวัด' : 'เริ่มต้นด้วยการพิมพ์ชื่อสถานประกอบการหรือจังหวัด'" class="py-16" />
        <div v-else class="w-full overflow-x-auto">
          <UTable :data="companies" :columns="columns" class="min-w-full">
            <template #name-cell="{ row }">
              <div class="min-w-56 py-1"><p class="font-semibold text-ink">{{ row.original.name }}</p><p class="mt-1 text-xs text-muted">{{ row.original.district }}, {{ row.original.province }}</p></div>
            </template>
            <template #province-cell="{ row }"><span class="text-sm text-ink">{{ row.original.province }}</span></template>
            <template #contactPerson-cell="{ row }"><span class="text-sm text-ink">{{ row.original.contactPerson }}</span></template>
            <template #actions-header><span class="block text-right">จัดการ</span></template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end"><UButton size="xs" color="primary" label="เลือกสถานประกอบการ" :to="{ path: '/student/applications', query: { companyId: row.original.id } }" /></div>
            </template>
          </UTable>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
