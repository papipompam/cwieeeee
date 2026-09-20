<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface Placement {
  id: number
  companyName: string
  internshipLocationName: string | null
  position: string | null
  province: string | null
}

const { data, status, error, refresh } = await useFetch<{ placement: Placement | null }>('/api/student/placement')
const notify = useNotify()
const rating = ref(0)
const comment = ref('')
const savedAt = ref<string | null>(null)

const draftKey = computed(() => data.value?.placement ? `company-review-draft:${data.value.placement.id}` : null)

onMounted(() => {
  if (!draftKey.value) return
  const draft = localStorage.getItem(draftKey.value)
  if (!draft) return
  try {
    const parsed = JSON.parse(draft)
    rating.value = Number(parsed.rating) || 0
    comment.value = typeof parsed.comment === 'string' ? parsed.comment : ''
    savedAt.value = typeof parsed.savedAt === 'string' ? parsed.savedAt : null
  } catch {
    localStorage.removeItem(draftKey.value)
  }
})

const saveDraft = () => {
  if (!draftKey.value || !rating.value || !comment.value.trim()) {
    notify.error('กรุณาให้คะแนนและเขียนความคิดเห็นก่อนบันทึก')
    return
  }
  savedAt.value = new Date().toISOString()
  localStorage.setItem(draftKey.value, JSON.stringify({
    rating: rating.value,
    comment: comment.value.trim(),
    savedAt: savedAt.value
  }))
  notify.success('บันทึกแบบร่างรีวิวในอุปกรณ์นี้แล้ว')
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
        <template #right><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></template>
      </AppDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-3xl space-y-6 pb-12">
        <div>
          <h1 class="text-2xl font-bold text-highlighted">รีวิวสถานประกอบการ</h1>
          <p class="mt-1 text-lg text-muted">แบ่งปันประสบการณ์เกี่ยวกับสถานประกอบการที่คุณฝึกงาน</p>
        </div>

        <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" title="ไม่สามารถโหลดข้อมูลสถานประกอบการได้" :description="error.message" />
        <div v-else-if="status === 'pending'" class="space-y-3"><USkeleton class="h-28 rounded-xl" /><USkeleton class="h-64 rounded-xl" /></div>

        <template v-else-if="data?.placement">
          <section class="rounded-2xl border border-default bg-default p-5 shadow-xs sm:p-6">
            <div class="flex items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><UIcon name="i-lucide-building-2" class="size-5" /></span>
              <div class="min-w-0">
                <h2 class="break-words text-xl font-semibold text-highlighted">{{ data.placement.companyName }}</h2>
                <p class="mt-1 text-lg text-muted">{{ data.placement.position || 'ไม่ระบุตำแหน่ง' }}<span v-if="data.placement.province"> · {{ data.placement.province }}</span></p>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-default bg-default p-5 shadow-xs sm:p-6">
            <div>
              <h2 class="text-xl font-semibold text-highlighted">คะแนนและความคิดเห็น</h2>
              <p class="mt-1 text-lg text-muted">ข้อมูลส่วนนี้เป็นแบบร่างที่เก็บไว้เฉพาะในอุปกรณ์นี้</p>
            </div>

            <div class="mt-5">
              <span class="text-lg font-medium text-highlighted">คะแนนโดยรวม</span>
              <div class="mt-2 flex gap-1" role="radiogroup" aria-label="คะแนนสถานประกอบการ">
                <button v-for="score in 5" :key="score" type="button" class="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary" :class="score <= rating ? 'text-primary' : ''" :aria-label="`${score} ดาว`" :aria-checked="rating === score" role="radio" @click="rating = score">
                  <UIcon name="i-lucide-star" class="size-7" :class="score <= rating ? 'fill-current' : ''" />
                </button>
              </div>
            </div>

            <div class="mt-5">
              <label for="company-review-comment" class="mb-1.5 block text-lg font-medium text-highlighted">ความคิดเห็น</label>
              <UTextarea id="company-review-comment" v-model="comment" :rows="6" placeholder="เล่าประสบการณ์ สภาพแวดล้อมการทำงาน หรือคำแนะนำสำหรับนักศึกษารุ่นต่อไป" class="w-full" />
            </div>

            <div class="mt-5 flex flex-col gap-2 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span class="text-base text-muted">{{ formatSavedAt ? `บันทึกล่าสุด ${formatSavedAt}` : 'ยังไม่ได้บันทึกแบบร่าง' }}</span>
              <UButton color="primary" icon="i-lucide-save" label="บันทึกแบบร่าง" @click="saveDraft" />
            </div>
          </section>
        </template>

        <UEmpty v-else icon="i-lucide-building-2" title="ยังไม่มีสถานประกอบการที่ยืนยันแล้ว" description="คุณจะเขียนรีวิวได้เมื่อสถานที่ฝึกงานได้รับการยืนยันแล้ว" />
      </div>
    </template>
  </UDashboardPanel>
</template>
