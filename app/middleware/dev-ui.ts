export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.dev) return

  const requestFetch = useRequestFetch()
  const user = await requestFetch<{ role: 'STAFF' | 'TEACHER' | 'STUDENT' } | null>('/api/auth/me')

  if (!user) return navigateTo('/login')
  if (user.role !== 'STAFF') {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page not found' }))
  }
})
