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

interface MenuGroup {
  label: string
  items: NavigationMenuItem[]
}

const isStaffUser = computed(() => user.value?.role === 'STAFF')
const isStaffSection = computed(() => route.path.startsWith('/staff'))
const shouldFetchCycles = computed(() => isStaffUser.value && isStaffSection.value)

const { data: cycles, execute: fetchCycles } = await useFetch<CycleReference[]>('/api/cooperative-cycles', {
  immediate: shouldFetchCycles.value
})

watch(shouldFetchCycles, (shouldFetch) => {
  if (shouldFetch && !cycles.value) {
    fetchCycles()
  }
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
      label: 'หน้าหลัก',
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
      label: 'การตั้งค่า',
      icon: 'i-lucide-settings-2',
      children: [
        {
          label: 'การแจ้งเตือน',
          icon: 'i-lucide-bell',
          to: '/staff/notifications',
          onSelect: handleSelect
        },
        {
          label: 'จัดการเอกสาร',
          icon: 'i-lucide-file-cog',
          to: '/staff/settings/documents',
          onSelect: handleSelect
        },
        {
          label: 'จัดการการประเมิน',
          icon: 'i-lucide-list-checks',
          to: '/staff/settings/evaluations',
          onSelect: handleSelect
        },
        {
          label: 'จัดการรีวิวสถานประกอบการ',
          icon: 'i-lucide-message-square-heart',
          to: '/staff/company-reviews',
          onSelect: handleSelect
        }
      ]
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
    label: 'สมัครและยืนยันที่ฝึกงาน',
    icon: 'i-lucide-briefcase-business',
    to: '/student/applications',
    onSelect: handleSelect
  },
  {
    label: 'ค้นหาสถานประกอบการ',
    icon: 'i-lucide-search',
    to: '/student/companies',
    onSelect: handleSelect
  },
  {
    label: 'ตารางนิเทศ',
    icon: 'i-lucide-calendar-days',
    to: '/student/visits',
    onSelect: handleSelect
  },
  {
    label: 'รีวิวสถานประกอบการ',
    icon: 'i-lucide-message-square-star',
    to: '/student/company-review',
    onSelect: handleSelect
  }
]

const currentMenuGroups = computed<MenuGroup[]>(() => {
  const groups: MenuGroup[] = currentRole.value === 'teacher'
    ? [
        { label: 'ภาพรวม', items: teacherLinks.slice(0, 1) },
        { label: 'การนิเทศของฉัน', items: teacherLinks.slice(1, 4) },
        { label: 'ข้อมูลประกอบการนิเทศ', items: teacherLinks.slice(4) }
      ]
    : currentRole.value === 'student'
      ? [
          { label: 'ภาพรวม', items: studentLinks.slice(0, 1) },
          { label: 'การฝึกงานของฉัน', items: studentLinks.slice(1) }
        ]
      : [
          { label: 'ภาพรวม', items: staffLinks.value.slice(0, 2) },
          { label: 'จัดการข้อมูล', items: staffLinks.value.slice(2, 6) },
          { label: 'ระบบ', items: staffLinks.value.slice(6) }
        ]

  if (user.value?.mustChangePassword) {
    return groups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        disabled: true,
        children: item.children?.map(child => ({ ...child, disabled: true }))
      }))
    }))
  }

  return groups
})
</script>

<template>
  <UDashboardGroup
    unit="rem"
    class="app-ui-theme"
    :class="{
      'student-ui-theme': route.path.startsWith('/student'),
      'staff-ui-theme': route.path.startsWith('/staff'),
      'teacher-ui-theme': route.path.startsWith('/teacher')
    }"
  >
    <UDashboardSidebar
      id="dashboard-sidebar"
      v-model:open="open"
      collapsible
      :default-size="16"
      :collapsed-size="5"
      class="app-sidebar"
      :ui="{
        root: 'w-64! data-[collapsed=true]:w-20!',
        content: 'app-sidebar w-72 max-w-[85vw]',
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
        <nav aria-label="เมนูหลัก" :class="collapsed ? 'space-y-3' : 'space-y-5'">
          <section v-for="group in currentMenuGroups" :key="group.label">
            <p v-if="!collapsed" class="mb-2 px-3 text-xs font-semibold text-sidebar-muted">
              {{ group.label }}
            </p>
            <UNavigationMenu
              :collapsed="collapsed"
              :items="group.items"
              orientation="vertical"
              color="neutral"
              variant="pill"
              tooltip
              class="sidebar-menu"
              :ui="{
                root: 'gap-1',
                list: 'space-y-0.5',
                link: 'min-h-10 gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 hover:before:!bg-sidebar-hover hover:!text-white focus-visible:before:outline-primary/50',
                linkLeadingIcon: 'size-5 transition-colors duration-150 group-hover:!text-white',
                childList: 'mt-1 space-y-0 border-sidebar-border',
                childLink: 'min-h-9 gap-2.5 rounded-xl px-3 py-1.5 transition-colors duration-150 hover:before:!bg-sidebar-hover hover:!text-white',
                childLinkIcon: 'size-4.5 transition-colors duration-150 group-hover:!text-white'
              }"
            />
          </section>
        </nav>
        <div v-if="isDevelopment && currentRole === 'student'" class="mt-5 border-t border-sidebar-border pt-4">
          <p v-if="!collapsed" class="mb-2 px-3 text-xs font-semibold text-sidebar-muted">สำหรับนักพัฒนา</p>
          <UButton
            to="/dev/ui"
            icon="i-lucide-blocks"
            :label="collapsed ? undefined : 'Design System'"
            :color="route.path === '/dev/ui' ? 'primary' : 'neutral'"
            :variant="route.path === '/dev/ui' ? 'solid' : 'ghost'"
            :square="collapsed"
            class="min-h-11 w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150"
            :class="route.path === '/dev/ui' ? 'hover:bg-primary' : 'hover:bg-sidebar-hover hover:text-white'"
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
