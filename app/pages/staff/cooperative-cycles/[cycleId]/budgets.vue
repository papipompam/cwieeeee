<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ref } from 'vue'

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
    header: 'ค่าน้ำมัน (฿)',
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'perDiem',
    header: 'เบี้ยเลี้ยง (฿)',
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'lodging',
    header: 'ที่พัก (฿)',
    meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } }
  },
  {
    id: 'total',
    header: 'รวมประมาณการ (฿)',
    meta: { class: { th: 'w-36 text-end font-semibold', td: 'w-36 text-end font-semibold' } }
  },
  {
    id: 'actions',
    header: 'จัดการ',
    meta: { class: { th: 'w-24 text-end', td: 'w-24 text-end' } }
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
  <div class="space-y-4">
    <!-- Header & Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-wallet-cards" class="size-5 text-primary" />
          งบประมาณและแผนการเดินทาง
        </h2>
        <p class="text-xs text-muted mt-0.5">
          ติดตามและจัดการงบประมาณการเดินทางของแต่ละกลุ่มนิเทศ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted">รอบนิเทศ:</span>
          <USelect
            v-model="selectedRoundId"
            :items="roundOptions"
            class="w-52"
            size="md"
            :disabled="rounds.length === 0"
          />
        </div>

        <UButton
          label="สร้างแผนเดินทาง"
          icon="i-lucide-plus"
          color="primary"
          size="md"
          :disabled="rounds.length === 0"
          @click="openCreatePlanModal"
        />

        <UIButtonRefresh
          :loading="fetchStatus === 'pending'"
          @refresh="refresh"
        />
      </div>
    </div>

    <!-- No rounds alert -->
    <div v-if="rounds.length === 0" class="p-4 rounded-lg bg-info/10 border border-info/30 text-info flex items-center gap-3">
      <UIcon name="i-lucide-info" class="size-5 shrink-0" />
      <div class="text-xs">
        <span class="font-semibold">ยังไม่มีรอบการนิเทศในรอบสหกิจนี้:</span>
        กรุณาสร้างรอบการนิเทศในแท็บ "รอบและกลุ่มนิเทศ" ก่อนเริ่มสร้างแผนเดินทาง
      </div>
    </div>

    <!-- Summary Statistics Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3.5 rounded-lg border border-default bg-default shadow-xs">
        <div class="text-xs text-muted">แผนเดินทางทั้งหมด</div>
        <div class="text-xl font-bold text-highlighted mt-1">
          {{ overallBudget.plansCount }} รายการ
        </div>
        <div class="text-[11px] text-muted mt-0.5">แยกตามวันและกลุ่มนิเทศ</div>
      </div>

      <div class="p-3.5 rounded-lg border border-default bg-default shadow-xs">
        <div class="text-xs text-muted">ค่าเบี้ยเลี้ยง + ที่พัก</div>
        <div class="text-xl font-bold text-highlighted mt-1">
          ฿{{ formatCurrency(overallBudget.totalPerDiem + overallBudget.totalLodging) }}
        </div>
        <div class="text-[11px] text-muted mt-0.5">
          เบี้ยเลี้ยง ฿{{ formatCurrency(overallBudget.totalPerDiem) }} · ที่พัก ฿{{ formatCurrency(overallBudget.totalLodging) }}
        </div>
      </div>

      <div class="p-3.5 rounded-lg border border-primary/30 bg-primary/5 shadow-xs">
        <div class="text-xs text-primary font-medium">รวมงบประมาณประมาณการ</div>
        <div class="text-xl font-extrabold text-primary mt-1">
          ฿{{ formatCurrency(overallBudget.grandTotal) }}
        </div>
        <div class="text-[11px] text-muted mt-0.5">คำนวณจากทุกแผนในรอบนี้</div>
      </div>
    </div>

    <!-- Toolbar: Search & Group Filter -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-muted/5 p-3 rounded-lg border border-default">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="ค้นหากลุ่มหรืออาจารย์ผู้เดินทาง..."
          class="w-72"
          size="md"
        />

        <USelect
          v-model="selectedGroupId"
          :items="groupFilterOptions"
          class="w-48"
          size="md"
        />

        <UButton
          v-if="searchQuery || selectedGroupId !== 'ALL'"
          label="ล้างตัวกรอง"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="md"
          @click="searchQuery = ''; selectedGroupId = 'ALL'"
        />
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
      <div class="overflow-x-auto">
        <UTable
          :data="travelPlans"
          :columns="columns"
          :loading="fetchStatus === 'pending'"
          class="min-w-full"
        >
          <!-- Travel Date -->
          <template #travelDate-cell="{ row }">
            <div>
              <div class="font-medium text-highlighted text-xs flex items-center gap-1.5">
                <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                {{ formatDate(row.original.travelDate) }}
              </div>
            </div>
          </template>

          <!-- Group & Details -->
          <template #group-cell="{ row }">
            <div>
              <div class="font-semibold text-xs text-highlighted">
                แผนเดินทาง {{ row.original.group?.name }}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-muted mt-0.5">
                <span>จุดเริ่มต้น: {{ row.original.startLocation || 'มหาวิทยาลัย' }}</span>
                <span>· ผู้เดินทาง {{ row.original.travellers.length }} คน</span>
                <span v-if="row.original.note" class="text-primary/90">· {{ row.original.note }}</span>
              </div>
            </div>
          </template>

          <!-- Fuel -->
          <template #fuel-cell="{ row }">
            <div class="text-right font-mono text-xs">
              {{ formatCurrency(row.original.calculation.fuelCost) }}
            </div>
          </template>

          <!-- Per Diem -->
          <template #perDiem-cell="{ row }">
            <div class="text-right font-mono text-xs">
              {{ formatCurrency(row.original.calculation.perDiemTotal) }}
            </div>
          </template>

          <!-- Lodging -->
          <template #lodging-cell="{ row }">
            <div class="text-right font-mono text-xs">
              {{ formatCurrency(row.original.calculation.lodgingTotal) }}
            </div>
          </template>

          <!-- Total -->
          <template #total-cell="{ row }">
            <div class="text-right font-mono text-xs font-bold text-primary">
              ฿{{ formatCurrency(row.original.calculation.totalEstimate) }}
            </div>
          </template>

          <!-- Actions -->
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UButton
                icon="i-lucide-edit-2"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="openEditPlanModal(row.original)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="confirmDeletePlan(row.original)"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template #empty>
            <div class="py-12 text-center text-muted">
              <UIcon name="i-lucide-wallet-cards" class="size-8 mx-auto mb-2 text-dimmed" />
              <p class="font-medium text-highlighted">ยังไม่มีแผนการเดินทางในเงื่อนไขที่เลือก</p>
              <p class="text-xs text-muted mt-1">
                คลิก "สร้างแผนเดินทาง" เพื่อคำนวณงบประมาณการออกนิเทศ
              </p>
            </div>
          </template>
        </UTable>
      </div>
    </div>

    <!-- Modal: Create / Edit Travel Plan -->
    <UModal
      v-model:open="isModalOpen"
      :title="editingPlanId ? 'แก้ไขแผนเดินทาง & งบประมาณ' : 'สร้างแผนเดินทาง & งบประมาณใหม่'"
      size="xl"
    >
      <template #body>
        <div class="space-y-5 text-xs">
          <!-- General Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-highlighted mb-1">กลุ่มนิเทศ *</label>
              <USelect
                v-model="planForm.groupId"
                :items="groupOptions"
                class="w-full"
                size="md"
                :disabled="!!editingPlanId"
              />
            </div>

            <div>
              <label class="block font-medium text-highlighted mb-1">วันที่เดินทาง *</label>
              <UInput
                v-model="planForm.travelDate"
                type="date"
                class="w-full"
                size="sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-highlighted mb-1">จุดเริ่มต้นเดินทาง</label>
              <UInput
                v-model="planForm.startLocation"
                placeholder="มหาวิทยาลัย"
                class="w-full"
                size="sm"
              />
            </div>

            <div>
              <label class="block font-medium text-highlighted mb-1">อัตราค่าน้ำมัน (฿/กม.) *</label>
              <UInput
                v-model.number="planForm.fuelRate"
                type="number"
                step="0.5"
                min="0"
                class="w-full"
                size="sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-highlighted mb-1">หมายเหตุเพิ่มเติม</label>
            <UInput
              v-model="planForm.note"
              placeholder="หมายเหตุหรือรายละเอียดเพิ่มเติมสำหรับแผนการเดินทาง"
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Travellers Section -->
          <div class="p-3 rounded-lg border border-default bg-muted/5 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-highlighted flex items-center gap-1.5">
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

            <div v-if="!planForm.groupId" class="text-muted italic text-[11px]">
              กรุณาเลือกกลุ่มนิเทศก่อน
            </div>
            <div v-else-if="groupTeachersOptions.length === 0" class="text-muted italic text-[11px]">
              ไม่พบอาจารย์ในกลุ่มนี้ กรุณามอบหมายอาจารย์ประจำกลุ่มก่อน
            </div>
            <div v-else-if="planForm.travellers.length === 0" class="text-muted italic text-[11px]">
              ยังไม่มีอาจารย์ผู้ร่วมเดินทาง คลิก "เพิ่มอาจารย์"
            </div>
            <div v-else class="space-y-2 max-h-56 overflow-y-auto">
              <div
                v-for="(tr, idx) in planForm.travellers"
                :key="idx"
                class="bg-default p-2.5 rounded border border-default space-y-2"
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

                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
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
          <div class="p-3.5 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-0.5">
              <div class="text-xs font-semibold text-highlighted">ประมาณการงบประมาณแผนนี้</div>
              <div class="text-[11px] text-muted">
                เบี้ยเลี้ยง ฿{{ formatCurrency(modalCalculations.perDiem) }} · ที่พัก ฿{{ formatCurrency(modalCalculations.lodging) }}
              </div>
            </div>
            <div class="text-right font-mono">
              <div class="text-[11px] text-muted">ยอดรวมทั้งสิ้น</div>
              <div class="text-xl font-bold text-primary">฿{{ formatCurrency(modalCalculations.total) }}</div>
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
            @click="isModalOpen = false"
          />
          <UButton
            :label="editingPlanId ? 'บันทึกการแก้ไข' : 'สร้างแผนเดินทาง'"
            color="primary"
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
