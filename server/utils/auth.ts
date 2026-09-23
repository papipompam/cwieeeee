import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const sessionCookie = 'cwie_session'

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export const verifyPassword = async (password: string, stored: string) => {
  const [salt, saved] = stored.split(':')
  if (!salt || !saved) return false
  const hash = await scrypt(password, salt, 64) as Buffer
  const savedHash = Buffer.from(saved, 'hex')
  return savedHash.length === hash.length && timingSafeEqual(hash, savedHash)
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const createSession = async (event: Parameters<typeof setCookie>[0], userId: number) => {
  const token = randomBytes(32).toString('base64url')
  await prisma.authSession.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
  setCookie(event, sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 7 * 24 * 60 * 60 })
}

export const destroySession = async (event: Parameters<typeof setCookie>[0]) => {
  const token = getCookie(event, sessionCookie)
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } })
  setCookie(event, sessionCookie, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

export const destroyOtherSessions = async (event: Parameters<typeof setCookie>[0], userId: number) => {
  const token = getCookie(event, sessionCookie)
  await prisma.authSession.deleteMany({
    where: {
      userId,
      ...(token ? { tokenHash: { not: hashToken(token) } } : {})
    }
  })
}

export const getCurrentUser = async (event: Parameters<typeof getCookie>[0]) => {
  const token = getCookie(event, sessionCookie)
  if (!token) return null
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null
  return session.user
}

export const requireRole = async (event: Parameters<typeof getCookie>[0], role: 'STAFF' | 'TEACHER' | 'STUDENT') => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  if (user.role !== role) throw createError({ statusCode: 403, message: 'ไม่มีสิทธิ์ใช้งาน' })
  return user
}
