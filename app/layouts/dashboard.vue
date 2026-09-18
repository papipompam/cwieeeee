<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const route = useRoute()
const { activeCycleId: savedCycleId, setActiveCycle } = useStaffActiveCycle()

const user = useState<{ id: number, loginId: string, role: 'STAFF' | 'TEACHER' | 'STUDENT', name: string, mustChangePassword: boolean } | null>('current-user', () => null)
const { data: currentUser } = await useFetch<any>('/api/auth/me')
if (currentUser.value) {
  user.value = currentUser.value
}

const currentRole = computed<'staff' | 'teacher' | 'student'>(() => {
  if (route.path.startsWith('/teacher')) return 'teacher'
  if (route.path.startsWith('/student')) return 'student'
  if (route.path.startsWith('/staff')) return 'staff'
  if (user.value?.role === 'TEACHER') return 'teacher'
  if (user.value?.role === 'STUDENT') return 'student'
  return 'staff'
})

interface CycleReference {
  id: number
}

const { data: cycles } = await useFetch<CycleReference[]>('/api/cooperative-cycles', {
  immediate: currentRole.value === 'staff'
})

const hasCycle = (cycleId: number | string | null | undefined) =>
  cycles.value?.some(cycle => cycle.id === Number(cycleId)) ?? false

watch(cycles, () => {
  if (savedCycleId.value && Array.isArray(cycles.value) && !hasCycle(savedCycleId.value)) {
    setActiveCycle(null)
  }
}, { immediate: true })

const handleSelect = () => {
  open.value = false
}

const activeCycleId = computed(() => {
  const match = route.path.match(/^\/staff\/cooperative-cycles\/(\d+)/)
  if (match) return hasCycle(match[1]) ? match[1] : null
  return hasCycle(savedCycleId.value) ? String(savedCycleId.value) : null
})

const staffLinks = computed<NavigationMenuItem[]>(() => {
  const cycleId = activeCycleId.value

  return [
    {
      label: 'ภาพรวม',
      icon: 'i-lucide-layout-dashboard',
      to: '/staff',
      onSelect: handleSelect
    },
    {
      label: 'รอบสหกิจ',
      icon: 'i-lucide-calendar-range',
      to: '/staff/cooperative-cycles?select=1',
      onSelect: handleSelect,
      defaultOpen: true,
      children: cycleId ? [
        {
          label: 'ภาพรวมรอบ',
          icon: 'i-lucide-layout-dashboard',
          to: `/staff/cooperative-cycles/${cycleId}`,
          exact: true,
          onSelect: handleSelect
        },
        {
          label: 'รายชื่อนักศึกษา',
          icon: 'i-lucide-users',
          to: `/staff/cooperative-cycles/${cycleId}/students`,
          onSelect: handleSelect
        },
        {
          label: 'คำร้อง',
          icon: 'i-lucide-file-check-2',
          to: `/staff/cooperative-cycles/${cycleId}/applications`,
          onSelect: handleSelect
        },
        {
          label: 'สถานประกอบการ',
          icon: 'i-lucide-building-2',
          to: `/staff/cooperative-cycles/${cycleId}/placements`,
          onSelect: handleSelect
        },
        {
          label: 'อาจารย์นิเทศ',
          icon: 'i-lucide-users-round',
          to: `/staff/cooperative-cycles/${cycleId}/supervisors`,
          onSelect: handleSelect
        },
        {
          label: 'ตารางนิเทศ',
          icon: 'i-lucide-calendar-days',
          to: `/staff/cooperative-cycles/${cycleId}/visits`,
          onSelect: handleSelect
        },
        {
          label: 'การประเมิน',
          icon: 'i-lucide-clipboard-check',
          to: `/staff/cooperative-cycles/${cycleId}/evaluations`,
          onSelect: handleSelect
        },
        {
          label: 'งบประมาณ',
          icon: 'i-lucide-wallet-cards',
          to: `/staff/cooperative-cycles/${cycleId}/budgets`,
          onSelect: handleSelect
        }
      ] : undefined
    },
    {
      label: 'เจ้าหน้าที่',
      icon: 'i-lucide-id-card',
      to: '/staff/staffs',
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
    },
    {
      label: 'การแจ้งเตือน',
      icon: 'i-lucide-bell',
      to: '/staff/notifications',
      onSelect: handleSelect
    }
  ]
})

const teacherLinks: NavigationMenuItem[] = [
  {
    label: 'ภาพรวม',
    icon: 'i-lucide-layout-dashboard',
    to: '/teacher',
    onSelect: handleSelect
  },
  {
    label: 'ตารางนิเทศ',
    icon: 'i-lucide-calendar-days',
    to: '/teacher/visits',
    onSelect: handleSelect
  },
  {
    label: 'ประเมินนักศึกษา',
    icon: 'i-lucide-clipboard-check',
    to: '/teacher/evaluations/students',
    onSelect: handleSelect
  },
  {
    label: 'ประเมินสถานประกอบการ',
    icon: 'i-lucide-building-check',
    to: '/teacher/evaluations/companies',
    onSelect: handleSelect
  },
  {
    label: 'ข้อมูลนักศึกษา',
    icon: 'i-lucide-graduation-cap',
    to: '/teacher/students',
    onSelect: handleSelect
  },
  {
    label: 'ข้อมูลสถานประกอบการ',
    icon: 'i-lucide-building-complex',
    to: '/teacher/companies',
    onSelect: handleSelect
  },
  {
    label: 'การแจ้งเตือน',
    icon: 'i-lucide-bell',
    to: '/teacher/notifications',
    onSelect: handleSelect
  }
]

const studentLinks: NavigationMenuItem[] = [
  {
    label: 'ภาพรวม',
    icon: 'i-lucide-layout-dashboard',
    to: '/student',
    exact: true,
    onSelect: handleSelect
  },
  {
    label: 'การสมัครสถานประกอบการ',
    icon: 'i-lucide-briefcase-business',
    to: '/student/applications',
    onSelect: handleSelect
  },
  {
    label: 'คำร้องสถานที่ฝึกงาน',
    icon: 'i-lucide-file-text',
    to: '/student/requests',
    onSelect: handleSelect
  },
  {
    label: 'ตารางนิเทศ',
    icon: 'i-lucide-calendar-days',
    to: '/student/visits',
    onSelect: handleSelect
  },
  {
    label: 'การแจ้งเตือน',
    icon: 'i-lucide-bell',
    to: '/student/notifications',
    onSelect: handleSelect
  }
]

const currentLinks = computed<NavigationMenuItem[]>(() => {
  const links = currentRole.value === 'teacher'
    ? teacherLinks
    : currentRole.value === 'student'
      ? studentLinks
      : staffLinks.value

  if (user.value?.mustChangePassword) {
    return links.map(item => ({
      ...item,
      disabled: true,
      children: item.children?.map(child => ({ ...child, disabled: true }))
    }))
  }

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
        <AppUserMenu :collapsed="collapsed" class="w-full" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
