<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface Placement {
  id: number
  companyName: string
  internshipLocationName: string | null
  position: string | null
  province: string | null
}

interface Review { rating: number, comment: string, status: 'PENDING' | 'APPROVED' | 'RETURNED', reviewerNote: string | null }
const { data, status, error, refresh } = await useFetch<{ placement: Placement | null, review: Review | null }>('/api/student/company-review')
const notify = useNotify()
const rating = ref(0)
const comment = ref('')
const savedAt = ref<string | null>(null)

watch(data, value => { rating.value = value?.review?.rating ?? 0; comment.value = value?.review?.comment ?? '' }, { immediate: true })

const saveDraft = () => {
  if (!data.value?.placement || !rating.value || !comment.value.trim()) {
    notify.error('กรุณาให้คะแนนและเขียนความคิดเห็นก่อนบันทึก')
    return
  }
  $fetch('/api/student/company-review', { method: 'POST', body: { requestId: data.value.placement.id, rating: rating.value, comment: comment.value } }).then(async () => { savedAt.value = new Date().toISOString(); await refresh(); notify.success('ส่งรีวิวให้เจ้าหน้าที่ตรวจสอบแล้ว') }).catch((err: any) => notify.error(err?.data?.message || 'ไม่สามารถบันทึกรีวิวได้'))
}

const formatSavedAt = computed(() => savedAt.value
  ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt.value))
  : null)
</script>

<template>
  <UDashboardPanel id="student-company-review-page">
    <template #header>
      <AppDashboardNavbar title="รีวิวสถานประกอบการ">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <div class="flex items-center gap-2">
            <UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" />
            <AppNotificationBell />
          </div>
        </template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-3xl space-y-6 pb-12">
        <div>
          <h1 class="text-xl font-bold text-highlighted">รีวิวสถานประกอบการ</h1>
          <p class="mt-1 text-sm text-muted">แบ่งปันประสบการณ์เกี่ยวกับสถานประกอบการที่คุณฝึกงาน</p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="ไม่สามารถโหลดข้อมูลสถานประกอบการได้"
          :description="error.message"
        />
        <div v-else-if="status === 'pending'" class="space-y-3">
          <USkeleton class="h-28 rounded-xl" />
          <USkeleton class="h-64 rounded-xl" />
        </div>

        <template v-else-if="data?.placement">
          <UCard>
            <div class="flex items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-building-2" class="size-5" />
              </span>
              <div class="min-w-0">
                <h2 class="break-words text-lg font-semibold text-highlighted">{{ data.placement.companyName }}</h2>
                <p class="mt-1 text-sm text-muted">
                  {{ data.placement.position || 'ไม่ระบุตำแหน่ง' }}<span v-if="data.placement.province"> · {{ data.placement.province }}</span>
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="text-base font-semibold text-highlighted">คะแนนและความคิดเห็น</h2>
                <p class="mt-1 text-xs text-muted">สถานะ: {{ data?.review?.status === 'APPROVED' ? 'เผยแพร่แล้ว' : data?.review?.status === 'RETURNED' ? 'ส่งกลับแก้ไข' : data?.review ? 'รอตรวจสอบ' : 'ยังไม่ส่งรีวิว' }}</p>
              </div>
            </template>

            <div class="space-y-5">
              <div>
                <span class="text-sm font-medium text-highlighted">คะแนนโดยรวม</span>
                <div class="mt-2 flex gap-1" role="radiogroup" aria-label="คะแนนสถานประกอบการ">
                  <button
                    v-for="score in 5"
                    :key="score"
                    type="button"
                    class="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                    :class="score <= rating ? 'text-primary' : ''"
                    :aria-label="`${score} ดาว`"
                    :aria-checked="rating === score"
                    role="radio"
                    tabindex="0"
                    @keydown.space.prevent="rating = score"
                    @keydown.enter.prevent="rating = score"
                    @keydown.right.prevent="rating = Math.min(5, (rating || 0) + 1)"
                    @keydown.left.prevent="rating = Math.max(1, (rating || 0) - 1)"
                    @click="rating = score"
                  >
                    <UIcon name="i-lucide-star" class="size-7" :class="score <= rating ? 'fill-current' : ''" />
                  </button>
                </div>
              </div>

              <UFormField label="ความคิดเห็น" required>
                <UTextarea
                  id="company-review-comment"
                  v-model="comment"
                  size="xl"
                  :rows="6"
                  placeholder="เล่าประสบการณ์ สภาพแวดล้อมการทำงาน หรือคำแนะนำสำหรับนักศึกษารุ่นต่อไป"
                  class="w-full"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span class="text-xs text-muted">{{ formatSavedAt ? `บันทึกล่าสุด ${formatSavedAt}` : 'ยังไม่ได้บันทึกแบบร่าง' }}</span>
                <UButton size="xl" color="primary" icon="i-lucide-send" :label="data?.review ? 'แก้ไขและส่งใหม่' : 'ส่งรีวิว'" @click="saveDraft" />
              </div>
            </template>
          </UCard>
        </template>

        <UEmpty v-else icon="i-lucide-building-2" title="ยังไม่มีสถานประกอบการที่ยืนยันแล้ว" description="คุณจะเขียนรีวิวได้เมื่อสถานที่ฝึกงานได้รับการยืนยันแล้ว" />
      </div>
    </template>
  </UDashboardPanel>
</template>
