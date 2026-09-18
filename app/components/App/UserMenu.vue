<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { user } = useUserSession()
const notify = useNotify()

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value.name,
      description: user.value.roleLabel,
      avatar: user.value.avatar
    }
  ],
  [
    {
      label: 'โปรไฟล์',
      icon: 'i-lucide-user',
      onSelect() {
        notify.info('เปิดหน้าโปรไฟล์ (รอบถัดไป)')
      }
    }
  ],
  [
    {
      label: 'ออกจากระบบ',
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect() {
        notify.warning('ออกจากระบบเรียบร้อย')
      }
    }
  ]
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    >
      <template #leading>
        <UAvatar
          :text="user.avatar?.text"
          :alt="user.name"
          size="sm"
        />
      </template>

      <template v-if="!collapsed" #default>
        <div class="flex flex-col text-left min-w-0 flex-1">
          <span class="text-sm font-medium text-highlighted truncate">{{ user.name }}</span>
          <span class="text-xs text-muted truncate">{{ user.roleLabel }}</span>
        </div>
      </template>

      <template v-if="!collapsed" #trailing>
        <UIcon name="i-lucide-chevrons-up-down" class="size-4 text-dimmed shrink-0" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
