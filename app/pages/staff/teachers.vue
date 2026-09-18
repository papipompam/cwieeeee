<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

</script>

<template>
  <UDashboardPanel id="staff-teachers">
    <template #header>
      <UDashboardNavbar title="จัดการข้อมูลอาจารย์">
        <template #leading>
          <UDashboardSidebarCollapse />
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
          <p>ยังไม่มีข้อมูลอาจารย์</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
