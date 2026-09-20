<script setup lang="ts">
interface Company {
  id: number
  name: string
  contactPerson: string
  phone?: string | null
  email?: string | null
  addressNo: string
  moo?: string | null
  soi?: string | null
  street?: string | null
  subdistrict: string
  district: string
  province: string
  postalCode: string
  latitude?: number | null
  longitude?: number | null
}

const props = defineProps<{
  initialData?: any
  isEdit?: boolean
  embedded?: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()

const notify = useNotify()
const router = useRouter()

// Mode: 'EXISTING' vs 'NEW'
const companyMode = ref<'EXISTING' | 'NEW'>(props.initialData?.companyId ? 'EXISTING' : 'EXISTING')

// Company Search
const companySearch = ref('')
const selectedCompanyId = ref<number | null>(props.initialData?.companyId || null)
const selectedCompany = ref<Company | null>(props.initialData?.company || null)

const { data: searchedCompanies } = await useFetch<Company[]>('/api/student/companies', {
  query: computed(() => ({ search: companySearch.value })),
  watch: [companySearch]
})

// New Company Form
const newCompany = reactive({
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  addressNo: '',
  moo: '',
  soi: '',
  street: '',
  subdistrict: '',
  district: '',
  province: '',
  postalCode: ''
})

// Application Details
const form = reactive({
  applicationPosition: props.initialData?.applicationPosition || '',
  applicationMethod: props.initialData?.applicationMethod || 'EMAIL',
  appliedAt: props.initialData?.appliedAt
    ? new Date(props.initialData.appliedAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0],
  coords: {
    lat: props.initialData?.internshipLatitude ?? props.initialData?.company?.latitude ?? null,
    lng: props.initialData?.internshipLongitude ?? props.initialData?.company?.longitude ?? null
  },
  note: props.initialData?.note || ''
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)

const selectExistingCompany = (comp: Company) => {
  selectedCompanyId.value = comp.id
  selectedCompany.value = comp
  // Auto-fill coords from company if available and not yet set
  if (comp.latitude && comp.longitude && form.coords.lat == null) {
    form.coords.lat = comp.latitude
    form.coords.lng = comp.longitude
  }
}

const getFullAddress = (c: Company | typeof newCompany) => {
  return [
    c.addressNo ? `เลขที่ ${c.addressNo}` : null,
    c.moo ? `หมู่ ${c.moo}` : null,
    c.soi ? `ซอย ${c.soi}` : null,
    c.street ? `ถนน ${c.street}` : null,
    c.subdistrict ? `ต. ${c.subdistrict}` : null,
    c.district ? `อ. ${c.district}` : null,
    c.province ? `จ. ${c.province}` : null,
    c.postalCode || null
  ].filter(Boolean).join(' ')
}

const validate = () => {
  Object.keys(errors).forEach(key => delete errors[key])

  if (companyMode.value === 'EXISTING' && !selectedCompanyId.value) {
    errors.companyId = 'กรุณาเลือกสถานประกอบการ'
  }

  if (companyMode.value === 'NEW') {
    if (!newCompany.name.trim()) errors.companyName = 'กรุณากรอกชื่อสถานประกอบการ'
    if (!newCompany.contactPerson.trim()) errors.contactPerson = 'กรุณากรอกชื่อผู้ประสานงาน'
    if (!newCompany.addressNo.trim()) errors.addressNo = 'กรุณากรอกเลขที่'
    if (!newCompany.subdistrict.trim()) errors.subdistrict = 'กรุณากรอกตำบล/แขวง'
    if (!newCompany.district.trim()) errors.district = 'กรุณากรอกอำเภอ/เขต'
    if (!newCompany.province.trim()) errors.province = 'กรุณากรอกจังหวัด'
    if (!newCompany.postalCode.trim()) errors.postalCode = 'กรุณากรอกรหัสไปรษณีย์'
  }

  if (!form.applicationPosition.trim()) {
    errors.applicationPosition = 'กรุณาระบุตำแหน่งที่สมัคร'
  }
  if (!form.appliedAt) {
    errors.appliedAt = 'กรุณาระบุวันที่สมัคร'
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = async () => {
  if (!validate()) {
    notify.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
    return
  }

  isSubmitting.value = true
  try {
    // Determine company details to auto-derive recipient and location
    const compName = companyMode.value === 'EXISTING' ? selectedCompany.value?.name : newCompany.name.trim()
    const contact = companyMode.value === 'EXISTING' ? selectedCompany.value?.contactPerson : newCompany.contactPerson.trim()
    const addr = companyMode.value === 'EXISTING' && selectedCompany.value
      ? getFullAddress(selectedCompany.value)
      : getFullAddress(newCompany)

    const payload: any = {
      applicationPosition: form.applicationPosition.trim(),
      applicationMethod: form.applicationMethod,
      appliedAt: form.appliedAt,
      recipientName: contact || null,
      letterAddress: addr || null,
      internshipLocationName: compName || null,
      internshipLatitude: form.coords.lat,
      internshipLongitude: form.coords.lng,
      note: form.note.trim() || null
    }

    if (companyMode.value === 'EXISTING') {
      payload.companyId = selectedCompanyId.value
    } else {
      payload.newCompany = {
        name: newCompany.name.trim(),
        contactPerson: newCompany.contactPerson.trim(),
        phone: newCompany.phone.trim() || null,
        email: newCompany.email.trim() || null,
        addressNo: newCompany.addressNo.trim(),
        moo: newCompany.moo.trim() || null,
        soi: newCompany.soi.trim() || null,
        street: newCompany.street.trim() || null,
        subdistrict: newCompany.subdistrict.trim(),
        district: newCompany.district.trim(),
        province: newCompany.province.trim(),
        postalCode: newCompany.postalCode.trim(),
        latitude: form.coords.lat,
        longitude: form.coords.lng
      }
    }

    if (props.isEdit && props.initialData?.id) {
      await $fetch(`/api/student/applications/${props.initialData.id}`, {
        method: 'PUT',
        body: payload
      })
      notify.success('แก้ไขข้อมูลการสมัครเรียบร้อยแล้ว')
      await router.push(`/student/applications/${props.initialData.id}`)
    } else {
      const res: any = await $fetch('/api/student/applications', {
        method: 'POST',
        body: payload
      })
      notify.success('บันทึกการสมัครสถานประกอบการเรียบร้อยแล้ว')
      await router.push(`/student/applications/${res.id}`)
    }
  } catch (err: any) {
    notify.error(err.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  if (props.embedded) {
    emit('cancel')
    return
  }
  router.back()
}
</script>

<template>
  <form class="student-form-content space-y-6 max-w-4xl" @submit.prevent="handleSubmit">
    <!-- Company Selection Section -->
    <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 class="font-semibold text-highlighted">ข้อมูลสถานประกอบการ</h3>
          <p class="text-xs text-muted">เลือกสถานประกอบการที่มีในระบบ หรือกรอกข้อมูลสถานประกอบการใหม่</p>
        </div>

        <!-- Mode Toggle -->
        <div v-if="!isEdit" class="flex rounded-lg bg-muted/20 p-1 self-start sm:self-auto">
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            :class="companyMode === 'EXISTING' ? 'bg-default text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
            @click="companyMode = 'EXISTING'"
          >
            เลือกสถานประกอบการเดิม
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            :class="companyMode === 'NEW' ? 'bg-default text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
            @click="companyMode = 'NEW'"
          >
            กรอกสถานประกอบการใหม่
          </button>
        </div>
      </div>

      <!-- Mode 1: Search & Select Existing Company -->
      <div v-if="companyMode === 'EXISTING'" class="space-y-3">
        <div v-if="!isEdit">
          <label class="block text-xs font-medium text-highlighted mb-1.5">ค้นหาสถานประกอบการ</label>
          <UInput
            v-model="companySearch"
            icon="i-lucide-search"
            placeholder="พิมพ์ชื่อสถานประกอบการ หรือจังหวัด เพื่อค้นหา..."
            class="w-full"
          />
          <span v-if="errors.companyId" class="text-xs text-error mt-1 block">{{ errors.companyId }}</span>
        </div>

        <!-- Search Results List -->
        <div v-if="!isEdit && companySearch.trim() && searchedCompanies?.length" class="max-h-48 overflow-y-auto border border-default rounded-lg divide-y divide-default">
          <div
            v-for="comp in searchedCompanies"
            :key="comp.id"
            class="p-2.5 hover:bg-muted/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
            :class="selectedCompanyId === comp.id ? 'bg-primary/10' : ''"
            @click="selectExistingCompany(comp)"
          >
            <div>
              <p class="font-medium text-highlighted">{{ comp.name }}</p>
              <p class="text-muted text-[11px]">{{ comp.district }}, จ.{{ comp.province }}</p>
            </div>
            <UButton
              size="xs"
              :color="selectedCompanyId === comp.id ? 'primary' : 'neutral'"
              :variant="selectedCompanyId === comp.id ? 'solid' : 'ghost'"
              :label="selectedCompanyId === comp.id ? 'เลือกแล้ว' : 'เลือก'"
            />
          </div>
        </div>

        <!-- Selected Company Card -->
        <div v-if="selectedCompany" class="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-primary">สถานประกอบการที่เลือก</span>
            <span class="text-xs text-muted">ID #{{ selectedCompany.id }}</span>
          </div>
          <p class="font-semibold text-highlighted text-sm">{{ selectedCompany.name }}</p>
          <p class="text-xs text-muted">
            ที่อยู่: {{ selectedCompany.addressNo }} {{ selectedCompany.street || '' }} {{ selectedCompany.subdistrict }}, {{ selectedCompany.district }}, จ.{{ selectedCompany.province }} {{ selectedCompany.postalCode }}
          </p>
          <p class="text-xs text-muted">
            ผู้ติดต่อ/ประสานงาน: <span class="font-medium text-highlighted">{{ selectedCompany.contactPerson }}</span>
            <span v-if="selectedCompany.phone"> (โทร: {{ selectedCompany.phone }})</span>
            <span v-if="selectedCompany.email"> (อีเมล: {{ selectedCompany.email }})</span>
          </p>
        </div>
      </div>

      <!-- Mode 2: Fill New Company Details -->
      <div v-else class="grid gap-3 sm:grid-cols-2 pt-2">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-highlighted mb-1">ชื่อสถานประกอบการ <span class="text-error">*</span></label>
          <UInput v-model="newCompany.name" placeholder="เช่น บริษัท เทคโนโลยี จำกัด" class="w-full" />
          <span v-if="errors.companyName" class="text-xs text-error mt-1 block">{{ errors.companyName }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">ผู้ติดต่อ / ประสานงาน <span class="text-error">*</span></label>
          <UInput v-model="newCompany.contactPerson" placeholder="เช่น คุณสมชาย จัดการงาน" class="w-full" />
          <span v-if="errors.contactPerson" class="text-xs text-error mt-1 block">{{ errors.contactPerson }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">เบอร์โทรศัพท์ติดต่อ</label>
          <UInput v-model="newCompany.phone" placeholder="เช่น 02-123-4567" class="w-full" />
        </div>

        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-highlighted mb-1">อีเมลติดต่อ</label>
          <UInput v-model="newCompany.email" placeholder="contact@company.com" class="w-full" />
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">เลขที่ <span class="text-error">*</span></label>
          <UInput v-model="newCompany.addressNo" placeholder="เช่น 123/4" class="w-full" />
          <span v-if="errors.addressNo" class="text-xs text-error mt-1 block">{{ errors.addressNo }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">หมู่ที่</label>
          <UInput v-model="newCompany.moo" placeholder="เช่น 5" class="w-full" />
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">ซอย</label>
          <UInput v-model="newCompany.soi" placeholder="เช่น สุขุมวิท 21" class="w-full" />
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">ถนน</label>
          <UInput v-model="newCompany.street" placeholder="เช่น ถนนอโศกมนตรี" class="w-full" />
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">ตำบล / แขวง <span class="text-error">*</span></label>
          <UInput v-model="newCompany.subdistrict" placeholder="เช่น คลองเตยเหนือ" class="w-full" />
          <span v-if="errors.subdistrict" class="text-xs text-error mt-1 block">{{ errors.subdistrict }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">อำเภอ / เขต <span class="text-error">*</span></label>
          <UInput v-model="newCompany.district" placeholder="เช่น วัฒนา" class="w-full" />
          <span v-if="errors.district" class="text-xs text-error mt-1 block">{{ errors.district }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">จังหวัด <span class="text-error">*</span></label>
          <UInput v-model="newCompany.province" placeholder="เช่น กรุงเทพมหานคร" class="w-full" />
          <span v-if="errors.province" class="text-xs text-error mt-1 block">{{ errors.province }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">รหัสไปรษณีย์ <span class="text-error">*</span></label>
          <UInput v-model="newCompany.postalCode" placeholder="เช่น 10110" class="w-full" />
          <span v-if="errors.postalCode" class="text-xs text-error mt-1 block">{{ errors.postalCode }}</span>
        </div>
      </div>
    </div>

    <!-- Application Details Section -->
    <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-4">
      <h3 class="font-semibold text-highlighted">ตำแหน่งและวันที่สมัคร</h3>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-highlighted mb-1">ตำแหน่งที่สมัคร <span class="text-error">*</span></label>
          <UInput v-model="form.applicationPosition" placeholder="เช่น Software Engineer Intern, Data Analyst" class="w-full" />
          <span v-if="errors.applicationPosition" class="text-xs text-error mt-1 block">{{ errors.applicationPosition }}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-highlighted mb-1">วันที่ยื่นสมัคร <span class="text-error">*</span></label>
          <input
            v-model="form.appliedAt"
            type="date"
            class="w-full rounded-md border border-default bg-default px-3 py-1.5 text-xs text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span v-if="errors.appliedAt" class="text-xs text-error mt-1 block">{{ errors.appliedAt }}</span>
        </div>

        <div class="sm:col-span-3">
          <label class="block text-xs font-medium text-highlighted mb-1">ช่องทางการสมัคร</label>
          <USelect
            v-model="form.applicationMethod"
            :items="[
              { label: 'อีเมล (Email)', value: 'EMAIL' },
              { label: 'สมัครด้วยตนเอง (In Person)', value: 'IN_PERSON' },
              { label: 'เว็บไซต์รับสมัครงาน (Website)', value: 'WEBSITE' },
              { label: 'อื่นๆ (Other)', value: 'OTHER' }
            ]"
            class="w-full sm:w-64"
          />
        </div>
      </div>
    </div>

    <!-- Map Picker Section -->
    <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
      <div>
        <h3 class="font-semibold text-highlighted">ปักหมุดพิกัดสถานที่ปฏิบัติงาน (ถ้ามี)</h3>
        <p class="text-xs text-muted">คลิกเลือกตำแหน่งบนแผนที่เพื่อบันทึกพิกัดสำหรับให้อาจารย์นิเทศใช้เดินทาง</p>
      </div>

      <ClientOnly>
        <div class="rounded-lg overflow-hidden border border-default">
          <UIMapPicker v-model="form.coords" />
        </div>
        <template #fallback>
          <div class="h-48 rounded-lg bg-muted/10 flex items-center justify-center text-xs text-muted">
            กำลังโหลดแผนที่...
          </div>
        </template>
      </ClientOnly>

      <div v-if="form.coords.lat != null && form.coords.lng != null" class="flex items-center gap-4 text-xs text-muted">
        <span>ละติจูด: {{ form.coords.lat }}</span>
        <span>ลองจิจูด: {{ form.coords.lng }}</span>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          label="ล้างหมุด"
          @click="form.coords = { lat: null, lng: null }"
        />
      </div>
    </div>

    <!-- Additional Note -->
    <div class="rounded-xl border border-default bg-default p-5 shadow-xs space-y-3">
      <label class="block text-xs font-semibold text-highlighted">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
      <UTextarea v-model="form.note" placeholder="รายละเอียดอื่นๆ เกี่ยวกับการสมัคร..." :rows="2" class="w-full" />
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-4">
      <UButton
        color="neutral"
        variant="ghost"
        label="ยกเลิก"
        @click="handleCancel"
      />
      <UButton
        type="submit"
        color="primary"
        size="md"
        icon="i-lucide-save"
        :loading="isSubmitting"
        :label="isEdit ? 'บันทึกการแก้ไข' : 'ยื่นสมัครสถานประกอบการ'"
      />
    </div>
  </form>
</template>

<style scoped>
.student-form-content :is(h3, p, label, dt, dd) {
  font-size: 1rem;
  line-height: 1.5;
}

.student-form-content :is(input, textarea, select) {
  font-size: 1rem;
}

.student-form-content .text-xs {
  font-size: 1rem;
}
</style>
