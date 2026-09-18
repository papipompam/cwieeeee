export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const loginId = typeof body.loginId === 'string' ? body.loginId.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!loginId || !password) throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน' })
  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) throw createError({ statusCode: 401, message: 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง' })
  await createSession(event, user.id)
  return { loginId: user.loginId, role: user.role }
})
