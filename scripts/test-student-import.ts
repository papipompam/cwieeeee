import 'dotenv/config'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'

;(globalThis as any).defineEventHandler = (handler: unknown) => handler
;(globalThis as any).createError = (options: { statusCode?: number, message?: string }) => Object.assign(new Error(options.message), options)
;(globalThis as any).readMultipartFormData = async (event: { parts?: unknown }) => event.parts

import { prisma } from '../server/utils/db'
;(globalThis as any).prisma = prisma

import { hashPassword, verifyPassword } from '../server/utils/auth'
;(globalThis as any).hashPassword = hashPassword

import { readStudentInput } from '../server/utils/student'
;(globalThis as any).readStudentInput = readStudentInput

const TEST_LOGIN = '__student_import_test__'

const run = async () => {
  await prisma.user.deleteMany({ where: { loginId: TEST_LOGIN } })

  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('นักศึกษา')
    worksheet.addRow(['รหัส', 'ชื่อ', 'รุ่น', 'หมู่เรียน'])
    worksheet.addRow([TEST_LOGIN, 'นาย ทดสอบ นำเข้า', 66, 1])
    const data = Buffer.from(await workbook.xlsx.writeBuffer())

    const importStudents = (await import('../server/api/students/import.post')).default
    const result = await importStudents({
      parts: [{ name: 'file', filename: 'students.xlsx', data }]
    })
    assert.deepEqual(result, { imported: 1, skipped: 0, total: 1 })

    const student = await prisma.user.findUniqueOrThrow({ where: { loginId: TEST_LOGIN } })
    assert.equal(student.prefix, 'นาย')
    assert.equal(student.firstName, 'ทดสอบ')
    assert.equal(student.lastName, 'นำเข้า')
    assert.equal(student.cohortYear, 2566)
    assert.equal(student.mustChangePassword, true)
    assert.equal(await verifyPassword(TEST_LOGIN, student.passwordHash), true)
    console.log('✔ Import accepts the original student spreadsheet shape and creates a first-login password')
  } finally {
    await prisma.user.deleteMany({ where: { loginId: TEST_LOGIN } })
    await prisma.$disconnect()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
