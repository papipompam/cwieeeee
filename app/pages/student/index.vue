<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

</script>

<template>
  <UDashboardPanel id="student-overview">
    <template #header>
      <UDashboardNavbar title="ภาพรวมนักศึกษา">
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
          title="พื้นที่นักศึกษาสหกิจ"
          description="หน้าหลักสำหรับติดตามสถานะการยื่นคำร้อง และข้อมูลการฝึกสหกิจศึกษา"
        />

        <UCard>
          <template #header>
            <span class="font-semibold">สถานะการฝึกสหกิจศึกษา</span>
          </template>

          <div class="text-center py-10 text-muted">
            <UIcon name="i-lucide-file-text" class="size-12 mx-auto mb-2 text-dimmed" />
            <p class="font-medium text-highlighted">ยังไม่มีรอบสหกิจที่เปิดให้ดำเนินการ</p>
            <p class="text-sm mt-1">เมื่อมีรอบที่เปิดรับคำร้อง ข้อมูลจะแสดงที่หน้านี้</p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
