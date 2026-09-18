<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const user = useState<{ loginId: string, role: 'STAFF' | 'TEACHER' | 'STUDENT' } | null>('current-user', () => null)

const { data } = await useFetch('/api/auth/me')
user.value = data.value ?? null

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="user" class="flex gap-1" :class="collapsed ? 'flex-col' : ''">
    <UButton
      :label="collapsed ? undefined : user.loginId"
      icon="i-lucide-circle-user-round"
      color="neutral"
      variant="ghost"
      :block="!collapsed"
      :square="collapsed"
      to="/account/password"
    />
    <UButton
      icon="i-lucide-log-out"
      color="neutral"
      variant="ghost"
      :square="collapsed"
      :label="collapsed ? undefined : 'ออกจากระบบ'"
      @click="logout"
    />
  </div>
</template>
