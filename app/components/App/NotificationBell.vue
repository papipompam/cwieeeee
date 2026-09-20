<script setup lang="ts">
interface NotificationItem {
  id: number
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const user = useState<{ role: 'STAFF' | 'TEACHER' | 'STUDENT' } | null>('current-user', () => null)

const allNotiLink = computed(() => {
  if (user.value?.role === 'TEACHER') return '/teacher/notifications'
  if (user.value?.role === 'STAFF') return '/staff/notifications'
  return '/student/notifications'
})

const { data, refresh } = useFetch<{ items: NotificationItem[]; unreadCount: number }>('/api/notifications')

const formatTimeAgo = (dateStr: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))

const markAsRead = async (item: NotificationItem) => {
  if (item.isRead) return
  try {
    await $fetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' })
    item.isRead = true
    if (data.value && data.value.unreadCount > 0) data.value.unreadCount--
  } catch { /* ignore */ }
}

const markAllAsRead = async () => {
  try {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    await refresh()
  } catch { /* ignore */ }
}

const isOpen = ref(false)
watch(isOpen, (open) => {
  if (open) refresh()
})
</script>

<template>
  <UPopover v-model:open="isOpen">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-bell"
      aria-label="การแจ้งเตือน"
      class="relative h-[46px] w-[46px] rounded-xl border border-divider bg-canvas text-muted shadow-none hover:bg-surface hover:text-ink justify-center shrink-0 cursor-pointer"
    >
      <span
        v-if="data && data.unreadCount > 0"
        class="absolute top-2.5 right-2.5 size-2 rounded-full bg-error ring-2 ring-canvas"
      />
    </UButton>

    <template #content>
      <div class="w-80 sm:w-96 p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-divider pb-2.5">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-ink">การแจ้งเตือน</span>
            <UBadge v-if="data && data.unreadCount > 0" color="error" size="xs" variant="subtle">
              ใหม่ {{ data.unreadCount }}
            </UBadge>
          </div>
          <button
            v-if="data && data.unreadCount > 0"
            type="button"
            class="text-[11px] text-primary hover:underline cursor-pointer"
            @click="markAllAsRead"
          >
            อ่านทั้งหมด
          </button>
        </div>

        <div v-if="data?.items && data.items.length > 0" class="max-h-72 overflow-y-auto divide-y divide-divider -mx-1 px-1">
          <div
            v-for="item in data.items.slice(0, 5)"
            :key="item.id"
            class="py-2.5 px-2 rounded-md transition-colors hover:bg-surface cursor-pointer space-y-1"
            :class="!item.isRead ? 'bg-primary/5' : ''"
            @click="markAsRead(item)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-xs text-ink line-clamp-1">{{ item.title }}</span>
              <span class="text-[10px] text-muted shrink-0">{{ formatTimeAgo(item.createdAt) }}</span>
            </div>
            <p class="text-[11px] text-muted line-clamp-2 leading-relaxed">{{ item.message }}</p>
            <NuxtLink
              v-if="item.link"
              :to="item.link"
              class="text-[11px] text-primary hover:underline inline-block pt-0.5"
              @click="isOpen = false"
            >
              ไปยังรายการ →
            </NuxtLink>
          </div>
        </div>

        <div v-else class="py-6 text-center text-xs text-muted">
          ไม่มีการแจ้งเตือน
        </div>

        <div class="border-t border-divider pt-2 text-center">
          <NuxtLink :to="allNotiLink" class="text-xs text-primary font-medium hover:underline block" @click="isOpen = false">
            ดูการแจ้งเตือนทั้งหมด
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>
