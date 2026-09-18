<script setup lang="ts">
interface NotificationItem {
  id: number
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const { data, refresh } = await useFetch<{ items: NotificationItem[]; unreadCount: number }>('/api/student/notifications')

const formatTimeAgo = (dateStr: string) => {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const markAsRead = async (item: NotificationItem) => {
  if (item.isRead) return
  try {
    await $fetch(`/api/student/notifications/${item.id}/read`, { method: 'PATCH' })
    item.isRead = true
    if (data.value && data.value.unreadCount > 0) {
      data.value.unreadCount--
    }
  } catch {
    // ignore
  }
}

const markAllAsRead = async () => {
  try {
    await $fetch('/api/student/notifications/read-all', { method: 'POST' })
    await refresh()
  } catch {
    // ignore
  }
}
</script>

<template>
  <UPopover>
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-bell"
      aria-label="การแจ้งเตือน"
      class="relative"
    >
      <span
        v-if="data && data.unreadCount > 0"
        class="absolute top-1.5 right-1.5 size-2 rounded-full bg-error ring-2 ring-default"
      />
    </UButton>

    <template #content>
      <div class="w-80 sm:w-96 p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-default pb-2.5">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-highlighted">การแจ้งเตือน</span>
            <UBadge v-if="data && data.unreadCount > 0" color="error" size="xs" variant="subtle">
              ใหม่ {{ data.unreadCount }}
            </UBadge>
          </div>
          <button
            v-if="data && data.unreadCount > 0"
            type="button"
            class="text-[11px] text-primary hover:underline"
            @click="markAllAsRead"
          >
            อ่านทั้งหมด
          </button>
        </div>

        <div v-if="data?.items && data.items.length > 0" class="max-h-72 overflow-y-auto divide-y divide-default/50 -mx-1 px-1">
          <div
            v-for="item in data.items.slice(0, 5)"
            :key="item.id"
            class="py-2.5 px-2 rounded-md transition-colors hover:bg-muted/10 cursor-pointer space-y-1"
            :class="!item.isRead ? 'bg-primary/5' : ''"
            @click="markAsRead(item)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-xs text-highlighted line-clamp-1">{{ item.title }}</span>
              <span class="text-[10px] text-muted shrink-0">{{ formatTimeAgo(item.createdAt) }}</span>
            </div>
            <p class="text-[11px] text-muted line-clamp-2 leading-relaxed">{{ item.message }}</p>
            <NuxtLink
              v-if="item.link"
              :to="item.link"
              class="text-[11px] text-primary hover:underline inline-block pt-0.5"
            >
              ไปยังรายการ →
            </NuxtLink>
          </div>
        </div>

        <div v-else class="py-6 text-center text-xs text-muted">
          ไม่มีการแจ้งเตือน
        </div>

        <div class="border-t border-default pt-2 text-center">
          <NuxtLink
            to="/student/notifications"
            class="text-xs text-primary font-medium hover:underline block"
          >
            ดูการแจ้งเตือนทั้งหมด
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>
