<script setup lang="ts">
import { PROVINCES, getRegionByProvince } from '~/utils/geo'

export interface CompanyFormData {
  name: string
  contactPerson: string
  phone: string | null
  email: string | null
  addressNo: string
  moo: string | null
  soi: string | null
  street: string | null
  subdistrict: string
  district: string
  province: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  travelNote: string | null
  isActive: boolean
}

export interface CompanyInitialData {
  name?: string
  contactPerson?: string
  phone?: string | null
  email?: string | null
  addressNo?: string
  moo?: string | null
  soi?: string | null
  street?: string | null
  subdistrict?: string
  district?: string
  province?: string
  postalCode?: string
  latitude?: number | null
  longitude?: number | null
  travelNote?: string | null
  isActive?: boolean
}

const props = withDefaults(defineProps<{
  initialData?: CompanyInitialData
  isEditing?: boolean
  loading?: boolean
}>(), {
  initialData: () => ({}),
  isEditing: false,
  loading: false
})

const emit = defineEmits<{
  (e: 'submit', data: CompanyFormData): void
  (e: 'cancel'): void
}>()

const form = reactive({
  name: props.initialData.name ?? '',
  contactPerson: props.initialData.contactPerson ?? '',
  phone: props.initialData.phone ?? '',
  email: props.initialData.email ?? '',
  addressNo: props.initialData.addressNo ?? '',
  moo: props.initialData.moo ?? '',
  soi: props.initialData.soi ?? '',
  street: props.initialData.street ?? '',
  subdistrict: props.initialData.subdistrict ?? '',
  district: props.initialData.district ?? '',
  province: props.initialData.province ?? 'เชียงใหม่',
  postalCode: props.initialData.postalCode ?? '',
  latitude: props.initialData.latitude ?? null,
  longitude: props.initialData.longitude ?? null,
  travelNote: props.initialData.travelNote ?? '',
  isActive: props.initialData.isActive ?? true
})

// Watch for changes in initialData when loaded asynchronously
watch(() => props.initialData, (newData) => {
  if (newData) {
    form.name = newData.name ?? form.name
    form.contactPerson = newData.contactPerson ?? form.contactPerson
    form.phone = newData.phone ?? ''
    form.email = newData.email ?? ''
    form.addressNo = newData.addressNo ?? form.addressNo
    form.moo = newData.moo ?? ''
    form.soi = newData.soi ?? ''
    form.street = newData.street ?? ''
    form.subdistrict = newData.subdistrict ?? form.subdistrict
    form.district = newData.district ?? form.district
    form.province = newData.province ?? form.province
    form.postalCode = newData.postalCode ?? form.postalCode
    form.latitude = newData.latitude !== undefined ? newData.latitude : form.latitude
    form.longitude = newData.longitude !== undefined ? newData.longitude : form.longitude
    form.travelNote = newData.travelNote ?? ''
    form.isActive = newData.isActive !== undefined ? newData.isActive : form.isActive
  }
}, { deep: true })

const calculatedRegion = computed(() => getRegionByProvince(form.province))

const mapCoords = computed({
  get: () => ({
    lat: form.latitude !== null && form.latitude !== undefined && (form.latitude as any) !== '' ? Number(form.latitude) : null,
    lng: form.longitude !== null && form.longitude !== undefined && (form.longitude as any) !== '' ? Number(form.longitude) : null
  }),
  set: (val: { lat: number | null; lng: number | null }) => {
    form.latitude = val.lat
    form.longitude = val.lng
  }
})

const provinceOptions = PROVINCES.map(p => ({ label: p, value: p }))

const errors = reactive<Record<string, string>>({})

const validate = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  let isValid = true

  if (!form.name.trim()) {
    errors.name = 'กรุณากรอกชื่อสถานประกอบการ'
    isValid = false
  }

  if (!form.contactPerson.trim()) {
    errors.contactPerson = 'กรุณาระบุชื่อบุคลากรผู้ติดต่อหลัก'
    isValid = false
  }

  if (!form.addressNo.trim()) {
    errors.addressNo = 'กรุณากรอกบ้านเลขที่/อาคาร'
    isValid = false
  }

  if (!form.subdistrict.trim()) {
    errors.subdistrict = 'กรุณากรอกตำบล/แขวง'
    isValid = false
  }

  if (!form.district.trim()) {
    errors.district = 'กรุณากรอกอำเภอ/เขต'
    isValid = false
  }

  if (!form.province) {
    errors.province = 'กรุณาระบุจังหวัด'
    isValid = false
  }

  if (!form.postalCode.trim()) {
    errors.postalCode = 'กรุณากรอกรหัสไปรษณีย์'
    isValid = false
  } else if (!/^\d{5}$/.test(form.postalCode.trim())) {
    errors.postalCode = 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'
    isValid = false
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    isValid = false
  }

  if (form.latitude !== null && form.latitude !== undefined && (isNaN(Number(form.latitude)) || form.latitude < -90 || form.latitude > 90)) {
    errors.latitude = 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90'
    isValid = false
  }

  if (form.longitude !== null && form.longitude !== undefined && (isNaN(Number(form.longitude)) || form.longitude < -180 || form.longitude > 180)) {
    errors.longitude = 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180'
    isValid = false
  }

  return isValid
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', {
    name: form.name.trim(),
    contactPerson: form.contactPerson.trim(),
    phone: form.phone ? String(form.phone).trim() : null,
    email: form.email ? String(form.email).trim() : null,
    addressNo: form.addressNo.trim(),
    moo: form.moo ? String(form.moo).trim() : null,
    soi: form.soi ? String(form.soi).trim() : null,
    street: form.street ? String(form.street).trim() : null,
    subdistrict: form.subdistrict.trim(),
    district: form.district.trim(),
    province: form.province.trim(),
    postalCode: form.postalCode.trim(),
    latitude: form.latitude !== null && form.latitude !== undefined && (form.latitude as any) !== '' ? Number(form.latitude) : null,
    longitude: form.longitude !== null && form.longitude !== undefined && (form.longitude as any) !== '' ? Number(form.longitude) : null,
    travelNote: form.travelNote ? String(form.travelNote).trim() : null,
    isActive: form.isActive
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Section 1: ข้อมูลสถานประกอบการและผู้ติดต่อ -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">ข้อมูลสถานประกอบการและผู้ติดต่อหลัก</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="ชื่อสถานประกอบการ" required :error="errors.name">
            <UInput
              v-model="form.name"
              placeholder="เช่น บริษัท สยามพัฒนา ซอฟต์แวร์ จำกัด"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ชื่อบุคลากรผู้ติดต่อหลัก" required :error="errors.contactPerson">
            <UInput
              v-model="form.contactPerson"
              placeholder="เช่น คุณสมชาย บุญมี (ผู้จัดการแผนกบุคคล)"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="เบอร์โทรศัพท์" :error="errors.phone">
            <UInput
              v-model="form.phone"
              placeholder="เช่น 02-123-4567 หรือ 081-234-5678"
              class="w-full"
            />
          </UFormField>

          <UFormField label="อีเมลติดต่อ" :error="errors.email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="เช่น hr@company.co.th"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Section 2: ที่ตั้งและที่อยู่ -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">ที่อยู่สถานประกอบการ</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <UFormField label="บ้านเลขที่ / อาคาร" required :error="errors.addressNo">
            <UInput
              v-model="form.addressNo"
              placeholder="เช่น 123/45 อาคารเอ ชั้น 3"
              class="w-full"
            />
          </UFormField>

          <UFormField label="หมู่ที่">
            <UInput
              v-model="form.moo"
              placeholder="เช่น 4"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ซอย">
            <UInput
              v-model="form.soi"
              placeholder="เช่น สุขุมวิท 21"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ถนน">
            <UInput
              v-model="form.street"
              placeholder="เช่น นิมมานเหมินท์"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <UFormField label="ตำบล / แขวง" required :error="errors.subdistrict">
            <UInput
              v-model="form.subdistrict"
              placeholder="เช่น สุเทพ"
              class="w-full"
            />
          </UFormField>

          <UFormField label="อำเภอ / เขต" required :error="errors.district">
            <UInput
              v-model="form.district"
              placeholder="เช่น เมืองเชียงใหม่"
              class="w-full"
            />
          </UFormField>

          <UFormField label="จังหวัด" required :error="errors.province">
            <USelect
              v-model="form.province"
              :items="provinceOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ภูมิภาค (คำนวณอัตโนมัติ)">
            <div class="flex items-center h-9 px-3 rounded-md border border-default bg-muted/20 text-sm font-medium text-highlighted">
              {{ calculatedRegion }}
            </div>
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <UFormField label="รหัสไปรษณีย์" required :error="errors.postalCode">
            <UInput
              v-model="form.postalCode"
              placeholder="เช่น 50200"
              class="w-full font-mono"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Section 3: แผนที่ พิกัด และการเดินทาง -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-map" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">แผนที่และพิกัดที่ตั้ง</h2>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Interactive Map Picker -->
        <div>
          <ClientOnly>
            <UIMapPicker v-model="mapCoords" />
            <template #fallback>
              <div class="w-full h-80 rounded-lg border border-default bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted animate-pulse">
                <UIcon name="i-lucide-map" class="size-8 text-muted" />
                <span class="text-sm">กำลังโหลดแผนที่...</span>
              </div>
            </template>
          </ClientOnly>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="ละติจูด (Latitude)" :error="errors.latitude">
            <UInput
              v-model.number="form.latitude"
              type="number"
              step="any"
              placeholder="เช่น 18.7953"
              class="w-full font-mono"
            />
          </UFormField>

          <UFormField label="ลองจิจูด (Longitude)" :error="errors.longitude">
            <UInput
              v-model.number="form.longitude"
              type="number"
              step="any"
              placeholder="เช่น 98.9620"
              class="w-full font-mono"
            />
          </UFormField>
        </div>

        <UFormField label="หมายเหตุการเดินทาง">
          <UTextarea
            v-model="form.travelNote"
            :rows="2"
            placeholder="เช่น ใกล้สถานีรถไฟฟ้านานา, มีที่จอดรถด้านหลังอาคาร, รถเมล์สาย 29 ผ่าน"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Section 4: สถานะการใช้งาน (เฉพาะเมื่อแก้ไข) -->
    <UCard v-if="isEditing">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-toggle-left" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">สถานะการใช้งาน</h2>
        </div>
      </template>

      <div class="flex items-center gap-3">
        <USwitch v-model="form.isActive" />
        <span class="text-sm font-medium">
          {{ form.isActive ? 'เปิดใช้งาน (Active) - รับนักศึกษาฝึกงานได้' : 'ปิดใช้งาน (Inactive) - ระงับการฝึกงานชั่วคราว' }}
        </span>
      </div>
    </UCard>

    <!-- Bottom Actions -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <UButton
        label="ยกเลิก"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="emit('cancel')"
      />
      <UButton
        :label="isEditing ? 'บันทึกการแก้ไข' : 'บันทึกสถานประกอบการ'"
        icon="i-lucide-save"
        color="primary"
        :loading="loading"
        type="submit"
      />
    </div>
  </form>
</template>
