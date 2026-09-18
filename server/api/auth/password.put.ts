export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })

  const body = await readBody(event)
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || newPassword.length < 8) {
    throw createError({ statusCode: 400, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw createError({ statusCode: 400, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } })
  return { success: true }
})
