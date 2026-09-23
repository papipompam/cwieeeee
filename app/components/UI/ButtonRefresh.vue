<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  loading?: boolean
  size?: ButtonProps['size']
}>(), {
  loading: false,
  size: 'xl'
})

const emit = defineEmits<{
  refresh: []
}>()

const handleRefresh = () => {
  if (props.loading) return
  emit('refresh')
}
</script>

<template>
  <UButton
    icon="i-lucide-refresh-cw"
    color="neutral"
    variant="outline"
    :size="size"
    :loading="loading"
    aria-label="รีเฟรชข้อมูล"
    label="รีเฟรช"
    @click="handleRefresh"
  />
</template>
