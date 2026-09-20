<script setup lang="ts">
const props = defineProps<{
  open: boolean
  account: {
    id: number
    loginId: string
    name: string
  }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({ newPassword: '', confirmPassword: '' })
const error = ref('')
const loading = ref(false)
const notify = useNotify()

watch(isOpen, (open) => {
  if (!open) return
  form.newPassword = ''
  form.confirmPassword = ''
  error.value = ''
})

const submit = async () => {
  error.value = ''
  if (form.newPassword !== form.confirmPassword) {
    error.value = 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'
    return
  }

  loading.value = true
  try {
    await $fetch(`/api/staff/users/${props.account.id}/password`, {
      method: 'PUT',
      body: { newPassword: form.newPassword }
    })
    notify.success(`ตั้งรหัสผ่านใหม่สำหรับ ${props.account.loginId} แล้ว`)
    isOpen.value = false
  } catch (cause: unknown) {
    const data = typeof cause === 'object' && cause && 'data' in cause ? cause.data : null
    error.value = typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
      ? data.message
      : 'ไม่สามารถตั้งรหัสผ่านใหม่ได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="ตั้งรหัสผ่านใหม่"
    :description="`${account.name} · ${account.loginId}`"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร" required>
          <UInput v-model="form.newPassword" type="password" autocomplete="new-password" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="ยืนยันรหัสผ่านใหม่" required>
          <UInput v-model="form.confirmPassword" type="password" autocomplete="new-password" class="w-full" size="xl" />
        </UFormField>
        <UAlert v-if="error" color="error" :description="error" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton size="xl" label="ยกเลิก" color="neutral" variant="outline" :disabled="loading" @click="isOpen = false" />
        <UButton size="xl" label="บันทึกรหัสผ่านใหม่" icon="i-lucide-key-round" color="primary" :loading="loading" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
