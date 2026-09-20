<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'dashboard' })

interface StudentRecord {
  appointmentId: number
  studentId: string
  name: string
  phone: string | null
  cohortYear: number | null
  classGroup: number | null
  companyName: string
  position: string | null
  applicationStatus: string | null
  appliedAt: string | null
  groupName: string
}

const { data, status, error, refresh } = await useFetch<{ students: StudentRecord[] }>('/api/teacher/records')
const search = ref('')
const groupFilter = ref('ALL')
const selectedStudent = ref<StudentRecord | null>(null)
const detailOpen = ref(false)
const groupOptions = computed(() => [{ label: 'ทุกกลุ่มนิเทศ', value: 'ALL' }, ...Array.from(new Set((data.value?.students ?? []).map(student => student.groupName))).map(groupName => ({ label: groupName, value: groupName }))])
const students = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (data.value?.students ?? []).filter(item =>
    (!keyword || [item.studentId, item.name, item.companyName, item.position, item.groupName].join(' ').toLowerCase().includes(keyword))
    && (groupFilter.value === 'ALL' || item.groupName === groupFilter.value)
  )
})
const hasFilters = computed(() => Boolean(search.value) || groupFilter.value !== 'ALL')
const clearFilters = () => {
  search.value = ''
  groupFilter.value = 'ALL'
}
const openDetail = (student: StudentRecord) => { selectedStudent.value = student; detailOpen.value = true }

const columns: TableColumn<StudentRecord>[] = [
  { id: 'student', header: 'นักศึกษา' },
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { accessorKey: 'position', header: 'ตำแหน่งฝึกงาน' },
  { accessorKey: 'groupName', header: 'กลุ่มนิเทศ' },
  { id: 'actions', header: 'จัดการ', meta: { class: { th: 'w-28 text-end', td: 'w-28 text-end' } } }
]
</script>

<template>
  <UDashboardPanel id="teacher-students">
    <template #header>
      <AppDashboardNavbar title="ข้อมูลการสมัครที่ฝึกงานของนักศึกษา">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><AppNotificationBell /></template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดข้อมูลได้" :description="error.message" />

        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div>
              <h3 class="text-lg font-bold text-ink">ข้อมูลนักศึกษา</h3>
              <p class="mt-1 text-sm leading-6 text-muted">ข้อมูลนักศึกษาและสถานประกอบการที่ได้รับมอบหมายในงานนิเทศ</p>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <UInput
                v-model="search"
                type="search"
                size="xl"
                icon="i-lucide-search"
                placeholder="ค้นหารหัส ชื่อนักศึกษา บริษัท ตำแหน่ง หรือกลุ่มนิเทศ"
                class="w-full sm:max-w-md lg:w-96"
                aria-label="ค้นหานักศึกษา"
              />
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:ml-auto">
                <USelect
                  v-model="groupFilter"
                  :items="groupOptions"
                  value-key="value"
                  size="xl"
                  class="w-full sm:w-52"
                  aria-label="กรองตามกลุ่มนิเทศ"
                />
                <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
              </div>
            </div>

            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="search" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                คำค้น “{{ search }}”
              </span>
              <span v-if="groupFilter !== 'ALL'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">
                {{ groupOptions.find(o => o.value === groupFilter)?.label }}
              </span>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearFilters">
                ล้างทั้งหมด
              </UButton>
            </div>
          </div>

          <div v-if="status === 'pending'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
            <div v-for="row in 4" :key="row" class="grid grid-cols-[1.2fr_1fr_1fr_1fr_5rem] gap-4 max-md:grid-cols-[1fr_5rem]">
              <USkeleton class="h-10" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
            </div>
          </div>

          <div v-else-if="error" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-triangle-alert"
              title="ไม่สามารถโหลดข้อมูลได้"
              :description="error.message || 'เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง'"
              class="min-h-64"
            >
              <template #actions>
                <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="() => refresh()">
                  ลองอีกครั้ง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <div v-else-if="!students.length" class="p-5 sm:p-6">
            <UEmpty
              icon="i-lucide-users"
              :title="hasFilters ? 'ไม่พบข้อมูลนักศึกษาที่ตรงกับตัวกรอง' : 'ยังไม่มีนักศึกษาในงานนิเทศของคุณ'"
              :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'รายการจะแสดงเมื่อมีนักศึกษาที่ได้รับมอบหมายในงานนิเทศ'"
              class="min-h-64"
            >
              <template #actions>
                <UButton v-if="hasFilters" size="xl" color="neutral" variant="outline" @click="clearFilters">
                  ล้างตัวกรอง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <div v-else class="w-full overflow-x-auto">
            <UTable
              :data="students"
              :columns="columns"
              class="min-w-full"
              :ui="{ base: 'w-full min-w-180' }"
            >
              <template #student-cell="{ row }">
                <div>
                  <p class="font-medium text-ink">{{ row.original.name }}</p>
                  <p class="mt-0.5 text-xs text-muted">{{ row.original.studentId }}<template v-if="row.original.phone"> · {{ row.original.phone }}</template></p>
                </div>
              </template>
              <template #companyName-cell="{ row }">
                <p class="font-medium text-ink">{{ row.original.companyName }}</p>
              </template>
              <template #position-cell="{ row }">
                <span class="text-sm text-ink">{{ row.original.position || 'ไม่ระบุ' }}</span>
              </template>
              <template #groupName-cell="{ row }">
                <span class="text-sm text-ink">{{ row.original.groupName }}</span>
              </template>
              <template #actions-header>
                <span class="block text-right">จัดการ</span>
              </template>
              <template #actions-cell="{ row }">
                <div class="flex items-center justify-end">
                  <UButton
                    label="รายละเอียด"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-eye"
                    @click="openDetail(row.original)"
                  />
                </div>
              </template>
            </UTable>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="detailOpen" :title="selectedStudent ? `ข้อมูล ${selectedStudent.name}` : 'ข้อมูลนักศึกษา'">
    <template #body>
      <div v-if="selectedStudent" class="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p class="text-xs text-muted">รหัสนักศึกษา</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.studentId }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">โทรศัพท์</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.phone || 'ไม่ระบุ' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">สถานประกอบการ</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.companyName }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">ตำแหน่งฝึกงาน</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.position || 'ไม่ระบุ' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">กลุ่มนิเทศ</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.groupName }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">ชั้นปี / กลุ่มเรียน</p>
          <p class="mt-1 font-medium text-ink">{{ selectedStudent.cohortYear || 'ไม่ระบุ' }}<template v-if="selectedStudent.classGroup"> / {{ selectedStudent.classGroup }}</template></p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton size="xl" color="neutral" variant="ghost" @click="detailOpen = false">ปิด</UButton>
      </div>
    </template>
  </UModal>
</template>
