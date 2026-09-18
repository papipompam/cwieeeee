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
const groupFilter = ref('ALL')
const selectedCompany = ref<CompanyRecord | null>(null)
const detailOpen = ref(false)
const groupOptions = computed(() => [{ label: 'ทุกกลุ่มนิเทศ', value: 'ALL' }, ...Array.from(new Set((data.value?.companies ?? []).map(company => company.groupName))).map(groupName => ({ label: groupName, value: groupName }))])
const companies = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (data.value?.companies ?? []).filter(item =>
    (!keyword || [item.name, item.province, item.contactPerson, item.groupName].join(' ').toLowerCase().includes(keyword))
    && (groupFilter.value === 'ALL' || item.groupName === groupFilter.value)
  )
})
const openDetail = (company: CompanyRecord) => { selectedCompany.value = company; detailOpen.value = true }

const columns: TableColumn<CompanyRecord>[] = [
  { accessorKey: 'name', header: 'สถานประกอบการ' },
  { accessorKey: 'province', header: 'จังหวัด' },
  { id: 'contact', header: 'ผู้ติดต่อ' },
  { accessorKey: 'groupName', header: 'กลุ่มนิเทศ' },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-companies">
    <template #header>
      <UDashboardNavbar title="ข้อมูลสถานประกอบการ"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดข้อมูลได้" :description="error.message" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหาชื่อบริษัท จังหวัด ผู้ติดต่อ หรือกลุ่มนิเทศ" class="sm:max-w-md" /><div class="flex flex-col gap-3 sm:ml-auto sm:flex-row"><USelect v-model="groupFilter" :items="groupOptions" value-key="value" class="sm:w-48" aria-label="กรองตามกลุ่มนิเทศ" /><UIButtonRefresh class="self-start" :loading="status === 'pending'" @refresh="refresh" /></div></div>
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="companies" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #contact-cell="{ row }">
              <div>
                <p>{{ row.original.contactPerson }}</p>
                <p class="text-xs text-muted">{{ row.original.phone || row.original.email || 'ไม่ระบุข้อมูลติดต่อ' }}</p>
              </div>
            </template>
            <template #actions-cell="{ row }"><UButton label="รายละเอียด" color="neutral" variant="ghost" size="xs" @click="openDetail(row.original)" /></template>
            <template #empty><div class="py-10 text-center text-muted">ยังไม่มีสถานประกอบการในงานนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="detailOpen" :title="selectedCompany ? selectedCompany.name : 'ข้อมูลสถานประกอบการ'">
    <template #body><div v-if="selectedCompany" class="grid gap-4 text-sm sm:grid-cols-2"><div class="sm:col-span-2"><p class="text-muted">ที่อยู่</p><p class="font-medium text-highlighted">{{ selectedCompany.address || 'ไม่ระบุ' }}</p></div><div><p class="text-muted">จังหวัด</p><p class="font-medium text-highlighted">{{ selectedCompany.province || 'ไม่ระบุ' }}</p></div><div><p class="text-muted">กลุ่มนิเทศ</p><p class="font-medium text-highlighted">{{ selectedCompany.groupName }}</p></div><div><p class="text-muted">ผู้ติดต่อ</p><p class="font-medium text-highlighted">{{ selectedCompany.contactPerson }}</p></div><div><p class="text-muted">โทรศัพท์</p><p class="font-medium text-highlighted">{{ selectedCompany.phone || 'ไม่ระบุ' }}</p></div><div class="sm:col-span-2"><p class="text-muted">อีเมล</p><p class="font-medium text-highlighted">{{ selectedCompany.email || 'ไม่ระบุ' }}</p></div></div></template>
  </UModal>
</template>
