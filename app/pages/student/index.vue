<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('student'))
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
            <p class="font-medium text-highlighted">รอบสหกิจศึกษาภาคเรียนที่ 2/2569</p>
            <p class="text-sm mt-1">สถานะปัจจุบัน: ยังไม่ได้ยื่นคำร้องขอฝึกสหกิจ</p>
            <UButton
              label="ยื่นคำร้องขอฝึกงาน"
              icon="i-lucide-arrow-right"
              color="primary"
              class="mt-4"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
