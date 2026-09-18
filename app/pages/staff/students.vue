<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('staff'))
const notify = useNotify()

const { data: students, status, error } = useFetch('/api/students')
</script>

<template>
  <UDashboardPanel id="staff-students">
    <template #header>
      <UDashboardNavbar title="จัดการข้อมูลนักศึกษา">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มนักศึกษา"
            icon="i-lucide-plus"
            color="primary"
            @click="notify.info('เตรียมเปิดฟอร์มเพิ่มนักศึกษา')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        title="เกิดข้อผิดพลาดในการโหลดข้อมูล"
        :description="error.message"
      />

      <UCard v-else>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">รายชื่อนักศึกษาในระบบ</span>
            <UBadge :label="`${students?.length || 0} คน`" color="neutral" variant="subtle" />
          </div>
        </template>

        <div v-if="status === 'pending'" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
          <span class="ml-2 text-muted">กำลังโหลด...</span>
        </div>

        <div v-else-if="!students?.length" class="text-center py-10 text-muted">
          <UIcon name="i-lucide-inbox" class="size-12 mx-auto mb-2 text-dimmed" />
          <p>ยังไม่มีข้อมูลนักศึกษาในฐานข้อมูล</p>
        </div>

        <ul v-else class="divide-y divide-default">
          <li v-for="s in students" :key="s.id" class="py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-full bg-elevated flex items-center justify-center text-sm font-medium">
                {{ s.firstName.charAt(0) }}
              </div>
              <div>
                <p class="font-medium text-highlighted">{{ s.firstName }} {{ s.lastName }}</p>
                <p class="text-xs text-muted">รหัสนักศึกษา: {{ s.studentId }}</p>
              </div>
            </div>
            <UBadge label="ปกติ" color="success" variant="subtle" />
          </li>
        </ul>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
