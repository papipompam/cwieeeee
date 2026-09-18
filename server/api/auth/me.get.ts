export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  return user ? { loginId: user.loginId, role: user.role } : null
})
