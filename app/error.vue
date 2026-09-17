<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.status === 404)

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
    <div class="text-center max-w-md">
      <div class="flex justify-center mb-6">
        <UIcon
          :name="is404 ? 'i-lucide-map-pin-off' : 'i-lucide-circle-alert'"
          class="size-20 text-dimmed"
        />
      </div>

      <p class="text-8xl font-bold text-muted/30 mb-2 leading-none">
        {{ error.status }}
      </p>

      <h1 class="text-xl font-semibold text-highlighted mb-2">
        {{ is404 ? 'ไม่พบหน้าที่ต้องการ' : 'เกิดข้อผิดพลาด' }}
      </h1>

      <p class="text-muted text-sm mb-8">
        {{ is404 ? 'หน้าที่คุณกำลังค้นหาอาจถูกลบ ย้าย หรือไม่มีอยู่ในระบบ' : error.message || 'กรุณาลองใหม่อีกครั้ง' }}
      </p>

      <div class="flex gap-3 justify-center">
        <UButton
          label="ย้อนกลับ"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          @click="$router.back()"
        />
        <UButton
          label="กลับหน้าหลัก"
          color="primary"
          icon="i-lucide-house"
          @click="handleError"
        />
      </div>
    </div>
  </div>
</template>
