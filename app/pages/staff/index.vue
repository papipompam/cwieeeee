<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { setRole } = useUserSession()
onMounted(() => setRole('staff'))
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
      <div class="space-y-4">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="พื้นที่เจ้าหน้าที่"
          description="หน้าภาพรวมการดำเนินงานสหกิจศึกษา สำหรับผู้ดูแลระบบ/เจ้าหน้าที่"
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UIcon name="i-lucide-calendar-range" class="size-5" />
              </div>
              <div>
                <p class="text-xs text-muted">รอบสหกิจที่เปิด</p>
                <p class="text-lg font-bold text-highlighted">1 รอบ</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UIcon name="i-lucide-graduation-cap" class="size-5" />
              </div>
              <div>
                <p class="text-xs text-muted">นักศึกษาทั้งหมด</p>
                <p class="text-lg font-bold text-highlighted">45 คน</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UIcon name="i-lucide-user-round-check" class="size-5" />
              </div>
              <div>
                <p class="text-xs text-muted">อาจารย์นิเทศ</p>
                <p class="text-lg font-bold text-highlighted">8 ท่าน</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UIcon name="i-lucide-building-2" class="size-5" />
              </div>
              <div>
                <p class="text-xs text-muted">สถานประกอบการ</p>
                <p class="text-lg font-bold text-highlighted">24 แห่ง</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
