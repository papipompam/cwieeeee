<script setup lang="ts">
import { LocateFixed, MapPin, Search } from '@lucide/vue'
import UiButton from './UiButton.vue'
import UiInput from './UiInput.vue'

interface Coordinates { latitude: number | null, longitude: number | null }

const props = defineProps<{ latitude: number | null, longitude: number | null }>()
const emit = defineEmits<{ change: [coordinates: Coordinates] }>()
const query = ref('')
const status = ref('ยังไม่ได้ปักหมุด')

const selectExample = () => {
  emit('change', { latitude: 14.994, longitude: 103.103 })
  status.value = 'ปักหมุดแล้ว — ตรวจสอบตำแหน่งก่อนบันทึก'
}
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="text-sm font-semibold text-ink">สถานที่ฝึกสหกิจ <span class="text-danger" aria-hidden="true">*</span></legend>
    <p class="mt-1 text-xs leading-5 text-muted">ค้นหาสถานที่ คลิกแผนที่ หรือลากหมุด แล้วตรวจสอบตำแหน่งก่อนบันทึก</p>
    <div class="mt-3 rounded-control border border-divider bg-surface p-3 [&_label]:font-medium">
      <UiInput v-model="query" label="ค้นหาสถานที่" placeholder="เช่น มหาวิทยาลัยราชภัฏบุรีรัมย์ หรือ บริษัท ABC บุรีรัมย์" input-class="!min-h-9 text-xs" />
      <UiButton class="mt-3" variant="secondary" size="sm" :icon="Search" :disabled="query.trim().length < 5" @click="selectExample">ค้นหาสถานที่</UiButton>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 [&_label]:font-medium">
        <UiInput :model-value="String(props.latitude ?? '')" label="ละติจูด" placeholder="เช่น 14.994" input-class="!min-h-9 text-xs" @update:model-value="emit('change', { latitude: Number($event) || null, longitude: props.longitude })" />
        <UiInput :model-value="String(props.longitude ?? '')" label="ลองจิจูด" placeholder="เช่น 103.103" input-class="!min-h-9 text-xs" @update:model-value="emit('change', { latitude: props.latitude, longitude: Number($event) || null })" />
      </div>
    </div>
    <button type="button" class="relative mt-3 grid h-64 w-full place-items-center overflow-hidden rounded-control border border-divider bg-[radial-gradient(circle_at_center,#f5b32b_0_3px,transparent_4px),linear-gradient(135deg,#eef1eb_25%,#f7f7f7_25%_50%,#edf2f4_50%_75%,#f7f7f7_75%)] bg-[length:auto,48px_48px] text-muted sm:h-72" @click="selectExample">
      <span class="grid size-12 place-items-center rounded-full bg-primary text-ink shadow-lg"><MapPin :size="23" aria-hidden="true" /></span>
      <span class="absolute bottom-3 rounded-full bg-canvas/95 px-3 py-1.5 text-xs shadow">แผนที่ตัวอย่าง — ไม่เชื่อมต่อข้อมูลจริง</span>
    </button>
    <div class="mt-3 flex flex-wrap gap-2">
      <UiButton variant="secondary" size="sm" :icon="MapPin" @click="selectExample">ปักหมุดตรงกลาง</UiButton>
      <UiButton variant="ghost" size="sm" :icon="LocateFixed" @click="selectExample">ใช้ตำแหน่งตัวอย่าง</UiButton>
    </div>
    <p class="mt-2 text-xs leading-5 text-muted" aria-live="polite">{{ props.latitude !== null && props.longitude !== null ? 'ปักหมุดแล้ว — ตรวจสอบตำแหน่งก่อนบันทึก' : status }}</p>
  </fieldset>
</template>
