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

const groupTeachersOptions = computed(() => {
  const g = groups.value.find(gr => gr.id === planForm.value.groupId)
  if (!g) return []
  return g.teachers.map(t => ({
    label: `${t.teacher.prefix || ''}${t.teacher.firstName || ''} ${t.teacher.lastName || ''} (${t.teacher.loginId})`.trim(),
    value: t.teacherUserId
  }))
})

// Precalculate in modal
const modalCalculations = computed(() => {
  const perDiem = planForm.value.travellers.reduce((s, t) => s + (Number(t.perDiemRate) || 0) * (Number(t.perDiemDays) || 0), 0)
  const lodging = planForm.value.travellers.reduce((s, t) => {
    const rate = Number(t.lodgingRate) || 0
    const nights = Number(t.nights) || 0
    const persons = Math.max(1, Number(t.personsPerRoom) || 1)
    return s + (rate * nights) / persons
  }, 0)
  return {
    perDiem: Math.round(perDiem * 100) / 100,
    lodging: Math.round(lodging * 100) / 100,
    total: Math.round((perDiem + lodging) * 100) / 100
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
  isModalOpen.value = true
}

const addTraveller = () => {
  const g = groups.value.find(gr => gr.id === planForm.value.groupId)
  const unusedTeacher = g?.teachers.find(
    t => !planForm.value.travellers.some(tr => tr.teacherUserId === t.teacherUserId)
  )
  planForm.value.travellers.push({
    teacherUserId: unusedTeacher?.teacherUserId,
    perDiemRate: 240,
    perDiemDays: 1,
    lodgingRate: 1500,
    nights: 0,
    personsPerRoom: 2
  })
}

const removeTraveller = (idx: number) => {
  planForm.value.travellers.splice(idx, 1)
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
      fuelRate: Number(planForm.value.fuelRate) || 4,
      note: planForm.value.note.trim() || undefined,
      travellers: planForm.value.travellers.map(t => ({
        teacherUserId: t.teacherUserId,
        perDiemRate: Math.max(0, Number(t.perDiemRate) || 0),
        perDiemDays: Math.max(0, Number(t.perDiemDays) || 0),
        lodgingRate: Math.max(0, Number(t.lodgingRate) || 0),
        nights: Math.max(0, Number(t.nights) || 0),
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
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-5 rounded-panel border border-divider bg-canvas shadow-panel">
          <div class="text-xs text-muted">แผนเดินทางทั้งหมด</div>
          <div class="text-2xl font-bold text-ink mt-1">
            {{ overallBudget.plansCount }} รายการ
          </div>
          <div class="text-xs text-muted mt-1">แยกตามวันและกลุ่มนิเทศ</div>
        </div>

        <div class="p-5 rounded-panel border border-divider bg-canvas shadow-panel">
          <div class="text-xs text-muted">ค่าเบี้ยเลี้ยง + ที่พัก</div>
          <div class="text-2xl font-bold text-ink mt-1">
            ฿{{ formatCurrency(overallBudget.totalPerDiem + overallBudget.totalLodging) }}
          </div>
          <div class="text-xs text-muted mt-1">
            เบี้ยเลี้ยง ฿{{ formatCurrency(overallBudget.totalPerDiem) }} · ที่พัก ฿{{ formatCurrency(overallBudget.totalLodging) }}
          </div>
        </div>

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
      :title="editingPlanId ? 'แก้ไขแผนเดินทาง & งบประมาณ' : 'สร้างแผนเดินทาง & งบประมาณใหม่'"
      size="xl"
    >
      <template #body>
        <div class="space-y-5">
          <!-- General Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="กลุ่มนิเทศ" required>
              <USelect
                v-model="planForm.groupId"
                :items="groupOptions"
                class="w-full"
                size="xl"
                :disabled="!!editingPlanId"
              />
            </UFormField>

            <UFormField label="วันที่เดินทาง" required>
              <UInput
                v-model="planForm.travelDate"
                type="date"
                class="w-full"
                size="xl"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="จุดเริ่มต้นเดินทาง">
              <UInput
                v-model="planForm.startLocation"
                placeholder="มหาวิทยาลัย"
                class="w-full"
                size="xl"
              />
            </UFormField>

            <UFormField label="อัตราค่าน้ำมัน (฿/กม.)" required>
              <UInput
                v-model.number="planForm.fuelRate"
                type="number"
                step="0.5"
                min="0"
                class="w-full"
                size="xl"
              />
            </UFormField>
          </div>

          <UFormField label="หมายเหตุเพิ่มเติม">
            <UInput
              v-model="planForm.note"
              placeholder="หมายเหตุหรือรายละเอียดเพิ่มเติมสำหรับแผนการเดินทาง"
              class="w-full"
              size="xl"
            />
          </UFormField>

          <!-- Travellers Section -->
          <div class="p-4 rounded-panel border border-divider bg-surface space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-ink text-sm flex items-center gap-1.5">
                <UIcon name="i-lucide-users" class="size-4 text-primary" />
                อาจารย์ผู้ร่วมเดินทางและอัตราประมาณการ ({{ planForm.travellers.length }} ท่าน)
              </h4>
              <UButton
                label="เพิ่มอาจารย์"
                icon="i-lucide-plus"
                color="neutral"
                variant="outline"
                size="xs"
                :disabled="!planForm.groupId || groupTeachersOptions.length === 0"
                @click="addTraveller"
              />
            </div>

            <div v-if="!planForm.groupId" class="text-muted italic text-xs">
              กรุณาเลือกกลุ่มนิเทศก่อน
            </div>
            <div v-else-if="groupTeachersOptions.length === 0" class="text-muted italic text-xs">
              ไม่พบอาจารย์ในกลุ่มนี้ กรุณามอบหมายอาจารย์ประจำกลุ่มก่อน
            </div>
            <div v-else-if="planForm.travellers.length === 0" class="text-muted italic text-xs">
              ยังไม่มีอาจารย์ผู้ร่วมเดินทาง คลิก "เพิ่มอาจารย์"
            </div>
            <div v-else class="space-y-2.5 max-h-64 overflow-y-auto">
              <div
                v-for="(tr, idx) in planForm.travellers"
                :key="idx"
                class="bg-canvas p-3 rounded-control border border-divider space-y-2.5"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-1">
                    <USelect
                      v-model="tr.teacherUserId"
                      :items="groupTeachersOptions"
                      placeholder="เลือกอาจารย์..."
                      class="flex-1"
                      size="md"
                    />
                  </div>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="ลบผู้เดินทาง"
                    @click="removeTraveller(idx)"
                  />
                </div>

                <!-- Compact numeric inputs as instructed in docs/fix-ui/01-staff.md -->
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <span class="text-muted block mb-0.5">เบี้ยเลี้ยง (฿/วัน)</span>
                    <UInput v-model.number="tr.perDiemRate" type="number" class="w-full font-mono" size="xs" />
                  </div>
                  <div>
                    <span class="text-muted block mb-0.5">จำนวนวัน</span>
                    <UInput v-model.number="tr.perDiemDays" type="number" class="w-full font-mono" size="xs" />
                  </div>
                  <div>
                    <span class="text-muted block mb-0.5">ค่าที่พัก/ห้อง/คืน</span>
                    <UInput v-model.number="tr.lodgingRate" type="number" class="w-full font-mono" size="xs" />
                  </div>
                  <div>
                    <span class="text-muted block mb-0.5">จำนวนคืน</span>
                    <UInput v-model.number="tr.nights" type="number" class="w-full font-mono" size="xs" />
                  </div>
                  <div>
                    <span class="text-muted block mb-0.5">คนต่อห้อง</span>
                    <UInput v-model.number="tr.personsPerRoom" type="number" min="1" class="w-full font-mono" size="xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Calculation Preview Card -->
          <div class="p-4 rounded-panel border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-0.5">
              <div class="text-sm font-semibold text-ink">ประมาณการงบประมาณแผนนี้</div>
              <div class="text-xs text-muted">
                เบี้ยเลี้ยง ฿{{ formatCurrency(modalCalculations.perDiem) }} · ที่พัก ฿{{ formatCurrency(modalCalculations.lodging) }}
              </div>
            </div>
            <div class="text-right font-mono">
              <div class="text-xs text-muted">ยอดรวมทั้งสิ้น</div>
              <div class="text-2xl font-bold text-primary">฿{{ formatCurrency(modalCalculations.total) }}</div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="ยกเลิก"
            color="neutral"
            variant="outline"
            size="xl"
            @click="isModalOpen = false"
          />
          <UButton
            :label="editingPlanId ? 'บันทึกการแก้ไข' : 'สร้างแผนเดินทาง'"
            color="primary"
            size="xl"
            :loading="isSaving"
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
