// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  routeRules: {
    '/student/requests': { redirect: '/student/applications' },
    '/student/requests/**': { redirect: '/student/applications' }
  },
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
})
