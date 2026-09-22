<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const companyId = computed(() => Number(route.params.companyId))
const { data, status, error, refresh } = await useFetch<any>(() => `/api/staff/cooperative-cycles/${cycleId.value}/companies/${companyId.value}`)
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const applicationRows = computed<any[]>(() => data.value?.company.companyApplications || [])
const refreshPage = () => refresh()
const requestStatus = (status?: string) => ({
  SUBMITTED: 'ยื่นคำร้องแล้ว', STAFF_PROCESSING: 'กำลังดำเนินการ', LETTER_READY: 'หนังสือพร้อมแล้ว', DOCUMENT_UNDER_REVIEW: 'รอตรวจสอบเอกสาร', RETURNED_FOR_REVISION: 'ส่งกลับแก้ไข', PLACEMENT_CONFIRMED: 'ยืนยันสถานที่แล้ว', REJECTED: 'ปฏิเสธคำร้อง', CANCELLED: 'ยกเลิกคำร้อง'
}[status || ''] || '—')
const latestLetterUrl = computed(() => data.value?.latestDocumentRequestId ? `/api/staff/cooperative-cycles/${cycleId.value}/requests/${data.value.latestDocumentRequestId}/letter` : null)
</script>

<template>
  <div class="w-full space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 class="text-xl font-bold text-ink">รายละเอียดสถานประกอบการ</h1><p class="mt-1 text-sm text-muted">นักศึกษาและเอกสารที่เกี่ยวข้องในรอบสหกิจนี้</p></div>
      <div class="flex flex-wrap gap-2"><UButton v-if="latestLetterUrl" :to="latestLetterUrl" target="_blank" color="neutral" variant="outline" size="xl" icon="i-lucide-external-link" label="ดูเอกสารล่าสุด" /><UButton v-if="latestLetterUrl" :to="latestLetterUrl" :download="true" color="primary" size="xl" icon="i-lucide-download" label="ดาวน์โหลด" /><UButton :to="`/staff/cooperative-cycles/${cycleId}/applications`" color="neutral" variant="outline" size="xl" icon="i-lucide-arrow-left" label="กลับไปคำร้อง" /><UIButtonRefresh :loading="status === 'pending'" @refresh="refresh" /></div>
    </div>
      <div v-if="status === 'pending'" class="space-y-4 p-5 sm:p-6"><USkeleton class="h-36" /><USkeleton class="h-72" /></div>
      <div v-else-if="error" class="p-5 sm:p-6"><UEmpty icon="i-lucide-triangle-alert" title="ไม่สามารถโหลดข้อมูลสถานประกอบการ" :description="error.message"><template #actions><UButton size="xl" @click="refreshPage">ลองอีกครั้ง</UButton></template></UEmpty></div>
      <div v-else-if="data" class="space-y-6 p-5 sm:p-6">
        <UCard>
          <h1 class="text-xl font-bold text-ink">{{ data.company.name }}</h1>
          <p class="mt-1 text-sm text-muted">{{ data.company.address || data.company.province || 'ไม่มีข้อมูลที่อยู่' }}</p>
          <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt class="text-muted">รอบสหกิจ</dt><dd class="mt-1 font-medium text-ink">{{ data.cycle.term }}/{{ data.cycle.academicYear }}</dd></div><div><dt class="text-muted">ระยะเวลาฝึก (กำหนดการรอบ)</dt><dd class="mt-1 font-medium text-ink">{{ formatDate(data.cycle.internshipStartDate) }} – {{ formatDate(data.cycle.internshipEndDate) }}</dd></div><div><dt class="text-muted">ชั่วโมงฝึก</dt><dd class="mt-1 font-medium text-ink">{{ data.cycle.internshipHours || '—' }} ชั่วโมง</dd></div></dl>
        </UCard>
        <UCard :ui="{ body: 'p-0' }"><div class="border-b border-divider p-5 sm:p-6"><h2 class="text-lg font-bold text-ink">นักศึกษาในสถานประกอบการ</h2></div><div class="w-full overflow-x-auto"><UTable :data="applicationRows" class="min-w-full" :columns="[{ id: 'student', header: 'นักศึกษา' }, { id: 'position', header: 'ตำแหน่ง' }, { id: 'status', header: 'สถานะ' }]" :ui="{ base: 'w-full min-w-[42rem]' }"><template #student-cell="{ row }"><div><p class="font-medium text-ink">{{ row.original.studentUser.prefix }}{{ row.original.studentUser.firstName }} {{ row.original.studentUser.lastName }}</p><p class="text-xs text-muted">{{ row.original.studentUser.loginId }}</p></div></template><template #position-cell="{ row }">{{ row.original.cooperativeRequest?.position || row.original.applicationPosition || '—' }}</template><template #status-cell="{ row }"><UBadge variant="subtle" :label="requestStatus(row.original.cooperativeRequest?.status)" /></template></UTable></div></UCard>
        <UCard :ui="{ body: 'p-0' }"><div class="border-b border-divider p-5 sm:p-6"><h2 class="text-lg font-bold text-ink">ประวัติเอกสาร</h2></div><div class="divide-y divide-divider"><div v-for="letter in data.letters" :key="letter.id" class="p-5 sm:p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="font-semibold text-ink">หนังสือขอความอนุเคราะห์ เลขที่ {{ letter.letterNumber || '—' }}</p><p class="mt-1 text-sm text-muted">ออกวันที่ {{ formatDate(letter.issueDate) }} · {{ letter.isActive ? 'ฉบับปัจจุบัน' : 'ฉบับเดิม' }}</p></div><UBadge :color="letter.responseDocuments[0]?.status === 'APPROVED' ? 'success' : 'warning'" variant="subtle" :label="letter.responseDocuments[0] ? `หนังสือตอบรับ: ${letter.responseDocuments[0].status}` : 'ยังไม่มีหนังสือตอบรับ'" /></div><p class="mt-3 text-sm text-muted">{{ letter.participants.map((item: any) => item.studentName).join(', ') }}</p></div><UEmpty v-if="!data.letters.length" icon="i-lucide-file-x" title="ยังไม่มีเอกสาร" description="ยังไม่เคยออกหนังสือสำหรับสถานประกอบการนี้" class="min-h-44" /></div></UCard>
      </div>
  </div>
</template>
