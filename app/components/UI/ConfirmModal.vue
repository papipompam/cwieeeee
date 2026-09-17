<script setup lang="ts">
type IconColor = 'info' | 'warning' | 'error' | 'success' | 'primary' | 'neutral'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  icon?: string
  iconColor?: IconColor
  message?: string
  subMessage?: string
  confirmLabel?: string
  confirmColor?: IconColor
  loading?: boolean
}>(), {
  title: 'ยืนยันการดำเนินการ',
  description: '',
  icon: 'i-lucide-alert-triangle',
  iconColor: 'warning',
  message: 'คุณต้องการดำเนินการนี้หรือไม่?',
  subMessage: '',
  confirmLabel: 'ยืนยัน',
  confirmColor: 'warning',
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const iconBgClasses: Record<IconColor, string> = {
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  success: 'bg-success/10 text-success',
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-neutral/10 text-neutral',
}

const iconBgClass = computed(() => iconBgClasses[props.iconColor])

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="description"
  >
    <template #body>
      <div class="flex gap-4">
        <div
          class="flex size-12 shrink-0 items-center justify-center rounded-full"
          :class="iconBgClass"
        >
          <UIcon :name="icon" class="size-6" />
        </div>
        <div class="flex-1">
          <p class="text-sm text-muted">
            <slot name="message">{{ message }}</slot>
          </p>
          <p v-if="subMessage || $slots.subMessage" class="mt-2 text-xs text-muted">
            <slot name="subMessage">{{ subMessage }}</slot>
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton
          label="ยกเลิก"
          color="neutral"
          variant="outline"
          @click="handleCancel"
        />
        <UButton
          :label="confirmLabel"
          :color="confirmColor"
          :loading="loading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
