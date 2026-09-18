<script setup lang="ts">
import CompanyForm from '~/components/Company/Form.vue'

definePageMeta({
  layout: 'dashboard'
})

interface Company {
  id: number
  name: string
  contactPerson: string
  phone: string | null
  email: string | null
  addressNo: string
  moo: string | null
  soi: string | null
  street: string | null
  subdistrict: string
  district: string
  province: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  travelNote: string | null
  isActive: boolean
}

const route = useRoute()
const notify = useNotify()
const isSubmitting = ref(false)

const companyId = computed(() => route.params.id)

const { data: company, status: fetchStatus, error: fetchError } = await useFetch<Company>(() => `/api/companies/${companyId.value}`)

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  try {
    await $fetch(`/api/companies/${companyId.value}`, {
      method: 'PUT',
      body: formData
    })
    notify.updated(`ข้อมูลสถานประกอบการ ${formData.name}`)
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
  <UDashboardPanel id="staff-company-edit">
    <template #header>
      <UDashboardNavbar :title="company ? `แก้ไข ${company.name}` : 'แก้ไขสถานประกอบการ'">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/staff/companies"
            aria-label="กลับไปหน้ารายการสถานประกอบการ"
          />
        </template>
        <template #right>
          <AppNotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto p-4 sm:p-6">
        <UAlert
          v-if="fetchError"
          color="error"
          icon="i-lucide-alert-circle"
          title="ไม่พบข้อมูลสถานประกอบการ"
          :description="fetchError.message"
        />

        <div v-else-if="fetchStatus === 'pending'" class="py-12 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin mx-auto mb-2 text-primary" />
          <p>กำลังโหลดข้อมูลสถานประกอบการ...</p>
        </div>

        <CompanyForm
          v-else-if="company"
          :initial-data="company"
          :is-editing="true"
          :loading="isSubmitting"
          @submit="handleSubmit"
          @cancel="navigateTo('/staff/companies')"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
