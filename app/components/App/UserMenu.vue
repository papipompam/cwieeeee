<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <UButton
    label="ยังไม่ได้ลงชื่อเข้าใช้"
    icon="i-lucide-circle-user-round"
    color="neutral"
    variant="ghost"
    block
    :square="collapsed"
    disabled
  />
</template>
