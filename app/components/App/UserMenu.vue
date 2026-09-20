<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
  header?: boolean
}>()

const user = useState<{ id: number, loginId: string, role: 'STAFF' | 'TEACHER' | 'STUDENT', name: string, mustChangePassword: boolean } | null>('current-user', () => null)
const isLoggingOut = ref(false)
const notify = useNotify()

const { data } = await useFetch<any>('/api/auth/me')
if (data.value) {
  user.value = data.value
}

const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  } catch {
    notify.error('ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง')
  } finally {
    isLoggingOut.value = false
  }
}

const roleLabel = computed(() => {
  if (user.value?.role === 'STUDENT') return 'นักศึกษา'
  if (user.value?.role === 'TEACHER') return 'อาจารย์'
  if (user.value?.role === 'STAFF') return 'เจ้าหน้าที่'
  return ''
})

const displayName = computed(() => user.value?.name || user.value?.loginId || '')
const profileModalOpen = useState('student-profile-modal-open', () => false)

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const profileItem: DropdownMenuItem = {
    label: user.value?.role === 'STUDENT' ? 'แก้ไขข้อมูลส่วนตัว' : 'เปลี่ยนรหัสผ่าน',
    icon: user.value?.role === 'STUDENT' ? 'i-lucide-user-round-pen' : 'i-lucide-key-round',
    ...(user.value?.role === 'STUDENT'
      ? { onSelect: () => { profileModalOpen.value = true } }
      : { to: '/account/password' }),
    class: 'bg-canvas text-ink hover:bg-surface hover:text-ink data-highlighted:bg-surface data-highlighted:text-ink',
    ui: {
      itemLeadingIcon: 'text-ink group-hover:text-ink group-data-highlighted:text-ink',
      itemLabel: 'text-ink group-hover:text-ink group-data-highlighted:text-ink'
    }
  }

  const logoutItem: DropdownMenuItem = {
    label: 'ออกจากระบบ',
    icon: 'i-lucide-log-out',
    loading: isLoggingOut.value,
    class: 'bg-canvas text-danger hover:bg-danger-soft hover:text-danger data-highlighted:bg-danger-soft data-highlighted:text-danger',
    ui: {
      itemLeadingIcon: 'text-danger group-hover:text-danger group-data-highlighted:text-danger',
      itemLabel: 'text-danger group-hover:text-danger group-data-highlighted:text-danger'
    },
    onSelect: logout
  }

  return [
    [profileItem],
    [logoutItem]
  ]
})
</script>

<template>
  <div v-if="user" :class="header ? 'w-auto' : 'w-full'">
    <UDropdownMenu
      :items="menuItems"
      :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
      :ui="{
        content: 'w-[255px] overflow-hidden rounded-panel border border-divider bg-canvas p-0 shadow-panel ring-0',
        viewport: 'p-0 divide-y divide-divider overflow-y-auto flex-1',
        group: 'p-0',
        item: 'group flex items-center h-[42px] w-full gap-[10px] rounded-none px-[18px] py-[10px] transition-colors duration-150 before:hidden cursor-pointer outline-none select-none'
      }"
    >
      <template #default="{ open }">
        <button
          type="button"
          :aria-label="`เมนูผู้ใช้ ${displayName} ${roleLabel}`"
          title="เมนูผู้ใช้"
          :aria-expanded="open"
          :class="[
            'cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            header
              ? 'flex h-[46px] w-[250px] max-w-[calc(100vw-5rem)] items-center justify-between rounded-xl border border-divider bg-canvas px-[11px] text-left shadow-none hover:bg-surface'
              : collapsed
                ? 'grid size-[46px] place-items-center rounded-xl border border-divider bg-canvas p-1 shadow-none hover:bg-surface'
                : 'flex h-[46px] w-full items-center justify-between rounded-xl border border-divider bg-canvas px-[11px] text-left shadow-none hover:bg-surface'
          ]"
        >
          <div class="flex min-w-0 flex-1 items-center gap-[10px]">
            <div class="grid size-[38px] shrink-0 place-items-center rounded-full bg-primary text-[14px] font-medium text-ink">
              {{ displayName.charAt(0).toUpperCase() }}
            </div>
            <div v-if="!collapsed" class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-[15px] font-medium leading-[1.3] text-ink">{{ displayName }}</span>
              <span class="truncate text-[13px] font-normal leading-[1.2] text-muted">{{ roleLabel }}</span>
            </div>
          </div>
          <UIcon
            v-if="!collapsed || header"
            name="i-lucide-chevron-down"
            class="size-4 shrink-0 text-muted transition-transform duration-150"
            :class="{ 'rotate-180': open }"
          />
        </button>
      </template>

      <template #content-top>
        <div class="px-[18px] pt-[14px] pb-[12px]">
          <p class="truncate text-[15px] font-medium leading-[1.4] text-ink">{{ displayName }}</p>
          <p class="mt-[2px] truncate text-[13px] font-normal leading-[1.2] text-muted">{{ roleLabel }}</p>
        </div>
        <div class="border-b border-divider" />
      </template>

      <template #item="{ item }">
        <UIcon
          v-if="item.loading"
          name="i-lucide-loader-circle"
          class="size-[18px] shrink-0 animate-spin"
          :class="item.ui?.itemLeadingIcon"
        />
        <UIcon
          v-else-if="item.icon"
          :name="item.icon"
          class="size-[18px] shrink-0 transition-colors duration-150"
          :class="item.ui?.itemLeadingIcon"
        />
        <span
          class="truncate text-[15px] font-normal font-['Prompt',sans-serif] transition-colors duration-150"
          :class="item.ui?.itemLabel"
        >
          {{ item.label }}
        </span>
      </template>
    </UDropdownMenu>
  </div>
</template>
