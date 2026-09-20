<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const notify = useNotify()

const { data: profile, status, error, refresh } = await useFetch<any>('/api/student/profile')

const phone = ref('')
const isSaving = ref(false)

watch(profile, (p) => {
  if (p) phone.value = p.phone || ''
}, { immediate: true })

const handleSavePhone = async () => {
  isSaving.value = true
  try {
    await $fetch('/api/student/profile', {
      method: 'PATCH',
      body: { phone: phone.value }
    })
    notify.success('อัปเดตเบอร์โทรศัพท์เรียบร้อยแล้ว')
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถบันทึกข้อมูลได้')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="student-profile-page">
    <template #header>
      <AppDashboardNavbar title="ข้อมูลส่วนตัว">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-2xl pb-16 space-y-6">
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดข้อมูลส่วนตัวได้"
          :description="error.message"
        />

        <div v-else-if="status === 'pending'" class="space-y-4">
          <USkeleton class="h-48 rounded-xl" />
        </div>

        <div v-else-if="profile" class="space-y-6">
          <!-- Student Info Card -->
          <div class="rounded-xl border border-default bg-default p-6 shadow-xs space-y-4">
            <div class="flex items-center gap-3 border-b border-default/60 pb-4">
              <div class="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                <UIcon name="i-lucide-user" class="size-6" />
              </div>
              <div>
                <h2 class="font-bold text-highlighted text-lg">{{ profile.name }}</h2>
                <p class="text-xs text-muted">รหัสนักศึกษา: {{ profile.loginId }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="text-muted block">รุ่นนักศึกษา (พ.ศ.)</span>
                <span class="font-medium text-highlighted text-sm">{{ profile.cohortYear || '—' }}</span>
              </div>
              <div>
                <span class="text-muted block">หมู่เรียน</span>
                <span class="font-medium text-highlighted text-sm">{{ profile.classGroup || '—' }}</span>
              </div>
              <div>
                <span class="text-muted block">สถานะบัญชี</span>
                <UBadge :color="profile.isActive ? 'success' : 'neutral'" variant="subtle" size="xs">
                  {{ profile.isActive ? 'ใช้งานปกติ' : 'ระงับการใช้งาน' }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Contact Info Card -->
          <div class="rounded-xl border border-default bg-default p-6 shadow-xs space-y-4">
            <h3 class="font-semibold text-highlighted text-sm">ข้อมูลติดต่อ</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-highlighted mb-1">เบอร์โทรศัพท์มือถือ</label>
                <div class="flex gap-2">
                  <UInput v-model="phone" placeholder="เช่น 0812345678" class="flex-1" />
                  <UButton
                    color="primary"
                    label="บันทึกเบอร์โทร"
                    :loading="isSaving"
                    @click="handleSavePhone"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Account Security Link -->
          <div class="rounded-xl border border-default bg-default p-5 shadow-xs flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-highlighted text-sm">ความปลอดภัยบัญชี</h4>
              <p class="text-xs text-muted">เปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบ</p>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-key-round"
              label="เปลี่ยนรหัสผ่าน"
              to="/account/password"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
