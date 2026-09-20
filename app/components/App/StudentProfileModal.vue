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
  <UModal
    v-model:open="open"
    title="แก้ไขข้อมูลส่วนตัว"
    description="ตรวจสอบข้อมูลนักศึกษาและแก้ไขข้อมูลติดต่อ"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดข้อมูลส่วนตัวได้"
          :description="error.message"
        />

        <div v-else-if="status === 'pending'" class="space-y-3">
          <USkeleton class="h-24 rounded-xl" />
          <USkeleton class="h-20 rounded-xl" />
        </div>

        <div v-else-if="profile" class="space-y-4">
          <div class="rounded-xl border border-divider bg-surface p-4">
            <h3 class="break-words text-sm font-semibold text-highlighted">{{ profile.name }}</h3>
            <dl class="mt-3 grid gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt class="text-muted">รหัสนักศึกษา</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ profile.loginId }}</dd>
              </div>
              <div>
                <dt class="text-muted">รุ่นนักศึกษา</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ profile.cohortYear || '—' }}</dd>
              </div>
              <div>
                <dt class="text-muted">หมู่เรียน</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ profile.classGroup || '—' }}</dd>
              </div>
            </dl>
          </div>

          <UFormField label="เบอร์โทรศัพท์มือถือ" name="phone">
            <UInput
              id="profile-phone"
              v-model="phone"
              size="xl"
              placeholder="เช่น 0812345678"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="profile" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
        <UButton size="xl" color="neutral" variant="ghost" label="ยกเลิก" @click="open = false" />
        <UButton size="xl" color="primary" icon="i-lucide-save" label="บันทึกข้อมูล" :loading="isSaving" @click="handleSave" />
      </div>
    </template>
  </UModal>
</template>
