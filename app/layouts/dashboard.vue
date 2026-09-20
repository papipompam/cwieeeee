<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const route = useRoute()
const isDevelopment = import.meta.dev
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
          label: 'จัดกลุ่มนิเทศ',
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
]

const studentLinks: NavigationMenuItem[] = [
  {
    label: 'หน้าหลัก',
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
  <UDashboardGroup unit="rem" :class="{ 'student-ui-theme': route.path.startsWith('/student') }">
    <UDashboardSidebar
      id="dashboard-sidebar"
      v-model:open="open"
      collapsible
      resizable
      class="app-sidebar"
      :ui="{
        content: 'app-sidebar w-[min(20rem,calc(100vw-2rem))] max-w-none',
        header: 'px-4 sm:px-5',
        body: 'px-3 py-3 sm:px-4',
        footer: 'justify-center border-t border-sidebar-border px-3 py-3 sm:px-4'
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          class="flex w-full items-center justify-center overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยราชภัฏบุรีรัมย์"
        >
          <img
            v-if="collapsed"
            src="/images/brand/computer-science-mark.png"
            alt=""
            class="h-auto w-10 object-contain"
          >
          <img
            v-else
            src="/images/brand/computer-science-full.png"
            alt=""
            class="h-auto w-full object-contain"
          >
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="currentLinks"
          orientation="vertical"
          color="neutral"
          variant="pill"
          tooltip
          class="sidebar-menu"
          :ui="{
            root: 'gap-2',
            list: 'space-y-1',
            link: 'min-h-11 gap-3 rounded-control px-3 py-2 text-sm font-medium focus-visible:before:outline-primary/50',
            linkLeadingIcon: 'size-5',
            childList: 'mt-1 space-y-1 border-sidebar-border',
            childLink: 'min-h-10 gap-2.5 rounded-control px-3 py-2',
            childLinkIcon: 'size-4.5'
          }"
        />
        <div v-if="isDevelopment && currentRole === 'student'" class="mt-5 border-t border-sidebar-border pt-4">
          <p v-if="!collapsed" class="mb-2 px-3 text-xs font-semibold text-sidebar-muted">สำหรับนักพัฒนา</p>
          <UButton
            to="/dev/ui"
            icon="i-lucide-blocks"
            :label="collapsed ? undefined : 'Design System'"
            :color="route.path === '/dev/ui' ? 'primary' : 'neutral'"
            :variant="route.path === '/dev/ui' ? 'solid' : 'ghost'"
            :square="collapsed"
            class="min-h-11 w-full justify-start gap-3 rounded-control px-3 text-sm font-medium"
            aria-label="Design System"
            title="Design System"
            @click="handleSelect"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <span v-if="!collapsed" class="text-center text-xs font-medium tracking-wide text-sidebar-muted">
          วิทยาการคอมพิวเตอร์
        </span>
        <span v-else class="text-xs font-semibold text-sidebar-muted" aria-label="วิทยาการคอมพิวเตอร์">
          CS
        </span>
      </template>

    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
