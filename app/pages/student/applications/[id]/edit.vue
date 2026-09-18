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
      <UDashboardNavbar title="แก้ไขการสมัครสถานประกอบการ">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :to="`/student/applications/${id}`"
          />
        </template>
      </UDashboardNavbar>
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

        <div v-else-if="!canEdit && application" class="rounded-xl border border-warning/40 bg-warning/5 p-4 text-xs text-warning flex items-start gap-3">
          <UIcon name="i-lucide-lock" class="size-5 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <h4 class="font-semibold text-sm">ไม่สามารถแก้ไขรายการนี้ได้</h4>
            <p>รายการนี้อยู่ในสถานะ {{ application.status }} ซึ่งไม่อนุญาตให้แก้ไขข้อมูลหลัก</p>
            <div class="pt-2">
              <UButton size="xs" color="warning" variant="subtle" label="กลับไปหน้ารายละเอียด" :to="`/student/applications/${id}`" />
            </div>
          </div>
        </div>

        <StudentApplicationForm
          v-else-if="application"
          :initial-data="application"
          :is-edit="true"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
