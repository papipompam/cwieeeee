<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('staff'))
const notify = useNotify()
</script>

<template>
  <UDashboardPanel id="staff-companies">
    <template #header>
      <UDashboardNavbar title="จัดการสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มสถานประกอบการ"
            icon="i-lucide-plus"
            color="primary"
            @click="notify.info('เตรียมเปิดฟอร์มเพิ่มสถานประกอบการ')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <span class="font-semibold">รายชื่อสถานประกอบการที่ร่วมมือ</span>
        </template>

        <div class="text-center py-10 text-muted">
          <UIcon name="i-lucide-building-2" class="size-12 mx-auto mb-2 text-dimmed" />
          <p>ข้อมูลสถานประกอบการ ที่อยู่ ผู้ประสานงาน และพิกัดแผนที่</p>
          <p class="text-xs mt-1">พร้อมรองรับการจัดสรรนักศึกษาและการวางแผนการเดินทางนิเทศ</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
