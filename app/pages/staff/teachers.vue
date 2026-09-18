<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('staff'))
const notify = useNotify()
</script>

<template>
  <UDashboardPanel id="staff-teachers">
    <template #header>
      <UDashboardNavbar title="จัดการข้อมูลอาจารย์">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มอาจารย์"
            icon="i-lucide-plus"
            color="primary"
            @click="notify.info('เตรียมเปิดฟอร์มเพิ่มอาจารย์')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <span class="font-semibold">รายชื่ออาจารย์นิเทศ</span>
        </template>

        <div class="text-center py-10 text-muted">
          <UIcon name="i-lucide-user-round-check" class="size-12 mx-auto mb-2 text-dimmed" />
          <p>ข้อมูลอาจารย์นิเทศประจำภาคเรียน</p>
          <p class="text-xs mt-1">พร้อมรองรับการมอบหมายนักศึกษาในการนิเทศ</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
