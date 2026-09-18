<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

</script>

<template>
  <UDashboardPanel id="staff-overview">
    <template #header>
      <UDashboardNavbar title="ภาพรวม">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="ยังไม่มีข้อมูลภาพรวม"
        description="ข้อมูลภาพรวมจะแสดงเมื่อเริ่มบันทึกรอบสหกิจ นักศึกษา อาจารย์ และสถานประกอบการ"
      />
    </template>
  </UDashboardPanel>
</template>
