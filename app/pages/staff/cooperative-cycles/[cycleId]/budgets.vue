<script setup lang="ts">
const route = useRoute()
const cycleId = computed(() => Number(route.params.cycleId))
const searchQuery = ref("")
</script>

<template>
  <div class="space-y-4">
    <!-- Header & Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-wallet-cards" class="size-5 text-primary" />
          งบประมาณ
        </h2>
        <p class="text-xs text-muted mt-0.5">จัดสรรและติดตามงบประมาณค่าใช้จ่ายในการออกนิเทศ</p>
      </div>

      <div class="flex items-center gap-2">
        <UInput
          v-model="searchQuery"
          placeholder="ค้นหาในหน้านี้..."
          icon="i-lucide-search"
          class="w-56 text-sm"
        />
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="overflow-hidden rounded-lg border border-default bg-default shadow-xs">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-default text-sm text-left">
          <thead class="bg-muted/30 text-xs font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th scope="col" class="px-4 py-3">รายการ/การนิเทศ</th>
              <th scope="col" class="px-4 py-3">อาจารย์</th>
              <th scope="col" class="px-4 py-3">พื้นที่</th>
              <th scope="col" class="px-4 py-3">จำนวนเงิน</th>
              <th scope="col" class="px-4 py-3">สถานะการจัดสรร</th>
              <th scope="col" class="px-4 py-3">หมายเหตุ</th>
              <th scope="col" class="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr>
              <td colspan="7" class="py-12 text-center text-muted">
                <UIcon name="i-lucide-wallet-cards" class="size-8 mx-auto mb-2 text-dimmed" />
                <p class="font-medium text-highlighted">ยังไม่มีข้อมูลงบประมาณในรอบนี้</p>
                <p class="text-xs text-muted mt-1">
                  ระบบจะเปิดให้บันทึกข้อมูลเมื่อเข้าสู่ขั้นตอนกระบวนการของรอบนี้
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
