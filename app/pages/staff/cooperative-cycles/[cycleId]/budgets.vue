<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, type Ref } from 'vue'

interface TravelTraveller {
  id?: number
  teacherUserId: number
  teacher?: {
    id: number
    loginId: string
    prefix: string | null
    firstName: string | null
    lastName: string | null
  }
  teacherName?: string
  perDiemRate: number
  perDiemDays: number
  lodgingRate: number
  nights: number
  personsPerRoom: number
}

interface TravelPlanRow {
  id: number
  supervisionRoundId: number
  supervisionGroupId: number
  travelDate: string
  startLocation: string
  fuelRate: number
  manualFuelCost: number | null
  manualPerDiemCost: number | null
  manualLodgingCost: number | null
  note: string | null
  travellersCount: number
  group: {
    id: number
    name: string
  }
  travellers: TravelTraveller[]
  calculation: {
    totalDistanceKm: number
    fuelCost: number
    perDiemTotal: number
    lodgingTotal: number
    totalEstimate: number
  }
}

interface SupervisionRound {
  id: number
  roundNo: number
  title: string
}

interface SupervisionGroup {
  id: number
  name: string
  teachers: Array<{
    id: number
    teacherUserId: number
    teacher: { id: number; prefix: string | null; firstName: string | null; lastName: string | null; loginId: string }
  }>
}

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const cycle = inject<Ref<any>>('currentCycle')
const notify = useNotify()

const searchQuery = ref('')
const selectedRoundId = ref<number | undefined>(undefined)
const selectedGroupId = ref<string>('ALL')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

// Fetch Rounds
const { data: roundsData } = await useFetch<{ rounds: SupervisionRound[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds`
)
const rounds = computed(() => roundsData.value?.rounds || [])

watch(rounds, (newRounds) => {
  if (newRounds.length > 0 && (!selectedRoundId.value || !newRounds.some(r => r.id === selectedRoundId.value))) {
    selectedRoundId.value = newRounds[0]?.id
  }
}, { immediate: true })

const roundOptions = computed(() => {
  return rounds.value.map(r => ({
    label: `ครั้งที่ ${r.roundNo}: ${r.title}`,
    value: r.id
  }))
})

// Fetch Groups for active round
const { data: groupsData } = await useFetch<{ groups: SupervisionGroup[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/groups`,
  { watch: [selectedRoundId] }
)
const groups = computed<SupervisionGroup[]>(() => groupsData.value?.groups || [])

const groupOptions = computed(() => groups.value.map(g => ({ label: g.name, value: g.id })))

const groupFilterOptions = computed(() => [
  { label: 'ทุกกลุ่ม', value: 'ALL' },
  ...groups.value.map(g => ({ label: g.name, value: String(g.id) }))
])

// Fetch Travel Plans
const { data, status: fetchStatus, refresh } = await useFetch<{ travelPlans: TravelPlanRow[] }>(
  () => `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value || 0}/travel-plans`,
  {
    query: computed(() => ({
      groupId: selectedGroupId.value !== 'ALL' ? Number(selectedGroupId.value) : undefined
    })),
    watch: [selectedRoundId, selectedGroupId]
  }
)

const travelPlans = computed(() => {
  let list = data.value?.travelPlans || []
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      (p.group?.name && p.group.name.toLowerCase().includes(q)) ||
      (p.note && p.note.toLowerCase().includes(q)) ||
      (p.startLocation && p.startLocation.toLowerCase().includes(q)) ||
      p.travellers.some(t => {
        const name = `${t.teacher?.prefix || ''}${t.teacher?.firstName || ''} ${t.teacher?.lastName || ''}`.trim()
        return name.toLowerCase().includes(q)
      })
    )
  }
  return list
})

const hasFilters = computed(() => Boolean(searchQuery.value.trim()) || selectedGroupId.value !== 'ALL')
const clearFilters = () => {
  searchQuery.value = ''
  selectedGroupId.value = 'ALL'
  page.value = 1
}

watch([searchQuery, selectedGroupId, selectedRoundId, pageSize], () => {
  page.value = 1
})

const paginatedTravelPlans = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return travelPlans.value.slice(start, start + pageSize.value)
})

const pageStart = computed(() => {
  if (travelPlans.value.length === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const pageEnd = computed(() => {
  return Math.min(page.value * pageSize.value, travelPlans.value.length)
})

// Summary of all travel plans
const overallBudget = computed(() => {
  const plans = travelPlans.value
  return {
    plansCount: plans.length,
    totalDistanceKm: plans.reduce((s, p) => s + (p.calculation?.totalDistanceKm || 0), 0),
    totalFuel: plans.reduce((s, p) => s + (p.calculation?.fuelCost || 0), 0),
    totalPerDiem: plans.reduce((s, p) => s + (p.calculation?.perDiemTotal || 0), 0),
    totalLodging: plans.reduce((s, p) => s + (p.calculation?.lodgingTotal || 0), 0),
    grandTotal: plans.reduce((s, p) => s + (p.calculation?.totalEstimate || 0), 0)
  }
})

// Formatters
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (val: number) => {
  return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Columns
const columns: TableColumn<TravelPlanRow>[] = [
  {
    id: 'travelDate',
    header: 'วันที่เดินทาง',
    meta: { class: { th: 'w-36', td: 'w-36' } }
  },
  {
    id: 'group',
    header: 'กลุ่มนิเทศ / รายละเอียด'
  },
  {
    id: 'fuel',
    header: () => h('span', { class: 'block text-right' }, 'ค่าน้ำมัน (฿)'),
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'perDiem',
    header: () => h('span', { class: 'block text-right' }, 'เบี้ยเลี้ยง (฿)'),
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'lodging',
    header: () => h('span', { class: 'block text-right' }, 'ที่พัก (฿)'),
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'total',
    header: () => h('span', { class: 'block text-right' }, 'รวมประมาณการ (฿)'),
    meta: { class: { th: 'w-36 text-end font-semibold', td: 'w-36 text-end font-semibold' } }
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'block text-right' }, 'จัดการ'),
    meta: { class: { th: 'w-36 text-end', td: 'w-36 text-end' } }
  }
]

// Modal: Create / Edit Travel Plan
const isModalOpen = ref(false)
const editingPlanId = ref<number | null>(null)
const isSaving = ref(false)
const expenseForm = ref({ manualFuelCost: 0, manualPerDiemCost: 0, manualLodgingCost: 0 })

const planForm = ref<{
  groupId: number | undefined
  travelDate: string
  startLocation: string
  fuelRate: number
  note: string
  travellers: Array<{
    teacherUserId: number | undefined
    perDiemRate: number
    perDiemDays: number
    lodgingRate: number
    nights: number
    personsPerRoom: number
  }>
}>({
  groupId: undefined,
  travelDate: '',
  startLocation: 'มหาวิทยาลัย',
  fuelRate: 4,
  note: '',
  travellers: []
})

// Precalculate in modal
const modalCalculations = computed(() => {
  const perDiem = Number(expenseForm.value.manualPerDiemCost) || 0
  const lodging = Number(expenseForm.value.manualLodgingCost) || 0
  const travel = Number(expenseForm.value.manualFuelCost) || 0
  return {
    travel: Math.round(travel * 100) / 100,
    perDiem: Math.round(perDiem * 100) / 100,
    lodging: Math.round(lodging * 100) / 100,
    total: Math.round((travel + perDiem + lodging) * 100) / 100
  }
})

// When group changes in modal, populate its teachers.
watch(() => planForm.value.groupId, (newGroupId, oldGroupId) => {
  if (newGroupId !== oldGroupId && !editingPlanId.value) {
    const g = groups.value.find(gr => gr.id === newGroupId)
    if (g) {
      planForm.value.travellers = g.teachers.map(t => ({
        teacherUserId: t.teacherUserId,
        perDiemRate: 240,
        perDiemDays: 1,
        lodgingRate: 1500,
        nights: 0,
        personsPerRoom: 2
      }))
    } else {
      planForm.value.travellers = []
    }
  }
})

const openCreatePlanModal = () => {
  editingPlanId.value = null
  const defaultGroupId = groups.value[0]?.id
  const g = groups.value[0]
  const defaultTeachers = g?.teachers.map(t => ({
    teacherUserId: t.teacherUserId,
    perDiemRate: 240,
    perDiemDays: 1,
    lodgingRate: 1500,
    nights: 0,
    personsPerRoom: 2
  })) || []

  planForm.value = {
    groupId: defaultGroupId,
    travelDate: new Date().toISOString().split('T')[0] ?? '',
    startLocation: 'มหาวิทยาลัย',
    fuelRate: 4,
    note: '',
    travellers: defaultTeachers
  }
  expenseForm.value = { manualFuelCost: 0, manualPerDiemCost: defaultTeachers.length * 240, manualLodgingCost: 0 }
  isModalOpen.value = true
}

const openEditPlanModal = (plan: TravelPlanRow) => {
  editingPlanId.value = plan.id
  planForm.value = {
    groupId: plan.supervisionGroupId || plan.group?.id,
    travelDate: plan.travelDate ? (plan.travelDate.split('T')[0] ?? '') : '',
    startLocation: plan.startLocation || 'มหาวิทยาลัย',
    fuelRate: plan.fuelRate ?? 4,
    note: plan.note || '',
    travellers: plan.travellers.map(t => ({
      teacherUserId: t.teacherUserId,
      perDiemRate: t.perDiemRate,
      perDiemDays: t.perDiemDays,
      lodgingRate: t.lodgingRate,
      nights: t.nights,
      personsPerRoom: t.personsPerRoom
    }))
  }
  expenseForm.value = {
    manualFuelCost: plan.manualFuelCost ?? plan.calculation.fuelCost,
    manualPerDiemCost: plan.manualPerDiemCost ?? plan.calculation.perDiemTotal,
    manualLodgingCost: plan.manualLodgingCost ?? plan.calculation.lodgingTotal
  }
  isModalOpen.value = true
}

const handleSavePlan = async () => {
  if (!planForm.value.groupId) {
    notify.warning('กรุณาเลือกกลุ่มนิเทศ')
    return
  }
  if (!planForm.value.travelDate) {
    notify.warning('กรุณาระบุวันที่เดินทาง')
    return
  }
  if (!selectedRoundId.value) return

  // Check travellers
  if (planForm.value.travellers.some(t => !t.teacherUserId)) {
    notify.warning('กรุณาเลือกอาจารย์ผู้ร่วมเดินทางให้ครบทุกคน')
    return
  }
  const teacherUserIds = planForm.value.travellers.map(t => t.teacherUserId)
  if (new Set(teacherUserIds).size !== teacherUserIds.length) {
    notify.warning('พบอาจารย์ซ้ำในรายชื่อผู้ร่วมเดินทาง')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      groupId: planForm.value.groupId,
      travelDate: planForm.value.travelDate,
      startLocation: planForm.value.startLocation || 'มหาวิทยาลัย',
      fuelRate: 4,
      manualFuelCost: Math.max(0, Number(expenseForm.value.manualFuelCost) || 0),
      manualPerDiemCost: Math.max(0, Number(expenseForm.value.manualPerDiemCost) || 0),
      manualLodgingCost: Math.max(0, Number(expenseForm.value.manualLodgingCost) || 0),
      note: planForm.value.note.trim() || undefined,
      travellers: planForm.value.travellers.map(t => ({
        teacherUserId: t.teacherUserId,
        perDiemRate: 240,
        perDiemDays: 1,
        lodgingRate: 0,
        nights: 0,
        personsPerRoom: Math.max(1, Number(t.personsPerRoom) || 1)
      }))
    }

    if (editingPlanId.value) {
      await $fetch(
        `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/travel-plans/${editingPlanId.value}`,
        {
          method: 'PATCH',
          body: payload
        }
      )
      notify.success('อัปเดตแผนเดินทางสำเร็จ')
    } else {
      await $fetch(
        `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/travel-plans`,
        {
          method: 'POST',
          body: payload
        }
      )
      notify.success('สร้างแผนเดินทางสำเร็จ')
    }
    isModalOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถบันทึกแผนเดินทางได้')
  } finally {
    isSaving.value = false
  }
}

// Delete Plan Modal
const isDeleteOpen = ref(false)
const planToDelete = ref<TravelPlanRow | null>(null)
const isDeleting = ref(false)

const confirmDeletePlan = (plan: TravelPlanRow) => {
  planToDelete.value = plan
  isDeleteOpen.value = true
}

const handleDeletePlan = async () => {
  if (!planToDelete.value || !selectedRoundId.value) return
  isDeleting.value = true
  try {
    await $fetch(
      `/api/staff/cooperative-cycles/${cycleId.value}/supervision/rounds/${selectedRoundId.value}/travel-plans/${planToDelete.value.id}`,
      { method: 'DELETE' }
    )
    notify.success('ลบแผนเดินทางเรียบร้อยแล้ว')
    isDeleteOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถลบแผนเดินทางได้')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-6">
    <!-- No rounds alert -->
    <UAlert
      v-if="rounds.length === 0"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="ยังไม่มีรอบการนิเทศในรอบสหกิจนี้"
      description="กรุณาสร้างรอบการนิเทศในแท็บ &quot;รอบและกลุ่มนิเทศ&quot; ก่อนเริ่มสร้างแผนเดินทาง"
    />

    <template v-else>
      <!-- Summary Statistics Grid -->
      <div class="grid grid-cols-1 gap-4">
        <div class="p-5 rounded-panel border border-primary/30 bg-primary/5 shadow-panel">
          <div class="text-xs text-primary font-medium">รวมงบประมาณประมาณการ</div>
          <div class="text-2xl font-extrabold text-primary mt-1">
            ฿{{ formatCurrency(overallBudget.grandTotal) }}
          </div>
          <div class="text-xs text-muted mt-1">คำนวณจากทุกแผนในรอบนี้</div>
        </div>
      </div>

      <!-- Data Table Card Container -->
      <UCard :ui="{ body: 'p-0' }">
        <!-- Card Header -->
        <div class="border-b border-divider p-5 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-bold text-ink flex items-center gap-2">
                <UIcon name="i-lucide-wallet-cards" class="size-5 text-primary" />
                งบประมาณและแผนการเดินทาง
              </h3>
              <p class="mt-1 text-sm leading-6 text-muted">
                ติดตามและจัดการงบประมาณการเดินทางของแต่ละกลุ่มนิเทศ
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

              <UButton
                label="สร้างแผนเดินทาง"
                icon="i-lucide-plus"
                color="primary"
                size="xl"
                :disabled="rounds.length === 0"
                @click="openCreatePlanModal"
              />

              <UIButtonRefresh
                :loading="fetchStatus === 'pending'"
                @refresh="refresh"
              />
            </div>
          </div>

          <!-- Control Row -->
          <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <UFormField label="ค้นหาแผนเดินทาง" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
              <UInput
                v-model="searchQuery"
                type="search"
                size="xl"
                icon="i-lucide-search"
                class="w-full"
                placeholder="ค้นหากลุ่มหรืออาจารย์ผู้เดินทาง..."
                aria-label="ค้นหาแผนเดินทาง"
              />
            </UFormField>

            <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
              <div class="w-full sm:w-56">
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
            </div>
          </div>

          <!-- Active Filter Chips -->
          <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-muted">ตัวกรองที่ใช้:</span>
            <span v-if="searchQuery" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
              คำค้น “{{ searchQuery }}”
            </span>
            <span v-if="selectedGroupId !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
              {{ groupFilterOptions.find(o => o.value === selectedGroupId)?.label }}
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              label="ล้างตัวกรอง"
              @click="clearFilters"
            />
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="fetchStatus === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
          <div v-for="row in 4" :key="row" class="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 max-md:grid-cols-[1fr_7rem]">
            <USkeleton class="h-10" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10 max-md:hidden" />
            <USkeleton class="h-10" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!travelPlans.length" class="p-5 sm:p-6">
          <UEmpty
            icon="i-lucide-wallet-cards"
            class="min-h-64"
            :title="hasFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีแผนการเดินทางในเงื่อนไขที่เลือก'"
            :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองกลุ่มนิเทศ' : 'คลิก &quot;สร้างแผนเดินทาง&quot; เพื่อคำนวณงบประมาณการออกนิเทศ'"
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
              :data="paginatedTravelPlans"
              :columns="columns"
              class="min-w-full"
              :ui="{ base: 'w-full min-w-200' }"
            >
              <!-- Travel Date -->
              <template #travelDate-cell="{ row }">
                <div>
                  <div class="font-medium text-ink text-sm flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                    {{ formatDate(row.original.travelDate) }}
                  </div>
                </div>
              </template>

              <!-- Group & Details -->
              <template #group-cell="{ row }">
                <div>
                  <div class="font-semibold text-sm text-ink">
                    แผนเดินทาง {{ row.original.group?.name }}
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted mt-0.5">
                    <span>จุดเริ่มต้น: {{ row.original.startLocation || 'มหาวิทยาลัย' }}</span>
                    <span>· ผู้เดินทาง {{ row.original.travellers.length }} คน</span>
                    <span v-if="row.original.note" class="text-primary/90">· {{ row.original.note }}</span>
                  </div>
                </div>
              </template>

              <!-- Fuel -->
              <template #fuel-cell="{ row }">
                <div class="text-right font-mono text-sm">
                  {{ formatCurrency(row.original.calculation.fuelCost) }}
                </div>
              </template>

              <!-- Per Diem -->
              <template #perDiem-cell="{ row }">
                <div class="text-right font-mono text-sm">
                  {{ formatCurrency(row.original.calculation.perDiemTotal) }}
                </div>
              </template>

              <!-- Lodging -->
              <template #lodging-cell="{ row }">
                <div class="text-right font-mono text-sm">
                  {{ formatCurrency(row.original.calculation.lodgingTotal) }}
                </div>
              </template>

              <!-- Total -->
              <template #total-cell="{ row }">
                <div class="text-right font-mono text-sm font-bold text-primary">
                  ฿{{ formatCurrency(row.original.calculation.totalEstimate) }}
                </div>
              </template>

              <!-- Actions -->
              <template #actions-cell="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    label="แก้ไข"
                    icon="i-lucide-edit-2"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openEditPlanModal(row.original)"
                  />
                  <UButton
                    label="ลบ"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="confirmDeletePlan(row.original)"
                  />
                </div>
              </template>
            </UTable>
          </div>

          <!-- Footer -->
          <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex flex-wrap items-center gap-3">
              <p class="whitespace-nowrap text-muted">
                แสดง {{ pageStart }}–{{ pageEnd }} จากทั้งหมด {{ travelPlans.length }} รายการ
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
              v-if="travelPlans.length > 0"
              v-model:page="page"
              :total="travelPlans.length"
              :items-per-page="pageSize"
              size="md"
            />
          </div>
        </template>
      </UCard>
    </template>

    <!-- Modal: Create / Edit Travel Plan -->
    <UModal
      v-model:open="isModalOpen"
      :title="editingPlanId ? 'แก้ไขงบประมาณ' : 'สร้างแผนเดินทาง & งบประมาณใหม่'"
      size="xl"
      :ui="{ content: 'w-[calc(100vw-2rem)] max-w-2xl rounded-panel border border-divider bg-canvas shadow-panel' }"
    >
      <template #body>
        <div class="space-y-5 p-1 sm:p-2">
          <!-- General Details -->
          <div class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <UFormField label="กลุ่มนิเทศ" required>
              <USelect
                v-model="planForm.groupId"
                :items="groupOptions"
                class="h-11 w-full rounded-control"
                size="xl"
                :disabled="!!editingPlanId"
              />
            </UFormField>

            <UFormField label="วันที่เดินทาง" required>
              <UInput
                v-model="planForm.travelDate"
                type="date"
                class="h-11 w-full rounded-control"
                size="xl"
              />
            </UFormField>
          </div>

          <section class="rounded-panel border border-divider bg-canvas p-5">
            <div>
              <h4 class="text-lg font-bold text-ink">ค่าใช้จ่ายการนิเทศ</h4>
              <p class="mt-1 text-sm text-muted">กรอกยอดค่าใช้จ่ายตามจริง และแก้ไขย้อนหลังได้</p>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <UFormField label="ค่าน้ำมัน (บาท)">
                <UInput v-model.number="expenseForm.manualFuelCost" type="number" min="0" class="h-11 w-full rounded-control" size="xl" />
              </UFormField>
              <UFormField label="เบี้ยเลี้ยง (บาท)">
                <UInput v-model.number="expenseForm.manualPerDiemCost" type="number" min="0" class="h-11 w-full rounded-control" size="xl" />
              </UFormField>
              <UFormField label="ค่าที่พัก (บาท)">
                <UInput v-model.number="expenseForm.manualLodgingCost" type="number" min="0" class="h-11 w-full rounded-control" size="xl" />
              </UFormField>
            </div>

            <div class="mt-4 space-y-2 rounded-control bg-surface p-4">
              <div class="flex items-center justify-between gap-4 text-sm text-ink">
                <span>ค่าน้ำมัน (กรอกเอง)</span>
                <span class="shrink-0 font-semibold">{{ formatCurrency(modalCalculations.travel) }} บาท</span>
              </div>
              <div class="flex items-center justify-between gap-4 text-sm text-ink">
                <span>เบี้ยเลี้ยง (กรอกเอง)</span>
                <span class="shrink-0 font-semibold">{{ formatCurrency(modalCalculations.perDiem) }} บาท</span>
              </div>
              <div class="flex items-center justify-between gap-4 text-sm text-ink">
                <span>ค่าที่พัก (กรอกเอง)</span>
                <span class="shrink-0 font-semibold">{{ formatCurrency(modalCalculations.lodging) }} บาท</span>
              </div>
              <div class="mt-3 flex items-center justify-between gap-4 border-t border-divider pt-4 text-base font-bold text-ink">
                <span>รวมค่าใช้จ่าย</span>
                <span class="shrink-0 text-lg">{{ formatCurrency(modalCalculations.total) }} บาท</span>
              </div>
            </div>
          </section>

          <UFormField label="หมายเหตุเพิ่มเติม">
            <UInput
              v-model="planForm.note"
              placeholder="หมายเหตุหรือรายละเอียดเพิ่มเติมสำหรับแผนการเดินทาง"
              class="h-11 w-full rounded-control"
              size="xl"
            />
          </UFormField>

        </div>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-3 pt-1">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            size="xl"
            class="h-11 rounded-control"
            @click="isModalOpen = false"
          />
          <UButton
            :label="editingPlanId ? 'บันทึกการแก้ไข' : 'สร้างแผนเดินทาง'"
            color="primary"
            size="xl"
            :loading="isSaving"
            class="h-11 rounded-control"
            @click="handleSavePlan"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal: Confirm Delete Plan -->
    <UIConfirmModal
      :open="isDeleteOpen"
      title="ยืนยันการลบแผนการเดินทาง"
      :message="`คุณต้องการลบแผนเดินทางของกลุ่ม '${planToDelete?.group?.name}' หรือไม่?`"
      sub-message="งบประมาณประมาณการของแผนนี้จะถูกนำออกจากการคำนวณรวม"
      confirm-label="ยืนยันลบแผนเดินทาง"
      confirm-color="error"
      :loading="isDeleting"
      @update:open="isDeleteOpen = $event"
      @confirm="handleDeletePlan"
      @cancel="isDeleteOpen = false"
    />
  </div>
</template>
