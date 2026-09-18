<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const state = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const error = ref('')
const loading = ref(false)
const notify = useNotify()

const submit = async () => {
  error.value = ''
  if (state.newPassword !== state.confirmPassword) {
    error.value = 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/password', { method: 'PUT', body: state })
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''
    notify.success('เปลี่ยนรหัสผ่านแล้ว')
  } catch (cause: unknown) {
    const data = typeof cause === 'object' && cause && 'data' in cause ? cause.data : null
    error.value = typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : 'ไม่สามารถเปลี่ยนรหัสผ่านได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="account-password">
    <template #header>
      <UDashboardNavbar title="เปลี่ยนรหัสผ่าน" icon="i-lucide-key-round" />
    </template>

    <template #body>
      <UCard class="max-w-lg">
        <form class="space-y-4" @submit.prevent="submit">
          <UFormField label="รหัสผ่านปัจจุบัน" required>
            <UInput v-model="state.currentPassword" type="password" autocomplete="current-password" class="w-full" />
          </UFormField>
          <UFormField label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร" required>
            <UInput v-model="state.newPassword" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UFormField label="ยืนยันรหัสผ่านใหม่" required>
            <UInput v-model="state.confirmPassword" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UAlert v-if="error" color="error" :description="error" />
          <UButton type="submit" label="บันทึกรหัสผ่านใหม่" :loading="loading" />
        </form>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
