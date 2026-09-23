import 'dotenv/config'
import assert from 'node:assert/strict'

;(globalThis as any).defineEventHandler = (handler: unknown) => handler
;(globalThis as any).createError = (options: { statusCode?: number, message?: string }) => Object.assign(new Error(options.message), options)
;(globalThis as any).getRouterParam = (event: { context?: { params?: Record<string, string> } }, key: string) => event.context?.params?.[key]
;(globalThis as any).readBody = async (event: { body?: unknown }) => event.body
;(globalThis as any).getCookie = (event: { cookie?: string }) => event.cookie

import { prisma } from '../server/utils/db'
;(globalThis as any).prisma = prisma

import { destroyOtherSessions, hashPassword, verifyPassword } from '../server/utils/auth'
;(globalThis as any).destroyOtherSessions = destroyOtherSessions
;(globalThis as any).hashPassword = hashPassword
;(globalThis as any).verifyPassword = verifyPassword

import { readStudentInput } from '../server/utils/student'
;(globalThis as any).readStudentInput = readStudentInput

const STUDENT_LOGIN = '__auth_password_student__'
const STAFF_LOGIN = '__auth_password_staff__'

const event = (user: { id: number, role: string, mustChangePassword: boolean }, body?: unknown, params?: Record<string, string>, cookie?: string) => ({
  context: { user, params },
  body,
  cookie
})

const expectError = async (action: () => Promise<unknown>, statusCode: number) => {
  await assert.rejects(action, (error: unknown) => typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === statusCode)
}

const run = async () => {
  await prisma.user.deleteMany({ where: { loginId: { in: [STUDENT_LOGIN, STAFF_LOGIN] } } })

  try {
    const createStudent = (await import('../server/api/students/index.post')).default
    const resetPassword = (await import('../server/api/staff/users/[id]/password.put')).default
    const changeOwnPassword = (await import('../server/api/auth/password.put')).default

    const staff = await prisma.user.create({
      data: {
        loginId: STAFF_LOGIN,
        passwordHash: await hashPassword('staff-password'),
        role: 'STAFF',
        prefix: 'จนท.',
        firstName: 'ทดสอบ',
        lastName: 'รหัสผ่าน'
      }
    })

    ;(globalThis as any).requireRole = async (request: ReturnType<typeof event>, role: string) => {
      if (request.context.user.role !== role) throw (globalThis as any).createError({ statusCode: 403, message: 'ไม่มีสิทธิ์ใช้งาน' })
      return request.context.user
    }
    ;(globalThis as any).getCurrentUser = async (request: ReturnType<typeof event>) => request.context.user

    await createStudent(event(staff as never, {
      studentId: STUDENT_LOGIN,
      prefix: 'นาย',
      firstName: 'นักศึกษา',
      lastName: 'ทดสอบ',
      cohortYear: 2566,
      classGroup: 1
    }))

    let student = await prisma.user.findUniqueOrThrow({ where: { loginId: STUDENT_LOGIN } })
    assert.equal(student.mustChangePassword, true)
    assert.equal(await verifyPassword(STUDENT_LOGIN, student.passwordHash), true)
    console.log('✔ New student gets their student ID as a temporary password')

    await prisma.authSession.create({ data: { userId: student.id, tokenHash: 'old-student-session', expiresAt: new Date(Date.now() + 60_000) } })
    await resetPassword(event(staff as never, { newPassword: 'staff-reset-password' }, { id: String(student.id) }, 'staff-session'))
    student = await prisma.user.findUniqueOrThrow({ where: { id: student.id } })
    assert.equal(await verifyPassword('staff-reset-password', student.passwordHash), true)
    assert.equal(student.mustChangePassword, true)
    assert.equal(await prisma.authSession.count({ where: { userId: student.id } }), 0)
    console.log('✔ Staff can reset any account password and invalidates that account sessions')

    await changeOwnPassword(event(student, { newPassword: 'student-private-password' }))
    student = await prisma.user.findUniqueOrThrow({ where: { id: student.id } })
    assert.equal(await verifyPassword('student-private-password', student.passwordHash), true)
    assert.equal(student.mustChangePassword, false)
    await expectError(() => changeOwnPassword(event(student, { newPassword: 'another-password' })), 400)
    console.log('✔ First-login password change clears the requirement; later changes require the current password')
  } finally {
    await prisma.user.deleteMany({ where: { loginId: { in: [STUDENT_LOGIN, STAFF_LOGIN] } } })
    await prisma.$disconnect()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
