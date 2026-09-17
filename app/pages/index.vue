<script setup lang="ts">
const { data: students, status, error } = useFetch('/api/students')
</script>

<template>
  <div class="min-h-screen bg-default">
    <UContainer class="py-8">
      <div class="flex items-center gap-2 mb-6">
        <UIcon name="i-lucide-graduation-cap" class="size-8 text-primary" />
        <h1 class="text-2xl font-bold">ระบบนิเทศสหกิจศึกษา</h1>
      </div>

      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        title="ไม่สามารถโหลดข้อมูลได้"
        :description="error.message"
      />

      <UCard v-else>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="size-5" />
            <span class="font-semibold">รายชื่อนักศึกษา</span>
          </div>
        </template>

        <div v-if="status === 'pending'" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
          <span class="ml-2 text-muted">กำลังโหลด...</span>
        </div>

        <div v-else-if="!students?.length" class="text-center py-8 text-muted">
          <UIcon name="i-lucide-inbox" class="size-12 mx-auto mb-2" />
          <p>ยังไม่มีข้อมูลนักศึกษา</p>
        </div>

        <ul v-else class="divide-y divide-default">
          <li v-for="s in students" :key="s.id" class="py-3 flex items-center gap-3">
            <UIcon name="i-lucide-user" class="size-5 text-muted" />
            <span>{{ s.studentId }} — {{ s.firstName }} {{ s.lastName }}</span>
          </li>
        </ul>
      </UCard>
    </UContainer>
  </div>
</template>
