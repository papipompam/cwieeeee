<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <UDashboardNavbar v-bind="$attrs">
    <template v-if="$slots.toggle" #toggle="slotProps"><slot name="toggle" v-bind="slotProps" /></template>
    <template v-if="$slots.left" #left="slotProps"><slot name="left" v-bind="slotProps" /></template>
    <template v-if="$slots.leading" #leading="slotProps"><slot name="leading" v-bind="slotProps" /></template>
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.trailing" #trailing="slotProps"><slot name="trailing" v-bind="slotProps" /></template>
    <template v-if="$slots.default" #default="slotProps"><slot v-bind="slotProps" /></template>
    <template #right="slotProps">
      <slot name="right" v-bind="slotProps" />
      <AppUserMenu header class="w-auto shrink-0" />
      <AppStudentProfileModal />
    </template>
  </UDashboardNavbar>
</template>
