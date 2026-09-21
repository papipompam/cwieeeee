<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const requestId = computed(() => Number(route.params.requestId))
const previewUrl = ref<string | null>(null)
const errorMessage = ref('')
const isLoading = ref(true)

const getApiErrorMessage = async (err: unknown) => {
  const fetchError = err as { data?: unknown }
  if (fetchError.data instanceof Blob) {
    try {
      const body = JSON.parse(await fetchError.data.text())
      if (typeof body?.message === 'string') return body.message
    } catch {
      // Use the safe fallback below when the response body is not JSON.
    }
  }
  return 'ไม่สามารถสร้างตัวอย่างเอกสารได้'
}

const loadPreview = async () => {
  const letterNumber = typeof route.query.letterNumber === 'string' ? route.query.letterNumber.trim() : ''
  const issueDate = typeof route.query.issueDate === 'string' ? route.query.issueDate : ''

  if (!letterNumber || !issueDate) {
    errorMessage.value = 'กรุณาระบุเลขที่และวันที่ออกหนังสือก่อนเปิดหน้าตัวอย่าง'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)

  try {
    const pdf = await $fetch<Blob>(`/api/staff/cooperative-cycles/${cycleId.value}/requests/${requestId.value}/letter/preview`, {
      method: 'POST',
      body: { letterNumber, issueDate },
      responseType: 'blob'
    })
    previewUrl.value = URL.createObjectURL(pdf)
  } catch (err) {
    errorMessage.value = await getApiErrorMessage(err)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPreview)
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :to="`/staff/cooperative-cycles/${cycleId}/applications/${requestId}`"
          aria-label="กลับไปรายละเอียดคำร้อง"
        />
        <div>
          <h1 class="text-lg font-bold text-ink">ตัวอย่างหนังสือขอความอนุเคราะห์</h1>
          <p class="mt-1 text-sm text-muted">ตรวจรายละเอียดเอกสารแบบเต็มหน้าก่อนยืนยันจัดทำฉบับจริง</p>
        </div>
      </div>
      <UButton
        label="กลับไปรายละเอียดคำร้อง"
        icon="i-lucide-file-pen-line"
        color="primary"
        size="xl"
        :to="`/staff/cooperative-cycles/${cycleId}/applications/${requestId}`"
      />
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      icon="i-lucide-circle-alert"
      title="ไม่สามารถแสดงตัวอย่างได้"
      :description="errorMessage"
    />

    <div v-else class="rounded-panel border border-divider bg-canvas p-3 shadow-panel sm:p-5">
      <div v-if="isLoading" class="grid min-h-[70vh] place-items-center text-muted">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="mx-auto size-8 animate-spin text-primary" />
          <p class="mt-3 text-sm">กำลังสร้างตัวอย่างเอกสาร...</p>
        </div>
      </div>
      <iframe
        v-else-if="previewUrl"
        :src="previewUrl"
        title="ตัวอย่างหนังสือขอความอนุเคราะห์แบบเต็มหน้า"
        class="h-[calc(100vh-16rem)] min-h-[42rem] w-full rounded-control border border-divider bg-canvas"
      />
    </div>
  </div>
</template>
