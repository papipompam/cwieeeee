export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return
  const requestFetch = useRequestFetch()
  const user = await requestFetch<{ role: 'STAFF' | 'TEACHER' | 'STUDENT', mustChangePassword: boolean } | null>('/api/auth/me')
  if (!user) return navigateTo('/login')
  if (to.path === '/account/password') return
  if (user.mustChangePassword) return navigateTo('/account/password')
  const prefix = user.role === 'STAFF' ? '/staff' : user.role === 'TEACHER' ? '/teacher' : '/student'
  if (!to.path.startsWith(prefix)) return navigateTo(prefix)
})
