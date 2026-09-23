<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const id = route.params.id

const { data: application, error } = await useFetch<any>(`/api/student/applications/${id}`)

const canEdit = computed(() => {
  if (!application.value) return false
  return ['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(application.value.status)
})
</script>

<template>
  <UDashboardPanel id="student-edit-application-page">
    <template #header>
      <AppDashboardNavbar title="แก้ไขการสมัครสถานประกอบการ">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :to="`/student/applications/${id}`"
            aria-label="กลับไปหน้ารายละเอียดการสมัคร"
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
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่พบข้อมูลการสมัคร"
          :description="error.message"
        />

        <UAlert
          v-else-if="!canEdit && application"
          color="warning"
          variant="subtle"
          icon="i-lucide-lock"
          title="ไม่สามารถแก้ไขรายการนี้ได้"
          :description="`รายการนี้อยู่ในสถานะ ${application.status} ซึ่งไม่อนุญาตให้แก้ไขข้อมูลหลัก`"
          :actions="[{ label: 'กลับไปหน้ารายละเอียด', color: 'neutral', variant: 'outline', to: `/student/applications/${id}` }]"
        />

        <StudentApplicationForm
          v-else-if="application"
          :initial-data="application"
          :is-edit="true"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
