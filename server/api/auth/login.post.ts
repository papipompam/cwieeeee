const failedLogins = new Map<string, { attempts: number; resetAt: number }>()
const maxAttempts = 5
const windowMs = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const limit = failedLogins.get(ip)
  if (limit && limit.resetAt > now && limit.attempts >= maxAttempts) {
    throw createError({ statusCode: 429, message: 'ลองเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง' })
  }
  if (limit && limit.resetAt <= now) failedLogins.delete(ip)

  const body = await readBody(event)
  const loginId = typeof body.loginId === 'string' ? body.loginId.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!loginId || !password) throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน' })
  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    const current = failedLogins.get(ip)
    failedLogins.set(ip, { attempts: (current?.resetAt && current.resetAt > now ? current.attempts : 0) + 1, resetAt: now + windowMs })
    throw createError({ statusCode: 401, message: 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง' })
  }
  failedLogins.delete(ip)
  await createSession(event, user.id)
  return { loginId: user.loginId, role: user.role, mustChangePassword: user.mustChangePassword }
})
