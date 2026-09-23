export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสบัญชีไม่ถูกต้อง' })
  }

  const body = await readBody(event)
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  }

  const account = await prisma.user.findUnique({ where: { id }, select: { id: true, loginId: true } })
  if (!account) throw createError({ statusCode: 404, message: 'ไม่พบบัญชีผู้ใช้' })

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } })
  await destroyOtherSessions(event, account.id)

  return { success: true, loginId: account.loginId }
})
