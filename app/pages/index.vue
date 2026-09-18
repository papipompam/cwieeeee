<script setup lang="ts">
const { currentRole, setRole, user } = useUserSession()
const notify = useNotify()

const roles = [
  { id: 'staff' as const, label: 'เจ้าหน้าที่', path: '/staff', icon: 'i-lucide-shield' },
  { id: 'teacher' as const, label: 'อาจารย์นิเทศ', path: '/teacher', icon: 'i-lucide-user-round-check' },
  { id: 'student' as const, label: 'นักศึกษา', path: '/student', icon: 'i-lucide-graduation-cap' }
]

const { data: students, status, error } = useFetch('/api/students')
</script>

<template>
  <div class="min-h-screen bg-default">
    <UContainer class="py-10 max-w-4xl">
      <!-- Title & Branding -->
      <div class="flex items-center gap-3 mb-8">
        <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <UIcon name="i-lucide-graduation-cap" class="size-7" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">ระบบนิเทศสหกิจศึกษา (CWIE CS BRU)</h1>
          <p class="text-sm text-muted">มหาวิทยาลัยราชภัฏบุรีรัมย์ — Full-stack Cooperative Education Supervision</p>
        </div>
      </div>

      <!-- Role Navigation Selector -->
      <UCard class="mb-8">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-layout-dashboard" class="size-5 text-primary" />
              <span class="font-semibold text-highlighted">เข้าสู่ระบบตามบทบาท (App Shell Showcase)</span>
            </div>
            <UBadge :label="`บทบาทปัจจุบัน: ${user.roleLabel}`" color="primary" variant="subtle" />
          </div>
        </template>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            v-for="r in roles"
            :key="r.id"
            class="p-4 rounded-lg border border-default transition-all duration-150 hover:border-primary/50 hover:bg-elevated/30 flex flex-col justify-between gap-4"
            :class="{ 'ring-2 ring-primary bg-elevated/50': currentRole === r.id }"
          >
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UIcon :name="r.icon" class="size-5" />
              </div>
              <div>
                <p class="font-semibold text-highlighted">{{ r.label }}</p>
                <p class="text-xs text-muted">{{ r.path }}</p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                :label="currentRole === r.id ? 'เลือกอยู่' : 'สลับสิทธิ์'"
                size="xs"
                :color="currentRole === r.id ? 'primary' : 'neutral'"
                :variant="currentRole === r.id ? 'solid' : 'outline'"
                @click="setRole(r.id); notify.info(`สลับบทบาทเป็น ${r.label}`)"
              />
              <UButton
                label="เปิดหน้านี้"
                size="xs"
                color="neutral"
                variant="subtle"
                icon="i-lucide-arrow-right"
                :to="r.path"
                @click="setRole(r.id)"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Database Connectivity / Students Smoke Test -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-database" class="size-5 text-muted" />
              <span class="font-semibold text-highlighted">ทดสอบฐานข้อมูล (Database Slice)</span>
            </div>
            <UButton
              label="เปิดจัดการนักศึกษา (Staff)"
              size="xs"
              color="primary"
              variant="outline"
              to="/staff/students"
            />
          </div>
        </template>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          title="ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
          :description="error.message"
        />

        <div v-else-if="status === 'pending'" class="flex items-center justify-center py-6">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
          <span class="ml-2 text-muted text-sm">กำลังตรวจสอบข้อมูล...</span>
        </div>

        <div v-else-if="!students?.length" class="text-center py-6 text-muted text-sm">
          <UIcon name="i-lucide-inbox" class="size-8 mx-auto mb-2 text-dimmed" />
          <p>ฐานข้อมูลพร้อมใช้งาน (ยังไม่มีรายชื่อนักศึกษา)</p>
        </div>

        <ul v-else class="divide-y divide-default">
          <li v-for="s in students" :key="s.id" class="py-2.5 flex items-center gap-3">
            <UIcon name="i-lucide-user" class="size-4 text-muted" />
            <span class="text-sm">{{ s.studentId }} — {{ s.firstName }} {{ s.lastName }}</span>
          </li>
        </ul>
      </UCard>
    </UContainer>
  </div>
</template>
