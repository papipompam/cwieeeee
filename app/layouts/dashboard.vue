<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const route = useRoute()

const handleSelect = () => {
  open.value = false
}

const staffLinks: NavigationMenuItem[] = [
  {
    label: 'ภาพรวม',
    icon: 'i-lucide-layout-dashboard',
    to: '/staff',
    onSelect: handleSelect
  },
  {
    label: 'รอบสหกิจ',
    icon: 'i-lucide-calendar-range',
    to: '/staff/cooperative-cycles',
    onSelect: handleSelect
  },
  {
    label: 'นักศึกษา',
    icon: 'i-lucide-graduation-cap',
    to: '/staff/students',
    onSelect: handleSelect
  },
  {
    label: 'อาจารย์',
    icon: 'i-lucide-user-round-check',
    to: '/staff/teachers',
    onSelect: handleSelect
  },
  {
    label: 'สถานประกอบการ',
    icon: 'i-lucide-building-2',
    to: '/staff/companies',
    onSelect: handleSelect
  }
]

const teacherLinks: NavigationMenuItem[] = [
  {
    label: 'ภาพรวม',
    icon: 'i-lucide-layout-dashboard',
    to: '/teacher',
    onSelect: handleSelect
  }
]

const studentLinks: NavigationMenuItem[] = [
  {
    label: 'ภาพรวม',
    icon: 'i-lucide-layout-dashboard',
    to: '/student',
    onSelect: handleSelect
  }
]

const currentRole = computed<'staff' | 'teacher' | 'student'>(() => {
  if (route.path.startsWith('/teacher')) return 'teacher'
  if (route.path.startsWith('/student')) return 'student'
  return 'staff'
})

const currentLinks = computed<NavigationMenuItem[]>(() => {
  const links = currentRole.value === 'teacher'
    ? teacherLinks
    : currentRole.value === 'student'
      ? studentLinks
      : staffLinks

  return links
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="dashboard-sidebar"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2.5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-1">
          <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-graduation-cap" class="size-5" />
          </div>
          <div v-if="!collapsed" class="flex flex-col overflow-hidden text-left min-w-0">
            <span class="font-bold text-sm tracking-tight text-highlighted truncate leading-tight">CWIE CS BRU</span>
            <span class="text-[11px] text-muted truncate leading-tight mt-0.5">ระบบนิเทศสหกิจศึกษา</span>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="currentLinks"
          orientation="vertical"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <AppUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
