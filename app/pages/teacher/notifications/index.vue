<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface NotificationItem {
  id: number
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const router = useRouter()
const notify = useNotify()
const { data, status, error, refresh } = await useFetch<{ items: NotificationItem[], unreadCount: number }>('/api/notifications')
const isMarkingAllRead = ref(false)

const formatThaiDate = (value: string) => new Intl.DateTimeFormat('th-TH', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(new Date(value))

const openNotification = async (item: NotificationItem) => {
  try {
    if (!item.isRead) await $fetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' })
    if (item.link) await router.push(item.link)
    else await refresh()
  } catch {
    notify.error('ไม่สามารถเปิดการแจ้งเตือนได้')
  }
}

const markAllRead = async () => {
  isMarkingAllRead.value = true
  try {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    await refresh()
  } catch {
    notify.error('ไม่สามารถอัปเดตการแจ้งเตือนได้')
  } finally {
    isMarkingAllRead.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="teacher-notifications-page">
    <template #header>
      <AppDashboardNavbar title="การแจ้งเตือน">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton v-if="data?.unreadCount" color="neutral" variant="ghost" label="อ่านทั้งหมด" size="xl" :loading="isMarkingAllRead" @click="markAllRead" />
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
          <AppNotificationBell />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดการแจ้งเตือนได้" :description="error.message" />
      <div v-else class="mx-auto max-w-3xl divide-y divide-divider rounded-panel border border-divider bg-canvas shadow-panel overflow-hidden">
        <button
          v-for="item in data?.items || []"
          :key="item.id"
          type="button"
          class="block w-full px-5 py-4 text-left transition-colors hover:bg-surface"
          :class="{ 'bg-primary/5': !item.isRead }"
          @click="openNotification(item)"
        >
          <div class="flex gap-3">
            <span class="mt-1 size-2 shrink-0 rounded-full" :class="item.isRead ? 'bg-transparent' : 'bg-primary'" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink">{{ item.title }}</p>
              <p class="mt-1 text-sm text-muted">{{ item.message }}</p>
              <p class="mt-2 text-xs text-muted">{{ formatThaiDate(item.createdAt) }}</p>
            </div>
          </div>
        </button>
        <UEmpty v-if="!data?.items?.length && status !== 'pending'" icon="i-lucide-bell" title="ยังไม่มีการแจ้งเตือน" class="py-12" />
      </div>
    </template>
  </UDashboardPanel>
</template>
