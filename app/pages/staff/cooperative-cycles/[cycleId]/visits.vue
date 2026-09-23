<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type AppointmentStatus = 'DRAFT' | 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'
type AppointmentPeriod = 'MORNING' | 'AFTERNOON' | 'FULL_DAY'

interface AppointmentPerson { id: number; prefix: string | null; firstName: string | null; lastName: string | null }
interface SupervisionAppointmentRow {
  id: number
  scheduledDate: string
  period: AppointmentPeriod
  status: AppointmentStatus
  timeNote: string | null
  changeReason: string | null
  cancelReason: string | null
  companyName: string
  province: string | null
  group: { id: number; name: string }
  students: AppointmentPerson[]
  teachers: AppointmentPerson[]
}
interface AppointmentsResponse { appointments: SupervisionAppointmentRow[]; total: number; page: number; pageSize: number; totalPages: number }
interface SupervisionRound { id: number; roundNo: number; title: string }
interface SupervisionGroup { id: number; name: string }

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const searchQuery = ref('')
const selectedRoundId = ref<number>()
const selectedGroupId = ref('ALL')
const selectedStatus = ref('ALL')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

const { data: roundsData } = await useFetch<{ rounds: SupervisionRound[] }>(() => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`)
const rounds = computed(() => roundsData.value?.rounds || [])
watch(rounds, (items) => {
  if (items.length && !items.some(item => item.id === selectedRoundId.value)) selectedRoundId.value = items[0]?.id
}, { immediate: true })
const roundOptions = computed(() => rounds.value.map(round => ({ label: `ครั้งที่ ${round.roundNo}: ${round.title}`, value: round.id })))

const { data: groupsData } = await useFetch<{ groups: SupervisionGroup[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/groups`,
  { watch: [selectedRoundId] }
)
const groups = computed(() => groupsData.value?.groups || [])
const groupFilterOptions = computed(() => [{ label: 'ทุกกลุ่ม', value: 'ALL' }, ...groups.value.map(group => ({ label: group.name, value: String(group.id) }))])
const statusFilterOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'ฉบับร่าง', value: 'DRAFT' },
  { label: 'เผยแพร่แล้ว', value: 'PUBLISHED' },
  { label: 'เลื่อนกำหนดการ', value: 'RESCHEDULED' },
  { label: 'ประเมินเสร็จแล้ว', value: 'COMPLETED' },
  { label: 'ยกเลิกแล้ว', value: 'CANCELLED' }
]

const { data, status: fetchStatus, refresh } = await useFetch<AppointmentsResponse>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/appointments`,
  {
    query: computed(() => ({
      groupId: selectedGroupId.value === 'ALL' ? undefined : Number(selectedGroupId.value),
      status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
      search: searchQuery.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })),
    watch: [selectedRoundId, selectedGroupId, selectedStatus, page, searchQuery, pageSize]
  }
)
watch([searchQuery, selectedGroupId, selectedStatus, selectedRoundId, pageSize], () => { page.value = 1 })

const hasFilters = computed(() => Boolean(searchQuery.value) || selectedGroupId.value !== 'ALL' || selectedStatus.value !== 'ALL')

const appointments = computed(() => data.value?.appointments || [])
const periodMap: Record<AppointmentPeriod, string> = { MORNING: 'ช่วงเช้า', AFTERNOON: 'ช่วงบ่าย', FULL_DAY: 'เต็มวัน' }
const statusMap: Record<AppointmentStatus, { label: string; color: 'success' | 'warning' | 'info' | 'error' }> = {
  DRAFT: { label: 'ฉบับร่าง', color: 'warning' },
  PUBLISHED: { label: 'เผยแพร่แล้ว', color: 'success' },
  RESCHEDULED: { label: 'เลื่อนกำหนดการ', color: 'warning' },
  COMPLETED: { label: 'ประเมินเสร็จแล้ว', color: 'info' },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'error' }
}
const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
const personName = (person: AppointmentPerson) => `${person.prefix || ''}${person.firstName || ''} ${person.lastName || ''}`.trim()
const clearFilters = () => { searchQuery.value = ''; selectedGroupId.value = 'ALL'; selectedStatus.value = 'ALL'; page.value = 1 }
const columns: TableColumn<SupervisionAppointmentRow>[] = [
  { id: 'scheduledDate', header: 'วันและเวลานิเทศ', meta: { class: { th: 'w-40', td: 'w-40' } } },
  { id: 'group', header: 'กลุ่มนิเทศ', meta: { class: { th: 'w-36', td: 'w-36' } } },
  { id: 'company', header: 'สถานประกอบการ' },
  { id: 'participants', header: 'นักศึกษาและอาจารย์', meta: { class: { th: 'w-60', td: 'w-60' } } },
  { id: 'status', header: 'สถานะ', meta: { class: { th: 'w-36', td: 'w-36' } } }
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
    <UAlert v-if="rounds.length === 0" color="info" variant="subtle" icon="i-lucide-info" title="ยังไม่มีรอบนิเทศ" description="สร้างรอบและจัดกลุ่มพร้อมกำหนดการนิเทศจากหน้า “จัดกลุ่มและมอบหมายอาจารย์นิเทศ” ก่อน" />

    <UCard v-else :ui="{ body: 'p-0' }">
      <!-- Header info and controls -->
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-ink flex items-center gap-2">
              <UIcon name="i-lucide-calendar-days" class="size-5 text-primary" />
              ตารางนิเทศสหกิจศึกษา
            </h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              แสดงกำหนดการที่บันทึกจากหน้าจัดกลุ่มนิเทศ เพื่อใช้ติดตามข้อมูลและสถานะ
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
            <USelect
              v-model="selectedRoundId"
              :items="roundOptions"
              class="w-56"
              size="xl"
              :disabled="rounds.length === 0"
            />
            <UIButtonRefresh
              :loading="fetchStatus === 'pending'"
              @refresh="refresh"
            />
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <UFormField label="ค้นหาตารางนิเทศ" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
            <UInput
              v-model="searchQuery"
              type="search"
              size="xl"
              icon="i-lucide-search"
              class="w-full"
              placeholder="ค้นหาสถานประกอบการ อาจารย์ หรือนักศึกษา..."
              aria-label="ค้นหาตารางนิเทศ"
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-44">
              <USelect
                v-model="selectedGroupId"
                :items="groupFilterOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="กลุ่มนิเทศ"
                aria-label="กรองตามกลุ่มนิเทศ"
              />
            </div>
            <div class="w-full sm:w-44">
              <USelect
                v-model="selectedStatus"
                :items="statusFilterOptions"
                value-key="value"
                class="w-full"
                size="xl"
                placeholder="สถานะ"
                aria-label="กรองตามสถานะ"
              />
            </div>
          </div>
        </div>

        <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            คำค้น “{{ searchQuery }}”
          </span>
          <span v-if="selectedGroupId !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            {{ groupFilterOptions.find(o => o.value === selectedGroupId)?.label }}
          </span>
          <span v-if="selectedStatus !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
            {{ statusFilterOptions.find(o => o.value === selectedStatus)?.label }}
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="clearFilters"
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
      <div v-else-if="!appointments.length" class="p-5 sm:p-6">
        <UEmpty
          icon="i-lucide-calendar-days"
          class="min-h-64"
          :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีตารางนิเทศในเงื่อนไขที่เลือก'"
          :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองกลุ่มนิเทศ' : 'กำหนดการจะถูกสร้างเมื่อบันทึกกลุ่มนิเทศ'"
        >
          <template #actions>
            <UButton
              v-if="hasFilters"
              size="xl"
              color="neutral"
              variant="outline"
              @click="clearFilters"
            >
              ล้างตัวกรอง
            </UButton>
          </template>
        </UEmpty>
      </div>

      <!-- Table -->
      <template v-else>
        <div class="w-full overflow-x-auto">
          <UTable
            :data="appointments"
            :columns="columns"
            class="min-w-full"
            :ui="{ base: 'w-full min-w-200' }"
          >
            <template #scheduledDate-cell="{ row }">
              <div class="text-sm">
                <div class="font-medium text-ink">{{ formatDate(row.original.scheduledDate) }}</div>
                <div class="mt-0.5 text-xs text-muted">{{ periodMap[row.original.period] }}</div>
                <div v-if="row.original.timeNote" class="mt-1 text-xs text-muted">{{ row.original.timeNote }}</div>
              </div>
            </template>

            <template #group-cell="{ row }">
              <span class="text-sm font-medium text-ink">{{ row.original.group.name }}</span>
            </template>

            <template #company-cell="{ row }">
              <div class="text-sm">
                <div class="font-semibold text-ink">{{ row.original.companyName }}</div>
                <div class="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <UIcon name="i-lucide-map-pin" class="size-3.5" />
                  {{ row.original.province || 'ไม่ระบุจังหวัด' }}
                </div>
                <div v-if="row.original.changeReason" class="mt-1 text-xs text-warning">
                  เหตุผลที่เลื่อน: {{ row.original.changeReason }}
                </div>
                <div v-if="row.original.cancelReason" class="mt-1 text-xs text-error">
                  เหตุผลที่ยกเลิก: {{ row.original.cancelReason }}
                </div>
              </div>
            </template>

            <template #participants-cell="{ row }">
              <div class="space-y-1 text-sm">
                <div>
                  <span class="font-medium text-ink">นักศึกษา:</span>
                  <span class="text-xs text-muted ml-1">{{ row.original.students.map(personName).join(', ') || '—' }}</span>
                </div>
                <div>
                  <span class="font-medium text-ink">อาจารย์:</span>
                  <span class="text-xs text-muted ml-1">{{ row.original.teachers.map(personName).join(', ') || '—' }}</span>
                </div>
              </div>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :label="statusMap[row.original.status]?.label || row.original.status"
                :color="statusMap[row.original.status]?.color || 'info'"
                variant="subtle"
              />
            </template>
          </UTable>
        </div>

        <!-- Footer -->
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <p class="whitespace-nowrap text-muted">
              แสดง {{ pageStart }}–{{ pageEnd }} จากทั้งหมด {{ data?.total ?? 0 }} รายการ
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
            v-if="data && data.total > 0"
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
