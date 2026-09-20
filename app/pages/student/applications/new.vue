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
          />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-4xl pb-16 space-y-6">
        <div v-if="contextData && !contextData.canApply" class="rounded-xl border border-warning/40 bg-warning/5 p-4 text-xs text-warning flex items-start gap-3">
          <UIcon name="i-lucide-triangle-alert" class="size-5 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <h4 class="font-semibold text-sm">ไม่สามารถเพิ่มรายการสมัครใหม่ได้</h4>
            <p>{{ contextData.reason || 'ท่านไม่ผ่านเงื่อนไขการสมัครในรอบปัจจุบัน' }}</p>
            <div class="pt-2">
              <UButton size="xs" color="warning" variant="subtle" label="กลับไปหน้ารายการสมัคร" to="/student/applications" />
            </div>
          </div>
        </div>

        <StudentApplicationForm v-else />
      </div>
    </template>
  </UDashboardPanel>
</template>
