<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const router = useRouter()
const notify = useNotify()

const id = computed(() => Number(route.params.id))
const { data: app, status: fetchStatus, error: fetchError, refresh } = await useFetch<any>(() => `/api/student/applications/${id.value}`)

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const getStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งข้อมูลการสมัครแล้ว', color: 'info' as const }
    case 'AWAITING_RESPONSE':
      return { label: 'รอผลตอบกลับ', color: 'warning' as const }
    case 'INTERVIEW':
      return { label: 'รอสัมภาษณ์', color: 'info' as const }
    case 'ACCEPTED':
      return { label: 'บริษัทตอบรับแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'บริษัทปฏิเสธ', color: 'error' as const }
    case 'WITHDRAWN':
      return { label: 'ยกเลิกการสมัคร', color: 'neutral' as const }
    case 'CONFIRMED':
      return { label: 'ยืนยันและส่งคำร้องแล้ว', color: 'success' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

// Milestone update modal state
const isMilestoneModalOpen = ref(false)
const selectedMilestone = ref('')
const isUpdatingMilestone = ref(false)

const openMilestoneModal = () => {
  if (!app.value) return
  if (app.value.status === 'SUBMITTED') selectedMilestone.value = 'AWAITING_RESPONSE'
  else if (app.value.status === 'AWAITING_RESPONSE') selectedMilestone.value = 'INTERVIEW'
  else if (app.value.status === 'INTERVIEW') selectedMilestone.value = 'ACCEPTED'
  isMilestoneModalOpen.value = true
}

const handleUpdateMilestone = async () => {
  if (!selectedMilestone.value) return
  isUpdatingMilestone.value = true
  try {
    await $fetch(`/api/student/applications/${id.value}/outcome`, {
      method: 'POST',
      body: { status: selectedMilestone.value }
    })

    notify.success('อัปเดตสถานะการสมัครเรียบร้อยแล้ว')
    isMilestoneModalOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถอัปเดตสถานะได้')
  } finally {
    isUpdatingMilestone.value = false
  }
}

// Cancel application modal state
const isCancelModalOpen = ref(false)
const isCancelling = ref(false)

const handleCancelConfirm = async () => {
  isCancelling.value = true
  try {
    await $fetch(`/api/student/applications/${id.value}/outcome`, {
      method: 'POST',
      body: { status: 'WITHDRAWN' }
    })
    notify.success('ยกเลิกการสมัครเรียบร้อยแล้ว')
    isCancelModalOpen.value = false
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถยกเลิกการสมัครได้')
  } finally {
    isCancelling.value = false
  }
}

// Confirm application state (ACCEPTED -> CONFIRMED + Request)
const isConfirmModalOpen = ref(false)
const isConfirming = ref(false)

const handleConfirmApplication = async () => {
  isConfirming.value = true
  try {
    const createdRequest: any = await $fetch(`/api/student/applications/${id.value}/confirm`, {
      method: 'POST'
    })
    notify.success('ยืนยันสถานที่ฝึกงานและส่งคำร้องสำเร็จ!')
    isConfirmModalOpen.value = false
    await router.push(`/student/requests/${createdRequest.id}`)
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถยืนยันคำร้องได้')
  } finally {
    isConfirming.value = false
  }
}

// Delete REJECTED modal state
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const handleDeleteConfirm = async () => {
  isDeleting.value = true
  try {
    await $fetch(`/api/student/applications/${id.value}`, { method: 'DELETE' })
    notify.success('ลบรายการสมัครเรียบร้อยแล้ว')
    await router.push('/student/applications')
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถลบรายการได้')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="student-application-detail-page">
    <template #header>
      <UDashboardNavbar :title="app?.company?.name || 'รายละเอียดการสมัคร'">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/student/applications"
          />
        </template>
        <template #right>
          <UIButtonRefresh :loading="fetchStatus === 'pending'" @refresh="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-4xl pb-16 space-y-6">
        <UAlert
          v-if="fetchError"
          color="error"
          icon="i-lucide-circle-alert"
          title="ไม่พบข้อมูลการสมัคร"
          :description="fetchError.message"
        />

        <div v-else-if="fetchStatus === 'pending'" class="space-y-4">
          <USkeleton class="h-32 rounded-xl" />
          <USkeleton class="h-48 rounded-xl" />
        </div>

        <template v-else-if="app">
          <!-- Status Banner & Action Bar -->
          <div class="rounded-xl border border-default bg-default p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class=" text-xs text-muted">#{{ app.id }}</span>
                <UBadge :color="getStatusBadge(app.status).color" variant="subtle" size="md">
                  {{ getStatusBadge(app.status).label }}
                </UBadge>
              </div>
              <h1 class="text-xl font-bold text-highlighted">{{ app.company.name }}</h1>
              <p class="text-xs text-muted">ตำแหน่ง: {{ app.applicationPosition || '—' }} • ยื่นสมัครเมื่อ: {{ formatThaiDate(app.appliedAt) }}</p>
            </div>

            <!-- Contextual Actions -->
            <div class="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
              <!-- If active before ACCEPTED: Edit, Update Milestone, Cancel -->
              <template v-if="['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(app.status)">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-pencil"
                  label="แก้ไขข้อมูล"
                  :to="`/student/applications/${app.id}/edit`"
                />
                <UButton
                  color="primary"
                  icon="i-lucide-step-forward"
                  label="ระบุผล / ความคืบหน้า"
                  @click="openMilestoneModal"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  label="ยกเลิกการสมัคร"
                  @click="isCancelModalOpen = true"
                />
              </template>

              <!-- If ACCEPTED: Confirm & Send Request -->
              <template v-else-if="app.status === 'ACCEPTED'">
                <UButton
                  color="success"
                  size="md"
                  icon="i-lucide-check-circle"
                  label="ยืนยันสถานประกอบการและส่งคำร้อง"
                  @click="isConfirmModalOpen = true"
                />
              </template>

              <!-- If CONFIRMED: Link directly to Request Detail -->
              <template v-else-if="app.status === 'CONFIRMED'">
                <UButton
                  v-if="app.cooperativeRequest"
                  color="primary"
                  icon="i-lucide-file-text"
                  label="ไปยังคำร้องสถานที่ฝึกงาน"
                  :to="`/student/requests/${app.cooperativeRequest.id}`"
                />
              </template>

              <!-- If REJECTED: Delete option -->
              <template v-else-if="app.status === 'REJECTED'">
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  label="ลบรายการนี้"
                  @click="isDeleteModalOpen = true"
                />
              </template>
            </div>
          </div>

          <!-- Confirmed Lock Notice -->
          <div v-if="app.status === 'CONFIRMED'" class="rounded-xl border border-success/30 bg-success/5 p-4 text-xs text-success flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock" class="size-4 shrink-0" />
              <span>รายการนี้ได้รับการยืนยันและส่งคำร้องเรียบร้อยแล้ว ข้อมูลหลักถูกบันทึกเป็น Snapshot สำหรับเจ้าหน้าที่</span>
            </div>
            <UButton
              v-if="app.cooperativeRequest"
              size="xs"
              color="success"
              variant="outline"
              label="ดูคำร้อง"
              :to="`/student/requests/${app.cooperativeRequest.id}`"
            />
          </div>

          <!-- Application Details Grid -->
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Company Info Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-default/60 pb-3">
                <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted text-sm">ข้อมูลสถานประกอบการ</h3>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-muted block">ชื่อสถานประกอบการ</span>
                  <span class="font-medium text-highlighted text-sm">{{ app.company.name }}</span>
                </div>
                <div>
                  <span class="text-muted block">ที่อยู่</span>
                  <span class="text-highlighted">
                    {{ app.company.addressNo }} {{ app.company.street || '' }} {{ app.company.subdistrict }}, {{ app.company.district }}, จ.{{ app.company.province }} {{ app.company.postalCode }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span class="text-muted block">ผู้ประสานงาน</span>
                    <span class="text-highlighted">{{ app.company.contactPerson || '—' }}</span>
                  </div>
                  <div>
                    <span class="text-muted block">เบอร์โทรศัพท์</span>
                    <span class="text-highlighted">{{ app.company.phone || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Internship & Letter Details Card -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-default/60 pb-3">
                <UIcon name="i-lucide-mail" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted text-sm">ข้อมูลหนังสือและสถานที่ฝึก</h3>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-muted block">ผู้รับหนังสือขอความอนุเคราะห์</span>
                  <span class="font-medium text-highlighted">{{ app.recipientName || '—' }}</span>
                </div>
                <div>
                  <span class="text-muted block">ที่อยู่สำหรับออกหนังสือ</span>
                  <span class="text-highlighted">{{ app.letterAddress || '—' }}</span>
                </div>
                <div class="pt-1 border-t border-default/60">
                  <span class="text-muted block">สถานที่ฝึกจริง / สาขา</span>
                  <span class="text-highlighted">{{ app.internshipLocationName || '—' }}</span>
                </div>
                <div v-if="app.internshipLatitude && app.internshipLongitude" class="text-muted">
                  พิกัด: {{ app.internshipLatitude }}, {{ app.internshipLongitude }}
                </div>
              </div>
            </div>
          </div>

          <!-- Application Note -->
          <div v-if="app.note" class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-2">
            <h4 class="font-semibold text-highlighted text-xs">หมายเหตุ</h4>
            <p class="text-xs text-muted leading-relaxed whitespace-pre-line">{{ app.note }}</p>
          </div>
        </template>
      </div>

      <!-- Update Milestone Modal -->
      <UModal v-model:open="isMilestoneModalOpen">
        <template #content>
          <div class="p-6 space-y-4">
            <h3 class="text-base font-semibold text-highlighted">ระบุความคืบหน้า / ผลการสมัคร</h3>
            <p class="text-xs text-muted">เลือกสถานะใหม่ที่สอดคล้องกับการติดต่อกับสถานประกอบการ</p>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-highlighted">สถานะใหม่</label>
              <USelect
                v-model="selectedMilestone"
                :items="[
                  { label: 'รอผลตอบกลับ (Awaiting Response)', value: 'AWAITING_RESPONSE' },
                  { label: 'รอสัมภาษณ์ (Interview)', value: 'INTERVIEW' },
                  { label: 'บริษัทตอบรับแล้ว', value: 'ACCEPTED' },
                  { label: 'บริษัทปฏิเสธ (Rejected)', value: 'REJECTED' }
                ]"
                class="w-full"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" label="ยกเลิก" @click="isMilestoneModalOpen = false" />
              <UButton
                color="primary"
                label="บันทึกสถานะ"
                :loading="isUpdatingMilestone"
                @click="handleUpdateMilestone"
              />
            </div>
          </div>
        </template>
      </UModal>

      <!-- Cancel Application Modal -->
      <UIConfirmModal
        v-model:open="isCancelModalOpen"
        title="ยืนยันการยกเลิกการสมัคร"
        description="ท่านต้องการยกเลิกการสมัครสถานประกอบการนี้ใช่หรือไม่? การยกเลิกจะมีผลให้สถานะเป็น WITHDRAWN"
        confirm-label="ยืนยันการยกเลิก"
        confirm-color="error"
        :loading="isCancelling"
        @confirm="handleCancelConfirm"
      />

      <!-- Confirm Application Modal (ACCEPTED -> CONFIRMED + Request) -->
      <UIConfirmModal
        v-model:open="isConfirmModalOpen"
        title="ยืนยันสถานประกอบการและส่งคำร้อง"
        :description="`ยืนยันส่งคำร้องขอหนังสือขอความอนุเคราะห์สำหรับ ${app?.company?.name} ใช่หรือไม่? ข้อมูลสถานประกอบการจะถูกล็อกและส่งต่อไปยังเจ้าหน้าที่ทันที`"
        confirm-label="ยืนยันและส่งคำร้องทันที"
        confirm-color="success"
        :loading="isConfirming"
        @confirm="handleConfirmApplication"
      />

      <!-- Delete Rejected Modal -->
      <UIConfirmModal
        v-model:open="isDeleteModalOpen"
        title="ยืนยันการลบรายการสมัคร"
        description="ท่านต้องการลบรายการที่ถูกปฏิเสธนี้ใช่หรือไม่? ข้อมูลจะถูกลบออกจากระบบอย่างถาวร"
        confirm-label="ลบรายการ"
        confirm-color="error"
        :loading="isDeleting"
        @confirm="handleDeleteConfirm"
      />
    </template>
  </UDashboardPanel>
</template>
