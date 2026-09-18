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
const students = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return data.value?.students ?? []

  return (data.value?.students ?? []).filter(item =>
    [item.studentId, item.name, item.companyName, item.position, item.groupName].join(' ').toLowerCase().includes(keyword)
  )
})

const columns: TableColumn<StudentRecord>[] = [
  { id: 'student', header: 'นักศึกษา' },
  { accessorKey: 'companyName', header: 'สถานประกอบการ' },
  { accessorKey: 'position', header: 'ตำแหน่งฝึกงาน' },
  { accessorKey: 'groupName', header: 'กลุ่มนิเทศ' }
]
</script>

<template>
  <UDashboardPanel id="teacher-students">
    <template #header>
      <UDashboardNavbar title="ข้อมูลการสมัครที่ฝึกงานของนักศึกษา">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UAlert v-if="error" color="error" title="ไม่สามารถโหลดข้อมูลได้" :description="error.message" />
        <UInput v-model="search" icon="i-lucide-search" placeholder="ค้นหารหัส ชื่อนักศึกษา บริษัท ตำแหน่ง หรือกลุ่มนิเทศ" class="sm:max-w-md" />
        <div class="overflow-hidden rounded-lg border border-default bg-default">
          <UTable :data="students" :columns="columns" :loading="status === 'pending'" :ui="{ root: 'overflow-x-auto', base: 'min-w-full' }">
            <template #student-cell="{ row }">
              <div>
                <p class="font-medium text-highlighted">{{ row.original.name }}</p>
                <p class="text-xs text-muted">{{ row.original.studentId }}<template v-if="row.original.phone"> · {{ row.original.phone }}</template></p>
              </div>
            </template>
            <template #position-cell="{ row }">{{ row.original.position || 'ไม่ระบุ' }}</template>
            <template #empty><div class="py-10 text-center text-muted">ยังไม่มีนักศึกษาในงานนิเทศของคุณ</div></template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
