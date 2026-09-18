<script setup lang="ts">
const state = reactive({ loginId: '', password: '' })
const error = ref('')
const loading = ref(false)

const submit = async () => {
  error.value = ''
  if (!state.loginId.trim() || !state.password) { error.value = 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน'; return }
  loading.value = true
  try {
    const user = await $fetch<{ role: 'STAFF' | 'TEACHER' | 'STUDENT' }>('/api/auth/login', { method: 'POST', body: state })
    await navigateTo(user.role === 'STAFF' ? '/staff' : user.role === 'TEACHER' ? '/teacher' : '/student')
  } catch (cause: unknown) {
    const data = typeof cause === 'object' && cause && 'data' in cause ? cause.data : null
    error.value = typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : 'ไม่สามารถเข้าสู่ระบบได้'
  } finally { loading.value = false }
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-muted px-4">
    <UCard class="w-full max-w-sm">
      <template #header><div class="text-center"><UIcon name="i-lucide-graduation-cap" class="mx-auto size-8 text-primary" /><h1 class="mt-2 text-xl font-semibold text-highlighted">เข้าสู่ระบบ CWIE</h1></div></template>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="รหัสผู้ใช้" required><UInput v-model="state.loginId" autocomplete="username" class="w-full" /></UFormField>
        <UFormField label="รหัสผ่าน" required><UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" /></UFormField>
        <UAlert v-if="error" color="error" :description="error" />
        <UButton type="submit" label="เข้าสู่ระบบ" color="primary" block :loading="loading" />
      </form>
    </UCard>
  </main>
</template>
