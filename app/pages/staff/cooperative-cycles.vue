<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('staff'))
const notify = useNotify()
</script>

<template>
  <UDashboardPanel id="staff-cycles">
    <template #header>
      <UDashboardNavbar title="รอบสหกิจ">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="เพิ่มรอบสหกิจ"
            icon="i-lucide-plus"
            color="primary"
            @click="notify.info('เตรียมเปิดฟอร์มเพิ่มรอบสหกิจ')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <span class="font-semibold">รายการรอบสหกิจศึกษา</span>
        </template>

        <div class="text-center py-12 text-muted">
          <UIcon name="i-lucide-calendar-range" class="size-12 mx-auto mb-3 text-dimmed" />
          <p class="font-medium text-highlighted">ภาคเรียนที่ 2/2569</p>
          <p class="text-sm mt-1">ช่วงเวลาฝึก: 1 พฤศจิกายน 2569 – 28 กุมภาพันธ์ 2570</p>
          <UBadge label="เปิดรับสมัคร" color="success" variant="subtle" class="mt-3" />
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
