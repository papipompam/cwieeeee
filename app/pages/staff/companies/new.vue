<script setup lang="ts">
import CompanyForm from '~/components/Company/Form.vue'

definePageMeta({
  layout: 'dashboard'
})

const notify = useNotify()
const isSubmitting = ref(false)

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  try {
    await $fetch('/api/companies', {
      method: 'POST',
      body: formData
    })
    notify.created(`สถานประกอบการ ${formData.name}`)
    await navigateTo('/staff/companies')
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    notify.error(msg)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="staff-company-new">
    <template #header>
      <UDashboardNavbar title="เพิ่มสถานประกอบการใหม่">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/staff/companies"
            aria-label="กลับไปหน้ารายการสถานประกอบการ"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto p-4 sm:p-6">
        <CompanyForm
          :is-editing="false"
          :loading="isSubmitting"
          @submit="handleSubmit"
          @cancel="navigateTo('/staff/companies')"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
