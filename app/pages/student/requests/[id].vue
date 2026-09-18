<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const notify = useNotify()

const id = computed(() => Number(route.params.id))
const { data: request, status: fetchStatus, error: fetchError, refresh } = await useFetch<any>(() => `/api/student/requests/${id.value}`)

const formatThaiDate = (val?: string | null) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(val))
}

const getReqStatusBadge = (s: string) => {
  switch (s) {
    case 'SUBMITTED':
      return { label: 'ส่งคำร้องแล้ว', color: 'info' as const }
    case 'STAFF_PROCESSING':
      return { label: 'รอเจ้าหน้าที่ดำเนินการ', color: 'warning' as const }
    case 'LETTER_READY':
      return { label: 'มีหนังสือพร้อมดาวน์โหลด', color: 'primary' as const }
    case 'DOCUMENT_UNDER_REVIEW':
      return { label: 'รอตรวจสอบเอกสาร', color: 'warning' as const }
    case 'RETURNED_FOR_REVISION':
      return { label: 'ถูกส่งกลับให้แก้ไข', color: 'error' as const }
    case 'PLACEMENT_CONFIRMED':
      return { label: 'ยืนยันสถานที่ฝึกงานแล้ว', color: 'success' as const }
    case 'REJECTED':
      return { label: 'ไม่ผ่านการยืนยัน', color: 'error' as const }
    case 'CANCELLED':
      return { label: 'ยกเลิกคำร้อง', color: 'neutral' as const }
    default:
      return { label: s, color: 'neutral' as const }
  }
}

// Upload modal state
const isUploadModalOpen = ref(false)
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    notify.error('กรุณาเลือกไฟล์เอกสาร')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    await $fetch(`/api/student/requests/${id.value}/signed-document`, {
      method: 'POST',
      body: formData
    })

    notify.success('อัปโหลดหนังสือตอบรับเรียบร้อยแล้ว')
    isUploadModalOpen.value = false
    selectedFile.value = null
    await refresh()
  } catch (err: any) {
    notify.error(err.data?.message || 'ไม่สามารถอัปโหลดเอกสารได้')
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="student-request-detail-page">
    <template #header>
      <UDashboardNavbar :title="`คำร้อง REQ-${String(id).padStart(4, '0')}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/student/requests"
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
          title="ไม่พบข้อมูลคำร้อง"
          :description="fetchError.message"
        />

        <div v-else-if="fetchStatus === 'pending'" class="space-y-4">
          <USkeleton class="h-32 rounded-xl" />
          <USkeleton class="h-48 rounded-xl" />
        </div>

        <template v-else-if="request">
          <!-- Status Banner & Primary Actions -->
          <div class="rounded-xl border border-default bg-default p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class=" text-xs text-muted">REQ-{{ String(request.id).padStart(4, '0') }}</span>
                <UBadge :color="getReqStatusBadge(request.status).color" variant="subtle" size="md">
                  {{ getReqStatusBadge(request.status).label }}
                </UBadge>
              </div>
              <h1 class="text-xl font-bold text-highlighted">{{ request.companyName }}</h1>
              <p class="text-xs text-muted">ตำแหน่ง: {{ request.position || '—' }} • ส่งคำร้องเมื่อ: {{ formatThaiDate(request.confirmedAt) }}</p>
            </div>

            <!-- Actions based on state -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Download Official Letter -->
              <UButton
                v-if="request.letterFilePath || ['LETTER_READY', 'DOCUMENT_UNDER_REVIEW', 'RETURNED_FOR_REVISION', 'PLACEMENT_CONFIRMED'].includes(request.status)"
                color="primary"
                variant="outline"
                icon="i-lucide-download"
                label="ดาวน์โหลดหนังสือขอความอนุเคราะห์"
                :to="`/api/student/requests/${request.id}/letter`"
                target="_blank"
              />

              <!-- Upload Signed Document -->
              <UButton
                v-if="['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(request.status)"
                color="success"
                icon="i-lucide-upload"
                :label="request.status === 'RETURNED_FOR_REVISION' ? 'อัปโหลดฉบับแก้ไข' : 'ส่งหนังสือตอบรับ'"
                @click="isUploadModalOpen = true"
              />
            </div>
          </div>

          <!-- Alert if Returned for Revision -->
          <UAlert
            v-if="request.status === 'RETURNED_FOR_REVISION'"
            color="error"
            icon="i-lucide-circle-alert"
            title="เอกสารถูกส่งกลับให้แก้ไข"
            :description="request.returnedReason || 'กรุณาตรวจสอบความถูกต้องของหนังสือตอบรับและอัปโหลดฉบับใหม่'"
            :actions="[{ label: 'อัปโหลดฉบับใหม่', color: 'error', onClick: () => { isUploadModalOpen = true } }]"
          />

          <!-- Snapshot Information Grid -->
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Company & Location Snapshot -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-default/60 pb-3">
                <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted text-sm">ข้อมูลสถานที่และตำแหน่ง (Snapshot)</h3>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-muted block">สถานประกอบการ</span>
                  <span class="font-medium text-highlighted text-sm">{{ request.companyName }}</span>
                </div>
                <div>
                  <span class="text-muted block">ตำแหน่งฝึกงาน</span>
                  <span class="text-highlighted font-medium">{{ request.position || '—' }}</span>
                </div>
                <div>
                  <span class="text-muted block">ที่อยู่</span>
                  <span class="text-highlighted">{{ request.address || '—' }} จ.{{ request.province || '' }}</span>
                </div>
                <div>
                  <span class="text-muted block">สถานที่ฝึกปฏิบัติงานจริง</span>
                  <span class="text-highlighted">{{ request.internshipLocationName || '—' }}</span>
                </div>
                <div v-if="request.latitude && request.longitude" class="text-muted pt-1">
                  พิกัด: {{ request.latitude }}, {{ request.longitude }}
                </div>
              </div>
            </div>

            <!-- Recipient & Letter Address Snapshot -->
            <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-default/60 pb-3">
                <UIcon name="i-lucide-mail" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted text-sm">ข้อมูลสำหรับออกหนังสือ (Snapshot)</h3>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-muted block">ผู้รับหนังสือ</span>
                  <span class="font-medium text-highlighted">{{ request.recipientName || '—' }}</span>
                </div>
                <div v-if="request.recipientPosition">
                  <span class="text-muted block">ตำแหน่งผู้รับ</span>
                  <span class="text-highlighted">{{ request.recipientPosition }}</span>
                </div>
                <div>
                  <span class="text-muted block">ที่อยู่สำหรับออกหนังสือ</span>
                  <span class="text-highlighted">{{ request.letterAddress || '—' }}</span>
                </div>
                <div v-if="request.studentNote" class="pt-2 border-t border-default/60">
                  <span class="text-muted block">ข้อความเพิ่มเติมถึงเจ้าหน้าที่</span>
                  <p class="text-highlighted whitespace-pre-line">{{ request.studentNote }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Documents History Card -->
          <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-files" class="size-5 text-primary" />
                <h3 class="font-semibold text-highlighted text-sm">ประวัติเอกสารที่เกี่ยวข้อง</h3>
              </div>
              <UButton
                v-if="['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(request.status)"
                size="xs"
                color="primary"
                icon="i-lucide-upload"
                label="อัปโหลดเอกสาร"
                @click="isUploadModalOpen = true"
              />
            </div>

            <div v-if="request.documents && request.documents.length > 0" class="divide-y divide-default border border-default rounded-lg overflow-hidden">
              <div
                v-for="doc in request.documents"
                :key="doc.id"
                class="p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-file-text" class="size-4 text-primary shrink-0" />
                    <span class="font-medium text-highlighted truncate">{{ doc.fileName }}</span>
                    <UBadge size="xs" variant="subtle" color="neutral">v.{{ doc.version }}</UBadge>
                    <UBadge
                      size="xs"
                      variant="subtle"
                      :color="doc.status === 'APPROVED' ? 'success' : (doc.status === 'RETURNED_FOR_REVISION' ? 'error' : 'info')"
                    >
                      {{ doc.status }}
                    </UBadge>
                  </div>
                  <p class="text-muted text-[11px]">
                    ส่งเมื่อ: {{ formatThaiDate(doc.createdAt) }} • ขนาด: {{ Math.round(doc.fileSize / 1024) }} KB
                  </p>
                  <p v-if="doc.reviewerNote" class="text-error text-[11px]">
                    ข้อคิดเห็นจากเจ้าหน้าที่: {{ doc.reviewerNote }}
                  </p>
                </div>

                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-download"
                  label="ดูเอกสาร"
                  :to="`/api/student/documents/${doc.id}/download`"
                  target="_blank"
                />
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-muted">
              ยังไม่มีประวัติการส่งเอกสารตอบรับ
            </div>
          </div>
        </template>
      </div>

      <!-- Upload Modal -->
      <UModal v-model:open="isUploadModalOpen">
        <template #content>
          <div class="p-6 space-y-4">
            <h3 class="text-base font-semibold text-highlighted">อัปโหลดหนังสือตอบรับสถานประกอบการ</h3>
            <p class="text-xs text-muted leading-relaxed">
              รองรับไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10MB กรุณาตรวจสอบให้แน่ใจว่าเอกสารมีตราประทับหรือลายเซ็นผู้มีอำนาจครบถ้วน
            </p>

            <div class="space-y-2 pt-2">
              <label class="block text-xs font-medium text-highlighted">เลือกไฟล์เอกสาร</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                class="block w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                @change="onFileChange"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" label="ยกเลิก" @click="isUploadModalOpen = false" />
              <UButton
                color="primary"
                icon="i-lucide-upload"
                label="อัปโหลด"
                :loading="isUploading"
                :disabled="!selectedFile"
                @click="handleUpload"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
