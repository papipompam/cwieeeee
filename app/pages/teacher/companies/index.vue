<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface CompanyRecord {
  id: number
  name: string
  address: string | null
  province: string | null
  contactPerson: string
  phone: string | null
  email: string | null
  groupName: string
  appointments: number[]
}

const { data, status, error, refresh } = await useFetch<{ companies: CompanyRecord[] }>('/api/teacher/records')
const search = ref('')
const companies = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return data.value?.companies ?? []

  return (data.value?.companies ?? []).filter(item =>
    [item.name, item.province, item.contactPerson, item.groupName].join(' ').toLowerCase().includes(keyword)
  )
})

const columns: TableColumn<CompanyRecord>[] = [
  { accessorKey: 'name', header: 'สถานประกอบการ' },
  { accessorKey: 'province', header: 'จังหวัด' },
  { id: 'contact', header: 'ผู้ติดต่อ' },
  { accessorKey: 'groupName', header: 'กลุ่มนิเทศ' }
]
</script>

<template>
  <UDashboardPanel id="teacher-companies">
    <template #header>
      <UDashboardNavbar title="ข้อมูลสถานประกอบการ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดข้อมูลได้" :description="error.message" />
        <UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหาชื่อบริษัท จังหวัด ผู้ติดต่อ หรือกลุ่มนิเทศ" class="sm:max-w-md" />
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="companies" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #contact-cell="{ row }">
              <div>
                <p>{{ row.original.contactPerson }}</p>
                <p class="text-xs text-muted">{{ row.original.phone || row.original.email || 'ไม่ระบุข้อมูลติดต่อ' }}</p>
              </div>
            </template>
            <template #empty><div class="py-10 text-center text-muted">ยังไม่มีสถานประกอบการในงานนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
