export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) return null
  const name = [user.prefix, user.firstName, user.lastName].filter(Boolean).join(' ')
  return {
    id: user.id,
    loginId: user.loginId,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    name: name || user.loginId
  }
})
