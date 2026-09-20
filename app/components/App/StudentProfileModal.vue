<script setup lang="ts">
const open = useState('student-profile-modal-open', () => false)
const notify = useNotify()

const { data: profile, status, error, refresh } = await useFetch<any>('/api/student/profile', {
  immediate: false
})

const phone = ref('')
const isSaving = ref(false)

watch(open, async (isOpen) => {
  if (isOpen) await refresh()
})

watch(profile, (value) => {
  if (value) phone.value = value.phone || ''
}, { immediate: true })

const handleSave = async () => {
  isSaving.value = true
  try {
    await $fetch('/api/student/profile', {
      method: 'PATCH',
      body: { phone: phone.value }
    })
    notify.success('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว')
    await refresh()
    open.value = false
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถบันทึกข้อมูลได้')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="แก้ไขข้อมูลส่วนตัว" description="ตรวจสอบข้อมูลนักศึกษาและแก้ไขข้อมูลติดต่อ">
    <template #content>
      <div class="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">แก้ไขข้อมูลส่วนตัว</h2>
            <p class="mt-1 text-lg text-muted">ตรวจสอบข้อมูลนักศึกษาและแก้ไขข้อมูลติดต่อ</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" aria-label="ปิด" @click="open = false" />
        </div>

        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดข้อมูลส่วนตัวได้" :description="error.message" class="mt-5" />
        <div v-else-if="status === 'pending'" class="mt-5 space-y-3"><USkeleton class="h-24 rounded-xl" /><USkeleton class="h-20 rounded-xl" /></div>

        <div v-else-if="profile" class="mt-5 space-y-5">
          <div class="rounded-xl border border-default bg-elevated/50 p-4">
            <h3 class="break-words text-base font-medium text-highlighted">{{ profile.name }}</h3>
            <dl class="mt-4 grid gap-4 text-lg sm:grid-cols-3">
              <div><dt class="text-base text-muted">รหัสนักศึกษา</dt><dd class="mt-1 font-medium text-highlighted">{{ profile.loginId }}</dd></div>
              <div><dt class="text-base text-muted">รุ่นนักศึกษา</dt><dd class="mt-1 font-medium text-highlighted">{{ profile.cohortYear || '—' }}</dd></div>
              <div><dt class="text-base text-muted">หมู่เรียน</dt><dd class="mt-1 font-medium text-highlighted">{{ profile.classGroup || '—' }}</dd></div>
            </dl>
          </div>

          <div>
            <label for="profile-phone" class="mb-1.5 block text-lg font-medium text-highlighted">เบอร์โทรศัพท์มือถือ</label>
            <UInput id="profile-phone" v-model="phone" placeholder="เช่น 0812345678" class="w-full" />
          </div>

          <div class="flex flex-col-reverse gap-2 border-t border-default pt-4 sm:flex-row sm:justify-end">
            <UButton color="neutral" variant="ghost" label="ยกเลิก" @click="open = false" />
            <UButton color="primary" icon="i-lucide-save" label="บันทึกข้อมูล" :loading="isSaving" @click="handleSave" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
