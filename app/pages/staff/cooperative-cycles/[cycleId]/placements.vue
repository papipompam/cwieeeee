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
const pageSize = 10

const { data, status: fetchStatus, refresh } = await useFetch<PlacementsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/placements`,
  {
    query: computed(() => ({
      page: page.value,
      pageSize,
      search: searchQuery.value || undefined
    })),
    watch: [page, searchQuery]
  }
)

watch(searchQuery, () => {
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
    header: 'จัดการ',
    meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end' } }
  }
]

const pageStart = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return (page.value - 1) * pageSize + 1
})
const pageEnd = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize, data.value.total)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header info banner -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
          สถานประกอบการที่ยืนยันแล้ว
        </h2>
        <p class="text-xs text-muted mt-0.5">
          รายการสถานประกอบการและนักศึกษาที่ได้รับการยืนยันสถานที่ฝึกงานแล้ว (ภาคเรียนที่ {{ cycle?.term }}/{{ cycle?.academicYear }})
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- Filter & Search Row -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="ค้นหารหัส ชื่อ หรือสถานประกอบการ..."
        class="w-72"
        size="md"
      />

      <UButton
        v-if="searchQuery"
        label="ล้างการค้นหา"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="md"
        @click="searchQuery = ''"
      />
    </div>

    <!-- Table Container -->
    <div class="rounded-lg border border-default overflow-hidden bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="data?.placements || []"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <template #student-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-sm truncate">
                {{ row.original.student.prefix }}{{ row.original.student.firstName }} {{ row.original.student.lastName }}
              </div>
              <div class="text-xs text-muted  mt-0.5">
                {{ row.original.student.loginId }} · หมู่ {{ row.original.student.classGroup }}
              </div>
            </div>
          </template>

          <template #company-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-sm truncate">
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
            <div class="flex justify-end">
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

          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-building-2" class="size-8 mx-auto mb-2 text-muted" />
              <p class="font-medium text-highlighted">ยังไม่มีสถานประกอบการที่ยืนยันแล้วในรอบนี้</p>
              <p class="text-xs text-muted mt-1">
                เมื่อเจ้าหน้าที่ตรวจสอบเอกสารตอบรับและกดยืนยันสถานที่ฝึกงาน ข้อมูลจะปรากฏที่นี่
              </p>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Pagination Footer -->
      <div v-if="data && data.total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default text-xs text-muted">
        <div>
          แสดง {{ pageStart }} - {{ pageEnd }} จากทั้งหมด {{ data.total }} รายการ
        </div>

        <UPagination
          v-model:page="page"
          :total="data.total"
          :items-per-page="pageSize"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
