<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface DocumentSettings {
  signerName: string
  signerTitle: string
  hasSignature: boolean
  updatedAt: string | null
  source: 'DATABASE' | 'ENVIRONMENT'
  templates: { requestLetter: string | null, sendingLetter: string | null }
}

const notify = useNotify()
const saving = ref(false)
const uploadingSignature = ref(false)
const uploadingTemplate = ref<string | null>(null)
const settings = ref<DocumentSettings | null>(null)
const form = reactive({ signerName: '', signerTitle: '' })

async function loadSettings() {
  try {
    const value = await $fetch<DocumentSettings>('/api/staff/settings/documents')
    settings.value = value
    form.signerName = value.signerName
    form.signerTitle = value.signerTitle
  } catch (error: any) {
    notify.error(error?.data?.message || 'ไม่สามารถโหลดการตั้งค่าเอกสารได้')
  }
}

async function saveSigner() {
  saving.value = true
  try {
    await $fetch('/api/staff/settings/documents', { method: 'PUT', body: form })
    await loadSettings()
    notify.success('บันทึกข้อมูลผู้ลงนามเรียบร้อยแล้ว')
  } catch (error: any) {
    notify.error(error?.data?.message || 'ไม่สามารถบันทึกข้อมูลผู้ลงนามได้')
  } finally {
    saving.value = false
  }
}

async function uploadSignature(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingSignature.value = true
  try {
    const data = new FormData()
    data.append('file', file)
    await $fetch('/api/staff/settings/documents/signature', { method: 'POST', body: data })
    await loadSettings()
    notify.success('อัปโหลดลายเซ็นเรียบร้อยแล้ว')
  } catch (error: any) {
    notify.error(error?.data?.message || 'ไม่สามารถอัปโหลดลายเซ็นได้')
  } finally {
    input.value = ''
    uploadingSignature.value = false
  }
}
async function uploadTemplate(type: 'request-letter' | 'sending-letter', event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]
  if (!file) return
  uploadingTemplate.value = type
  try { const data = new FormData(); data.append('file', file); await $fetch(`/api/staff/settings/documents/templates/${type}`, { method: 'POST', body: data }); await loadSettings(); notify.success('แนบไฟล์ตัวอย่างเรียบร้อยแล้ว') }
  catch (error: any) { notify.error(error?.data?.message || 'ไม่สามารถแนบไฟล์ตัวอย่างได้') }
  finally { input.value = ''; uploadingTemplate.value = null }
}

await loadSettings()
</script>

<template>
  <UDashboardPanel id="staff-settings-documents">
    <template #header><AppDashboardNavbar title="จัดการเอกสาร" /></template>
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-2xl space-y-1">
              <h2 class="text-lg font-semibold text-ink">ศูนย์จัดการเอกสารราชการ</h2>
              <p class="text-sm leading-6 text-muted">ตั้งค่าผู้ลงนามและตรวจสอบรูปแบบเอกสารที่ระบบใช้สร้างหนังสือขอความอนุเคราะห์และหนังสือส่งตัว</p>
            </div>
            <UBadge :color="settings?.hasSignature ? 'success' : 'warning'" variant="subtle" size="lg">{{ settings?.hasSignature ? 'ตั้งค่าพร้อมออกเอกสาร' : 'รออัปโหลดลายเซ็น' }}</UBadge>
          </div>
        </UCard>

        <UAlert v-if="!settings?.hasSignature" color="warning" variant="subtle" icon="i-lucide-signature" title="ยังไม่มีลายเซ็นผู้ลงนาม" description="อัปโหลดไฟล์ PNG ก่อนจัดทำหนังสือ เพื่อให้เอกสารมีข้อมูลผู้ลงนามครบถ้วน" />

        <div class="grid gap-4 xl:grid-cols-2 xl:items-start">
          <UCard>
            <template #header><div class="flex items-center gap-2"><UIcon name="i-lucide-user-round-pen" class="size-5 text-primary" /><h2 class="text-base font-semibold text-ink">ผู้ลงนามในเอกสาร</h2></div></template>
            <form class="space-y-4" @submit.prevent="saveSigner">
              <UFormField label="ชื่อผู้ลงนาม" required><UInput v-model="form.signerName" size="xl" class="w-full" placeholder="เช่น รองศาสตราจารย์ ดร. ..." /></UFormField>
              <UFormField label="ตำแหน่ง" required><UTextarea v-model="form.signerTitle" :rows="1" :maxrows="3" autoresize size="xl" class="w-full" placeholder="เช่น คณบดีคณะ..." /></UFormField>
              <div class="flex justify-end"><UButton type="submit" label="บันทึกข้อมูลผู้ลงนาม" icon="i-lucide-save" size="xl" :loading="saving" /></div>
            </form>
          </UCard>

          <UCard>
            <template #header><div class="flex items-center gap-2"><UIcon name="i-lucide-signature" class="size-5 text-primary" /><h2 class="text-base font-semibold text-ink">ลายเซ็นผู้ลงนาม</h2></div></template>
            <div class="space-y-4">
              <div class="rounded-lg border border-divider bg-elevated p-4"><p class="text-sm font-medium text-ink">สถานะลายเซ็น</p><p class="mt-1 text-sm text-muted">{{ settings?.hasSignature ? 'มีไฟล์ลายเซ็นพร้อมใช้สำหรับสร้างเอกสาร' : 'ยังไม่ได้อัปโหลดไฟล์ลายเซ็น' }}</p></div>
              <UFormField label="อัปโหลดลายเซ็น" hint="รองรับ PNG ขนาดไม่เกิน 2MB">
                <label class="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 px-4 text-sm font-medium text-primary hover:bg-primary/5"><UIcon :name="uploadingSignature ? 'i-lucide-loader-circle' : 'i-lucide-upload'" :class="{ 'animate-spin': uploadingSignature }" class="size-4" />{{ uploadingSignature ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ลายเซ็น' }}<input type="file" accept="image/png" class="sr-only" :disabled="uploadingSignature" @change="uploadSignature" /></label>
              </UFormField>
              <p class="text-xs leading-5 text-muted">ไฟล์ลายเซ็นจัดเก็บในพื้นที่ส่วนตัวของระบบ และไม่เผยแพร่ผ่าน URL สาธารณะ</p>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header><div><h2 class="text-base font-semibold text-ink">รูปแบบเอกสาร</h2><p class="mt-1 text-sm text-muted">แนบไฟล์ตัวอย่าง PDF หรือ DOCX เพื่อใช้อ้างอิงรูปแบบเอกสาร</p></div></template>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-lg border border-divider p-4"><h3 class="font-medium text-ink">หนังสือขอความอนุเคราะห์</h3><p class="mt-1 text-sm text-muted">{{ settings?.templates.requestLetter || 'ยังไม่มีไฟล์ตัวอย่าง' }}</p><label class="mt-3 inline-block cursor-pointer"><UButton as="span" label="แนบไฟล์" size="sm" :loading="uploadingTemplate === 'request-letter'" /><input type="file" accept=".pdf,.docx" class="sr-only" @change="uploadTemplate('request-letter', $event)" /></label><UButton v-if="settings?.templates.requestLetter" label="เปิดไฟล์" size="sm" color="neutral" variant="outline" class="ml-2" to="/api/staff/settings/documents/templates/request-letter" target="_blank" /></div>
            <div class="rounded-lg border border-divider p-4"><h3 class="font-medium text-ink">หนังสือส่งตัว</h3><p class="mt-1 text-sm text-muted">{{ settings?.templates.sendingLetter || 'ยังไม่มีไฟล์ตัวอย่าง' }}</p><label class="mt-3 inline-block cursor-pointer"><UButton as="span" label="แนบไฟล์" size="sm" :loading="uploadingTemplate === 'sending-letter'" /><input type="file" accept=".pdf,.docx" class="sr-only" @change="uploadTemplate('sending-letter', $event)" /></label><UButton v-if="settings?.templates.sendingLetter" label="เปิดไฟล์" size="sm" color="neutral" variant="outline" class="ml-2" to="/api/staff/settings/documents/templates/sending-letter" target="_blank" /></div>
          </div>
          <template #footer><p class="text-sm leading-6 text-muted">ไฟล์ตัวอย่างนี้จัดเก็บในระบบเพื่อใช้ตรวจสอบและอ้างอิงการปรับรูปแบบ เอกสาร PDF ที่ระบบสร้างยังใช้รูปแบบมาตรฐานปัจจุบัน</p></template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
