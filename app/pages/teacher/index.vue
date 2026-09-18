<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

</script>

<template>
  <UDashboardPanel id="teacher-overview">
    <template #header>
      <UDashboardNavbar title="ภาพรวมอาจารย์">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="พื้นที่อาจารย์นิเทศ"
          description="หน้าหลักสำหรับอาจารย์เพื่อตรวจสอบรายการนิเทศและนักศึกษาที่รับผิดชอบ"
        />

        <UCard>
          <template #header>
            <span class="font-semibold">สถานะงานนิเทศสหกิจ</span>
          </template>

          <div class="text-center py-10 text-muted">
            <UIcon name="i-lucide-user-check" class="size-12 mx-auto mb-2 text-dimmed" />
            <p class="font-medium text-highlighted">ยังไม่มีข้อมูลการนิเทศ</p>
            <p class="text-sm mt-1">รายการนิเทศจะแสดงเมื่อระบบกำหนดการมอบหมายแล้ว</p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
