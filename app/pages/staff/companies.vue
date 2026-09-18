<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

</script>

<template>
  <UDashboardPanel id="staff-companies">
    <template #header>
      <UDashboardNavbar title="จัดการสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
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
          <p>ยังไม่มีข้อมูลสถานประกอบการ</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
