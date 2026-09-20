<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

interface StudentUser {
  id: number
  loginId: string
  prefix: string
  firstName: string
  lastName: string
  classGroup: number
  cohortYear: number
}

interface PlacementRow {
  id: number
  companyApplicationId: number
  companyName: string
  internshipLocationName: string | null
  position: string | null
  province: string | null
  recipientName: string | null
  confirmedAt: string
  updatedAt: string
  student: StudentUser
}

interface PlacementsResponse {
  placements: PlacementRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface CooperativeCycle {
  id: number
  term: number
  academicYear: number
  cohortYear: number
  status: string
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<CooperativeCycle | null>>('currentCycle')

const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

const { data, status: fetchStatus, refresh } = await useFetch<PlacementsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/placements`,
  {
    query: computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      search: searchQuery.value || undefined
    })),
    watch: [page, searchQuery, pageSize]
  }
)

watch([searchQuery, pageSize], () => {
  page.value = 1
})

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '—'
  const d = new Date(dStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const columns: TableColumn<PlacementRow>[] = [
  {
    id: 'student',
    header: 'นักศึกษา',
    meta: { class: { th: 'w-48', td: 'w-48' } }
  },
  {
    id: 'company',
    header: 'สถานประกอบการ'
  },
  {
    accessorKey: 'position',
    header: 'ตำแหน่งงาน',
    meta: { class: { th: 'w-40', td: 'w-40 text-sm' } }
  },
  {
    accessorKey: 'province',
    header: 'จังหวัด',
    meta: { class: { th: 'w-28', td: 'w-28 text-sm' } }
  },
  {
    accessorKey: 'confirmedAt',
    header: 'วันที่ยืนยัน',
    meta: { class: { th: 'w-28 text-xs', td: 'w-28 text-xs text-muted' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end' } }
  }
]

const pageStart = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})
const pageEnd = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize.value, data.value.total)
})
</script>

<template>
  <div class="w-full space-y-6">
    <UCard :ui="{ body: 'p-0' }">
      <!-- Header info and controls -->
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
              สถานประกอบการที่ยืนยันแล้ว
            </h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              รายการสถานประกอบการและนักศึกษาที่ได้รับการยืนยันสถานที่ฝึกงานแล้ว (ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }})
            </p>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <UFormField label="ค้นหาสถานประกอบการที่ยืนยัน" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
            <UInput
              v-model="searchQuery"
              type="search"
              size="xl"
              icon="i-lucide-search"
              class="w-full"
              placeholder="ค้นหารหัส ชื่อ หรือสถานประกอบการ..."
              aria-label="ค้นหาสถานประกอบการที่ยืนยัน"
            />
          </UFormField>

          <div class="flex items-center gap-2 lg:ml-auto">
            <UIButtonRefresh
              :loading="fetchStatus === 'pending'"
              @refresh="refresh"
            />
          </div>
        </div>

        <div v-if="searchQuery" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            คำค้น “{{ searchQuery }}”
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="searchQuery = ''"
          >
            ล้างทั้งหมด
          </UButton>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="fetchStatus === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
        <div v-for="row in 4" :key="row" class="grid grid-cols-[2rem_1.2fr_1fr_8rem] gap-4 max-md:grid-cols-[1fr_7rem]">
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
          <USkeleton class="h-10 max-md:hidden" />
          <USkeleton class="h-10" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!data?.placements?.length" class="p-5 sm:p-6">
        <UEmpty
          icon="i-lucide-building-2"
          class="min-h-64"
          :title="searchQuery ? 'ไม่พบรายการที่ตรงกับคำค้น' : 'ยังไม่มีสถานประกอบการที่ยืนยันแล้วในรอบนี้'"
          :description="searchQuery ? 'ลองเปลี่ยนคำค้นหา' : 'เมื่อเจ้าหน้าที่ตรวจสอบเอกสารตอบรับและกดยืนยันสถานที่ฝึกงาน ข้อมูลจะปรากฏที่นี่'"
        >
          <template #actions>
            <UButton
              v-if="searchQuery"
              size="xl"
              color="neutral"
              variant="outline"
              @click="searchQuery = ''"
            >
              ล้างคำค้น
            </UButton>
          </template>
        </UEmpty>
      </div>

      <!-- Table -->
      <template v-else>
        <div class="w-full overflow-x-auto">
          <UTable
            :data="data?.placements || []"
            :columns="columns"
            class="min-w-full"
            :ui="{ base: 'w-full min-w-160' }"
          >
            <template #student-cell="{ row }">
              <div>
                <div class="font-medium text-ink text-sm truncate">
                  {{ row.original.student.prefix }}{{ row.original.student.firstName }} {{ row.original.student.lastName }}
                </div>
                <div class="text-xs text-muted mt-0.5">
                  {{ row.original.student.loginId }} · หมู่ {{ row.original.student.classGroup }}
                </div>
              </div>
            </template>

            <template #company-cell="{ row }">
              <div>
                <div class="font-medium text-ink text-sm truncate">
                  {{ row.original.companyName }}
                </div>
                <div v-if="row.original.internshipLocationName" class="text-xs text-muted mt-0.5">
                  {{ row.original.internshipLocationName }}
                </div>
              </div>
            </template>

            <template #position-cell="{ row }">
              <span>{{ row.original.position || '—' }}</span>
            </template>

            <template #province-cell="{ row }">
              <span>{{ row.original.province || '—' }}</span>
            </template>

            <template #confirmedAt-cell="{ row }">
              <span>{{ formatDate(row.original.confirmedAt) }}</span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                <UButton
                  label="ดูคำร้อง"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :to="`/staff/cooperative-cycles/${cycleId}/applications/${row.original.id}`"
                />
              </div>
            </template>
          </UTable>
        </div>

        <!-- Footer -->
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <p class="whitespace-nowrap text-muted">
              แสดง {{ pageStart }}–{{ pageEnd }} จากทั้งหมด {{ data.total }} รายการ
            </p>
            <div class="w-16 shrink-0">
              <USelect
                v-model="pageSize"
                size="md"
                class="w-full"
                :items="pageSizeOptions"
                aria-label="จำนวนรายการต่อหน้า"
              />
            </div>
          </div>

          <UPagination
            v-model:page="page"
            :total="data.total"
            :items-per-page="pageSize"
            size="md"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
