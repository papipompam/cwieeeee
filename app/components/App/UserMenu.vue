<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const user = useState<{ id: number, loginId: string, role: 'STAFF' | 'TEACHER' | 'STUDENT', name: string } | null>('current-user', () => null)

const { data } = await useFetch<any>('/api/auth/me')
user.value = data.value ?? null

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  await navigateTo('/login')
}

const roleLabel = computed(() => {
  if (user.value?.role === 'STUDENT') return 'นักศึกษา'
  if (user.value?.role === 'TEACHER') return 'อาจารย์'
  if (user.value?.role === 'STAFF') return 'เจ้าหน้าที่'
  return ''
})

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = []

  if (user.value?.role === 'STUDENT') {
    items.push({
      label: 'ข้อมูลส่วนตัว',
      icon: 'i-lucide-circle-user-round',
      to: '/student/profile'
    })
  }

  items.push({
    label: 'เปลี่ยนรหัสผ่าน',
    icon: 'i-lucide-key-round',
    to: '/account/password'
  })

  return [
    items,
    [
      {
        label: 'ออกจากระบบ',
        icon: 'i-lucide-log-out',
        color: 'error',
        onSelect: logout
      }
    ]
  ]
})
</script>

<template>
  <div v-if="user" class="w-full">
    <UDropdownMenu :items="menuItems">
      <UButton
        color="neutral"
        variant="ghost"
        :class="collapsed ? 'justify-center p-2' : 'w-full justify-start text-left px-2 py-2'"
      >
        <div class="flex items-center gap-2.5 w-full min-w-0">
          <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs">
            {{ (user.name || user.loginId).charAt(0).toUpperCase() }}
          </div>
          <div v-if="!collapsed" class="flex flex-col min-w-0 flex-1 leading-tight">
            <span class="text-xs font-medium text-highlighted truncate">{{ user.name || user.loginId }}</span>
            <span class="text-[11px] text-muted truncate">{{ roleLabel }} • {{ user.loginId }}</span>
          </div>
          <UIcon v-if="!collapsed" name="i-lucide-chevrons-up-down" class="size-4 text-muted shrink-0" />
        </div>
      </UButton>
    </UDropdownMenu>
  </div>
</template>
