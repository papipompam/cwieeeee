<script setup lang="ts">
const state = reactive({ loginId: '', password: '' })
const error = ref('')
const loading = ref(false)
const passwordVisible = ref(false)

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap' }
  ]
})

const submit = async () => {
  error.value = ''
  if (!state.loginId.trim() || !state.password) { error.value = 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน'; return }
  loading.value = true
  try {
    const user = await $fetch<{ role: 'STAFF' | 'TEACHER' | 'STUDENT' }>('/api/auth/login', { method: 'POST', body: state })
    await navigateTo(user.role === 'STAFF' ? '/staff' : user.role === 'TEACHER' ? '/teacher' : '/student')
  } catch (cause: unknown) {
    const data = typeof cause === 'object' && cause && 'data' in cause ? cause.data : null
    error.value = typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : 'ไม่สามารถเข้าสู่ระบบได้'
  } finally { loading.value = false }
}
</script>

<template>
  <main class="login-page grid min-h-dvh overflow-hidden bg-white lg:grid-cols-2">
    <section class="relative isolate hidden min-h-dvh overflow-hidden bg-neutral-950 lg:flex lg:items-center" aria-labelledby="login-welcome-title">
      <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('/images/login-hero.png')" aria-hidden="true" />
      <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,27,36,0.92)_0%,rgba(21,27,36,0.6)_55%,rgba(21,27,36,0.16)_100%)]" aria-hidden="true" />
      <div class="absolute left-12 top-12 size-2 rounded-full bg-[#F5B32B]" aria-hidden="true" />

      <div class="relative z-10 max-w-xl px-12 xl:px-20">
        <p class="text-lg font-bold tracking-[0.18em] text-[#F5B32B]">CWIE BRU</p>
        <h1 id="login-welcome-title" class="mt-6 text-2xl font-semibold leading-9 text-white">ระบบบริหารจัดการการนิเทศสหกิจศึกษา</h1>
        <p class="mt-4 max-w-lg text-base leading-7 text-white/70">จัดการคำร้อง ติดตามการปฏิบัติงาน และวางแผนการนิเทศสหกิจศึกษาได้ในระบบเดียว</p>
      </div>
    </section>

    <section class="relative flex min-h-dvh items-center justify-center bg-white px-5 py-8 sm:px-8 lg:px-14 xl:px-20" aria-labelledby="login-title">
      <svg class="pointer-events-none absolute inset-y-0 left-px hidden h-full w-24 -translate-x-full text-white lg:block" viewBox="0 0 96 800" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M96 0H42C34 82 18 135 35 193C55 262 8 315 28 377C46 432 65 469 32 532C5 585 32 651 46 694C57 729 43 767 55 800H96V0Z" />
      </svg>

      <div class="relative z-10 w-full max-w-lg">
        <header class="mb-7 max-w-md">
          <p class="text-sm font-bold tracking-[0.025em] text-[#99620C]">CWIE BRU</p>
          <h2 id="login-title" class="mt-1 text-2xl font-bold leading-tight tracking-tight text-[#111827] lg:text-3xl">เข้าสู่ระบบ</h2>
          <p class="mt-2 text-sm leading-6 text-[#6B7280]">กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานตามสิทธิ์ของคุณ</p>
        </header>

        <UAlert v-if="error" class="mb-5" color="error" :description="error" />

        <form class="space-y-5" :aria-busy="loading" @submit.prevent="submit">
          <UFormField label="ชื่อผู้ใช้" required :ui="{ container: 'mt-2', label: '!font-bold !text-[#111827]' }">
            <UInput v-model="state.loginId" size="lg" autocomplete="username" placeholder="รหัสนักศึกษา หรือชื่อผู้ใช้" class="w-full" :ui="{ base: 'min-h-11 !rounded-[10px] !bg-[#E8F0FE] !px-3 !text-sm !text-black !ring-[#E5E7EB] placeholder:!text-[#9CA3AF] focus-visible:!ring-[#F5B32B]' }" :disabled="loading" />
          </UFormField>
          <UFormField label="รหัสผ่าน" required :ui="{ container: 'mt-2', label: '!font-bold !text-[#111827]' }">
            <UInput v-model="state.password" size="lg" :type="passwordVisible ? 'text' : 'password'" autocomplete="current-password" placeholder="กรอกรหัสผ่าน" class="w-full" :ui="{ base: 'min-h-11 !rounded-[10px] !bg-[#E8F0FE] !px-3 !text-sm !text-black !ring-[#E5E7EB] placeholder:!text-[#9CA3AF] focus-visible:!ring-[#F5B32B]' }" :disabled="loading">
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="passwordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
                  :disabled="loading"
                  @click="passwordVisible = !passwordVisible"
                />
              </template>
            </UInput>
          </UFormField>
          <UButton type="submit" color="primary" size="lg" block :loading="loading" icon="i-lucide-lock-keyhole" :ui="{ base: 'min-h-11 !rounded-[10px] !bg-[#F5B32B] !text-sm !font-semibold !text-[#171717] hover:!bg-[#E5A31D]' }">เข้าสู่ระบบ</UButton>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  font-family: Prompt, system-ui, sans-serif;
}
</style>
