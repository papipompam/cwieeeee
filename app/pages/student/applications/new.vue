<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { data: contextData } = await useFetch<any>('/api/student/context')

// If cannot apply, redirect or show banner
</script>

<template>
  <UDashboardPanel id="student-new-application-page">
    <template #header>
      <AppDashboardNavbar title="เพิ่มการสมัครสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/student/applications"
            aria-label="กลับไปหน้ารายการสมัคร"
          />
        </template>
        <template #right>
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-4xl pb-16 space-y-6">
        <UAlert
          v-if="contextData && !contextData.canApply"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="ไม่สามารถเพิ่มรายการสมัครใหม่ได้"
          :description="contextData.reason || 'ท่านไม่ผ่านเงื่อนไขการสมัครในรอบปัจจุบัน'"
          :actions="[{ label: 'กลับไปหน้ารายการสมัคร', color: 'neutral', variant: 'outline', to: '/student/applications' }]"
        />

        <StudentApplicationForm v-else />
      </div>
    </template>
  </UDashboardPanel>
</template>
