<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface Company {
  id: number
  name: string
  contactPerson: string
  phone: string | null
  email: string | null
  province: string
  district: string
  reviewCount: number
  averageRating: number | null
}

const search = ref('')
const { data: companies, status, error, refresh } = await useFetch<Company[]>('/api/student/companies', {
  query: computed(() => ({ search: search.value })),
  watch: [search]
})
const reviewOpen = ref(false)
const selectedCompany = ref<Company | null>(null)
const compactTable = ref(false)
let mediaQuery: MediaQueryList | null = null
const updateCompactTable = () => { compactTable.value = Boolean(mediaQuery?.matches) }
onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 639px)')
  updateCompactTable()
  mediaQuery.addEventListener('change', updateCompactTable)
})
onBeforeUnmount(() => mediaQuery?.removeEventListener('change', updateCompactTable))
const { data: reviews, status: reviewStatus, refresh: refreshReviews } = await useFetch<Array<{ id: number, rating: number, comment: string, term: number, academicYear: number }>>(() => selectedCompany.value ? `/api/student/companies/${selectedCompany.value.id}/reviews` : '', { immediate: false })
const openReviews = async (company: Company) => { selectedCompany.value = company; reviewOpen.value = true; await refreshReviews() }

const columns = computed<TableColumn<Company>[]>(() => [
  { accessorKey: 'name', header: 'สถานประกอบการ' },
  ...(!compactTable.value ? [{ id: 'contact', header: 'ช่องทางการติดต่อ' }] : []),
  { id: 'reviews', header: 'รีวิวสถานประกอบการ', meta: { class: { th: 'w-48', td: 'w-48' } } },
  { id: 'actions', header: 'จัดการ' }
])
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
      <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0' }">
        <div class="border-b border-divider p-5 sm:p-6">
          <h1 class="text-lg font-bold text-ink">ค้นหาสถานประกอบการ</h1>
          <p class="mt-1 text-sm leading-6 text-muted">ค้นหาจากชื่อสถานประกอบการหรือจังหวัด แล้วเลือกเพื่อกรอกข้อมูลการสมัคร</p>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput v-model="search" size="xl" icon="i-lucide-search" placeholder="ค้นหาชื่อสถานประกอบการหรือจังหวัด" class="w-full sm:max-w-xl" aria-label="ค้นหาสถานประกอบการหรือจังหวัด" />
            <span class="text-sm text-muted">{{ companies?.length ?? 0 }} รายการ</span>
          </div>
        </div>

        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="ไม่สามารถค้นหาสถานประกอบการได้" :description="error.message" class="m-5" />
        <div v-else-if="status === 'pending'" class="space-y-3 p-5 sm:p-6">
          <USkeleton v-for="item in 5" :key="item" class="h-12 w-full" />
        </div>
        <UEmpty v-else-if="!companies?.length" icon="i-lucide-building-2" title="ไม่พบสถานประกอบการ" :description="search ? 'ลองเปลี่ยนคำค้นหาหรือจังหวัด' : 'เริ่มต้นด้วยการพิมพ์ชื่อสถานประกอบการหรือจังหวัด'" class="py-16" />
        <div v-else class="w-full overflow-x-auto">
          <UTable :data="companies" :columns="columns" class="w-full" :ui="{ base: 'w-full' }">
            <template #name-cell="{ row }">
              <div class="min-w-0 py-1"><p class="break-words font-semibold text-ink">{{ row.original.name }}</p><p class="mt-1 text-xs text-muted">{{ row.original.district }}, {{ row.original.province }}</p></div>
            </template>
            <template #contact-cell="{ row }"><div class="min-w-44 text-sm"><p class="text-ink">{{ row.original.contactPerson }}</p><p class="mt-0.5 text-xs text-muted">{{ row.original.phone || row.original.email || 'ไม่ระบุช่องทางติดต่อ' }}</p></div></template>
            <template #reviews-cell="{ row }"><UButton size="xs" color="neutral" variant="outline" icon="i-lucide-star" class="whitespace-nowrap" :label="compactTable ? 'ดูรีวิว' : row.original.reviewCount ? `${row.original.averageRating?.toFixed(1)}/5 (${row.original.reviewCount} รีวิว)` : 'ดูรีวิว'" @click="openReviews(row.original)" /></template>
            <template #actions-header><span class="block text-right">จัดการ</span></template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end"><UButton size="xs" color="primary" label="เลือกสถานประกอบการ" :to="{ path: '/student/applications', query: { companyId: row.original.id } }" /></div>
            </template>
          </UTable>
        </div>
      </UCard>
      </div>
    </template>
  </UDashboardPanel>
  <UModal v-model:open="reviewOpen" :title="selectedCompany ? `รีวิว ${selectedCompany.name}` : 'รีวิวสถานประกอบการ'" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body><div class="max-h-[65vh] space-y-4 overflow-y-auto pr-1"><div v-if="reviewStatus === 'pending'" class="space-y-2"><USkeleton v-for="i in 3" :key="i" class="h-20 w-full" /></div><UEmpty v-else-if="!reviews?.length" icon="i-lucide-message-square" title="ยังไม่มีรีวิวที่เผยแพร่" /><article v-for="review in reviews" :key="review.id" class="rounded-panel border border-divider p-4"><p class="font-medium text-ink">{{ review.rating }}/5 คะแนน <span class="ml-2 text-xs font-normal text-muted">ภาคเรียนที่ {{ review.term }}/{{ review.academicYear }}</span></p><p class="mt-2 whitespace-pre-wrap text-sm text-muted">{{ review.comment }}</p></article></div></template>
  </UModal>
</template>
