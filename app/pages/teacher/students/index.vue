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
      <UDashboardNavbar title="ข้อมูลการสมัครที่ฝึกงานของนักศึกษา"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดข้อมูลได้" :description="error.message" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหารหัส ชื่อนักศึกษา บริษัท ตำแหน่ง หรือกลุ่มนิเทศ" class="sm:max-w-md" /><div class="flex flex-col gap-3 sm:ml-auto sm:flex-row"><USelect v-model="groupFilter" :items="groupOptions" value-key="value" class="sm:w-48" aria-label="กรองตามกลุ่มนิเทศ" /><UIButtonRefresh class="self-start" :loading="status === 'pending'" @refresh="refresh" /></div></div>
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="students" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #student-cell="{ row }">
              <div>
                <p class="font-medium text-highlighted">{{ row.original.name }}</p>
                <p class="text-xs text-muted">{{ row.original.studentId }}<template v-if="row.original.phone"> · {{ row.original.phone }}</template></p>
              </div>
            </template>
            <template #position-cell="{ row }">{{ row.original.position || 'ไม่ระบุ' }}</template>
            <template #actions-cell="{ row }"><UButton label="รายละเอียด" color="neutral" variant="ghost" size="xs" @click="openDetail(row.original)" /></template>
            <template #empty><div class="py-10 text-center text-muted">ยังไม่มีนักศึกษาในงานนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="detailOpen" :title="selectedStudent ? `ข้อมูล ${selectedStudent.name}` : 'ข้อมูลนักศึกษา'">
    <template #body><div v-if="selectedStudent" class="grid gap-4 text-sm sm:grid-cols-2"><div><p class="text-muted">รหัสนักศึกษา</p><p class="font-medium text-highlighted">{{ selectedStudent.studentId }}</p></div><div><p class="text-muted">โทรศัพท์</p><p class="font-medium text-highlighted">{{ selectedStudent.phone || 'ไม่ระบุ' }}</p></div><div><p class="text-muted">สถานประกอบการ</p><p class="font-medium text-highlighted">{{ selectedStudent.companyName }}</p></div><div><p class="text-muted">ตำแหน่งฝึกงาน</p><p class="font-medium text-highlighted">{{ selectedStudent.position || 'ไม่ระบุ' }}</p></div><div><p class="text-muted">กลุ่มนิเทศ</p><p class="font-medium text-highlighted">{{ selectedStudent.groupName }}</p></div><div><p class="text-muted">ชั้นปี / กลุ่มเรียน</p><p class="font-medium text-highlighted">{{ selectedStudent.cohortYear || 'ไม่ระบุ' }}<template v-if="selectedStudent.classGroup"> / {{ selectedStudent.classGroup }}</template></p></div></div></template>
  </UModal>
</template>
