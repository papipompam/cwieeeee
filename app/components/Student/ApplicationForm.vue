<script setup lang="ts">
import { PROVINCES } from '~/utils/geo'

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
  preselectedCompanyId?: number | string
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
  query: computed(() => ({ search: companySearch.value, id: props.preselectedCompanyId })),
  watch: [companySearch, () => props.preselectedCompanyId]
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

const provinceOptions = PROVINCES.map(province => ({ label: province, value: province }))
const positionOptions = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'UX/UI Designer',
  'Software Tester',
  'IT Support',
  'System Support'
].map(position => ({ label: position, value: position }))

const selectExistingCompany = (comp: Company) => {
  selectedCompanyId.value = comp.id
  selectedCompany.value = comp
  // Auto-fill coords from company if available and not yet set
  if (comp.latitude && comp.longitude && form.coords.lat == null) {
    form.coords.lat = comp.latitude
    form.coords.lng = comp.longitude
  }
}

watch(searchedCompanies, companies => {
  const requestedId = Number(props.preselectedCompanyId)
  const company = requestedId ? companies?.find(item => item.id === requestedId) : null
  if (company && selectedCompanyId.value !== company.id) selectExistingCompany(company)
}, { immediate: true })

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
      await router.push(props.embedded ? '/student/applications' : `/student/applications/${res.id}`)
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
  <form class="space-y-6 max-w-4xl" @submit.prevent="handleSubmit">
    <!-- Company Selection Section -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold text-ink">ข้อมูลสถานประกอบการ</h3>
            <p class="text-sm text-muted">เลือกสถานประกอบการที่มีในระบบ หรือกรอกข้อมูลสถานประกอบการใหม่</p>
          </div>

          <!-- Mode Toggle -->
          <div v-if="!isEdit" class="flex rounded-[var(--radius-control)] bg-surface p-1 self-start sm:self-auto border border-divider">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer"
              :class="companyMode === 'EXISTING' ? 'bg-canvas text-ink shadow-panel' : 'text-muted hover:text-ink'"
              @click="companyMode = 'EXISTING'"
            >
              เลือกสถานประกอบการเดิม
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer"
              :class="companyMode === 'NEW' ? 'bg-canvas text-ink shadow-panel' : 'text-muted hover:text-ink'"
              @click="companyMode = 'NEW'"
            >
              กรอกสถานประกอบการใหม่
            </button>
          </div>
        </div>
      </template>

      <!-- Mode 1: Search & Select Existing Company -->
      <div v-if="companyMode === 'EXISTING'" class="space-y-4">
        <div v-if="!isEdit">
          <UFormField label="ค้นหาสถานประกอบการ" :error="errors.companyId">
            <UInput
              v-model="companySearch"
              size="xl"
              icon="i-lucide-search"
              placeholder="พิมพ์ชื่อสถานประกอบการ หรือจังหวัด เพื่อค้นหา..."
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Search Results List -->
        <div v-if="!isEdit && companySearch.trim() && searchedCompanies?.length" class="max-h-56 overflow-y-auto border border-divider rounded-panel divide-y divide-divider bg-canvas">
          <div
            v-for="comp in searchedCompanies"
            :key="comp.id"
            class="p-3 hover:bg-surface cursor-pointer flex items-center justify-between text-sm transition-colors"
            :class="selectedCompanyId === comp.id ? 'bg-warning-soft' : ''"
            @click="selectExistingCompany(comp)"
          >
            <div>
              <p class="font-medium text-ink">{{ comp.name }}</p>
              <p class="text-xs text-muted">{{ comp.district }}, จ.{{ comp.province }}</p>
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
        <div v-if="selectedCompany" class="rounded-panel border border-primary/30 bg-warning-soft p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-primary">สถานประกอบการที่เลือก</span>
            <span class="text-xs text-muted">ID #{{ selectedCompany.id }}</span>
          </div>
          <p class="font-semibold text-ink text-base">{{ selectedCompany.name }}</p>
          <p class="text-sm text-muted">
            ที่อยู่: {{ selectedCompany.addressNo }} {{ selectedCompany.street || '' }} {{ selectedCompany.subdistrict }}, {{ selectedCompany.district }}, จ.{{ selectedCompany.province }} {{ selectedCompany.postalCode }}
          </p>
          <p class="text-sm text-muted">
            ผู้ติดต่อ/ประสานงาน: <span class="font-medium text-ink">{{ selectedCompany.contactPerson }}</span>
            <span v-if="selectedCompany.phone"> (โทร: {{ selectedCompany.phone }})</span>
            <span v-if="selectedCompany.email"> (อีเมล: {{ selectedCompany.email }})</span>
          </p>
        </div>
      </div>

      <!-- Mode 2: Fill New Company Details -->
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <UFormField label="ชื่อสถานประกอบการ" required :error="errors.companyName">
            <UInput v-model="newCompany.name" size="xl" placeholder="เช่น บริษัท เทคโนโลยี จำกัด" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="ผู้ติดต่อ / ประสานงาน" required :error="errors.contactPerson">
            <UInput v-model="newCompany.contactPerson" size="xl" placeholder="เช่น คุณสมชาย จัดการงาน" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="เบอร์โทรศัพท์ติดต่อ">
            <UInput v-model="newCompany.phone" size="xl" placeholder="เช่น 02-123-4567" class="w-full" />
          </UFormField>
        </div>

        <div class="sm:col-span-2">
          <UFormField label="อีเมลติดต่อ">
            <UInput v-model="newCompany.email" size="xl" placeholder="contact@company.com" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="เลขที่" required :error="errors.addressNo">
            <UInput v-model="newCompany.addressNo" size="xl" placeholder="เช่น 123/4" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="หมู่ที่">
            <UInput v-model="newCompany.moo" size="xl" placeholder="เช่น 5" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="ซอย">
            <UInput v-model="newCompany.soi" size="xl" placeholder="เช่น สุขุมวิท 21" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="ถนน">
            <UInput v-model="newCompany.street" size="xl" placeholder="เช่น ถนนอโศกมนตรี" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="ตำบล / แขวง" required :error="errors.subdistrict">
            <UInput v-model="newCompany.subdistrict" size="xl" placeholder="เช่น คลองเตยเหนือ" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="อำเภอ / เขต" required :error="errors.district">
            <UInput v-model="newCompany.district" size="xl" placeholder="เช่น วัฒนา" class="w-full" />
          </UFormField>
        </div>

        <div>
          <UFormField label="จังหวัด" required :error="errors.province">
            <USelectMenu
              v-model="newCompany.province"
              :items="provinceOptions"
              value-key="value"
              size="xl"
              placeholder="เลือกจังหวัด"
              :search-input="{ placeholder: 'ค้นหาจังหวัด...' }"
              class="w-full"
            />
          </UFormField>
        </div>

        <div>
          <UFormField label="รหัสไปรษณีย์" required :error="errors.postalCode">
            <UInput v-model="newCompany.postalCode" size="xl" placeholder="เช่น 10110" class="w-full" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Application Details Section -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-ink">ตำแหน่งและวันที่สมัคร</h3>
      </template>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <UFormField label="ตำแหน่งที่สมัคร" required :error="errors.applicationPosition">
            <USelectMenu
              v-model="form.applicationPosition"
              :items="positionOptions"
              value-key="value"
              size="xl"
              placeholder="เลือกตำแหน่งที่สมัคร"
              :search-input="{ placeholder: 'ค้นหาตำแหน่ง...' }"
              create-item
              @create="form.applicationPosition = $event"
              class="w-full"
            />
          </UFormField>
        </div>

        <div>
          <UFormField label="วันที่ยื่นสมัคร" required :error="errors.appliedAt">
            <UInput
              v-model="form.appliedAt"
              type="date"
              size="xl"
              class="w-full"
              aria-label="วันที่ยื่นสมัคร"
            />
          </UFormField>
        </div>

        <div class="sm:col-span-3">
          <UFormField label="ช่องทางการสมัคร">
            <USelect
              v-model="form.applicationMethod"
              size="xl"
              :items="[
                { label: 'อีเมล (Email)', value: 'EMAIL' },
                { label: 'สมัครด้วยตนเอง (In Person)', value: 'IN_PERSON' },
                { label: 'เว็บไซต์รับสมัครงาน (Website)', value: 'WEBSITE' },
                { label: 'อื่นๆ (Other)', value: 'OTHER' }
              ]"
              class="w-full sm:w-72"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Map Picker Section -->
    <UCard>
      <template #header>
        <div>
          <h3 class="font-semibold text-ink">ปักหมุดพิกัดสถานที่ปฏิบัติงาน (ถ้ามี)</h3>
          <p class="text-sm text-muted">คลิกเลือกตำแหน่งบนแผนที่เพื่อบันทึกพิกัดสำหรับให้อาจารย์นิเทศใช้เดินทาง</p>
        </div>
      </template>

      <div class="space-y-3">
        <ClientOnly>
          <div class="rounded-panel overflow-hidden border border-divider">
            <UIMapPicker v-model="form.coords" />
          </div>
          <template #fallback>
            <div class="h-48 rounded-panel bg-surface flex items-center justify-center text-sm text-muted">
              กำลังโหลดแผนที่...
            </div>
          </template>
        </ClientOnly>

        <div v-if="form.coords.lat != null && form.coords.lng != null" class="flex items-center gap-4 text-sm text-muted">
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
    </UCard>

    <!-- Additional Note -->
    <UCard>
      <UFormField label="หมายเหตุเพิ่มเติม (ถ้ามี)">
        <UTextarea v-model="form.note" size="xl" placeholder="รายละเอียดอื่นๆ เกี่ยวกับการสมัคร..." :rows="3" class="w-full" />
      </UFormField>
    </UCard>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-4">
      <UButton
        color="neutral"
        variant="outline"
        size="xl"
        label="ยกเลิก"
        @click="handleCancel"
      />
      <UButton
        type="submit"
        color="primary"
        size="xl"
        icon="i-lucide-save"
        :loading="isSubmitting"
        :label="isEdit ? 'บันทึกการแก้ไข' : 'ยื่นสมัครสถานประกอบการ'"
      />
    </div>
  </form>
</template>
