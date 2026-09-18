import assert from 'node:assert/strict'

// Polyfill Nitro's global createError for standalone tsx execution
if (!(globalThis as any).createError) {
  (globalThis as any).createError = (opts: { statusCode?: number; message: string }) => {
    const err = new Error(opts.message)
    Object.assign(err, opts)
    return err
  }
}

import {
  parseStrictDate,
  validateCycleDatesOrder,
  validateCycleTerm,
  validatePositiveYear
} from '../server/utils/cycle'
import { readStudentInput } from '../server/utils/student'
import { readTeacherInput } from '../server/utils/teacher'
import { readCompanyInput } from '../server/utils/company'

console.log('--- 1. Testing Cycle Validation Rules ---')

// Term: only 1, 2, 3
assert.equal(validateCycleTerm(1), 1)
assert.equal(validateCycleTerm('2'), 2)
assert.equal(validateCycleTerm(3), 3)
assert.throws(() => validateCycleTerm(0), /ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3/)
assert.throws(() => validateCycleTerm(4), /ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3/)
assert.throws(() => validateCycleTerm('abc'), /ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3/)
assert.throws(() => validateCycleTerm(1.5), /ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3/)

// Positive Year
assert.equal(validatePositiveYear(2567, 'ปีการศึกษา'), 2567)
assert.throws(() => validatePositiveYear(0, 'ปีการศึกษา'), /ปีการศึกษาต้องเป็นจำนวนเต็มบวก/)
assert.throws(() => validatePositiveYear(-1, 'ปีการศึกษา'), /ปีการศึกษาต้องเป็นจำนวนเต็มบวก/)

// Strict Date Parsing
assert.doesNotThrow(() => parseStrictDate('2026-02-28', 'วัน'))
assert.doesNotThrow(() => parseStrictDate('2024-02-29', 'วัน')) // Leap year
assert.throws(() => parseStrictDate('2026-02-29', 'วัน'), /วันที่ไม่มีอยู่จริง/) // Non-leap year
assert.throws(() => parseStrictDate('2026-02-31', 'วัน'), /วันที่ไม่มีอยู่จริง/)
assert.throws(() => parseStrictDate('2026-04-31', 'วัน'), /วันที่ไม่มีอยู่จริง/)
assert.throws(() => parseStrictDate('', 'วัน'), /กรุณาระบุ/)
assert.throws(() => parseStrictDate('not-a-date', 'วัน'), /รูปแบบวันไม่ถูกต้อง/)
assert.throws(() => parseStrictDate('2026-02-28x', 'วัน'), /รูปแบบวันไม่ถูกต้อง/)

// Date sequence: appStart <= appEnd <= internStart <= internEnd
const d1 = new Date('2026-01-01')
const d2 = new Date('2026-01-15')
const d3 = new Date('2026-02-01')
const d4 = new Date('2026-05-31')

assert.doesNotThrow(() => validateCycleDatesOrder(d1, d2, d3, d4))
// Equal dates are valid boundaries
assert.doesNotThrow(() => validateCycleDatesOrder(d1, d1, d1, d1))
// appStart > appEnd
assert.throws(() => validateCycleDatesOrder(d2, d1, d3, d4), /วันเปิดรับคำร้องต้องไม่เกินวันปิดรับคำร้อง/)
// appEnd > internStart
assert.throws(() => validateCycleDatesOrder(d1, d3, d2, d4), /วันปิดรับคำร้องต้องไม่เกินวันเริ่มฝึกงาน/)
// internStart > internEnd
assert.throws(() => validateCycleDatesOrder(d1, d2, d4, d3), /วันเริ่มฝึกงานต้องไม่เกินวันสิ้นสุดฝึกงาน/)

console.log('✔ Cycle validation rules passed!')

console.log('--- 2. Testing Student Validation Rules ---')
const validStudent = readStudentInput({
  studentId: '66010001',
  prefix: 'นาย',
  firstName: 'ก้องภพ',
  lastName: 'เรียนดี',
  gender: 'ชาย',
  cohortYear: 2566,
  classGroup: 1,
  isActive: true
})
assert.equal(validStudent.studentId, '66010001')
assert.equal(validStudent.isActive, true)

assert.throws(() => readStudentInput({ studentId: '' }), /กรุณากรอกรหัสนักศึกษา/)
assert.throws(() => readStudentInput({ studentId: '66010001', prefix: '', firstName: 'ก', lastName: 'ข', gender: 'ชาย', cohortYear: 2566, classGroup: 1 }), /กรุณาระบุคำนำหน้า/)
assert.throws(() => readStudentInput({ studentId: '66010001', prefix: 'นาย', firstName: 'ก', lastName: 'ข', gender: 'ชาย', cohortYear: 0, classGroup: 1 }), /รุ่นนักศึกษาต้องเป็นจำนวนเต็มบวก/)
assert.throws(() => readStudentInput({ studentId: '66010001', prefix: 'นาย', firstName: 'ก', lastName: 'ข', gender: 'ชาย', cohortYear: 2566, classGroup: 0 }), /หมู่เรียนต้องเป็นจำนวนเต็มบวก/)
assert.throws(() => readStudentInput({ studentId: '66010001', prefix: 'นาย', firstName: 'ก', lastName: 'ข', gender: 'ชาย', cohortYear: 2566, classGroup: 1, isActive: 'false' as any }), /สถานะใช้งานไม่ถูกต้อง/)

console.log('✔ Student validation rules passed!')

console.log('--- 3. Testing Teacher Validation Rules ---')
const validTeacher = readTeacherInput({
  teacherId: 'T001',
  prefix: 'อาจารย์',
  firstName: 'สมหมาย',
  lastName: 'ใจซื่อ',
  gender: 'ชาย',
  phone: '0812345678',
  isActive: true
})
assert.equal(validTeacher.phone, '0812345678')

// Phone must be exactly 10 digits starting with 0
assert.throws(() => readTeacherInput({ teacherId: 'T001', prefix: 'อาจารย์', firstName: 'สม', lastName: 'ใจ', gender: 'ชาย', phone: '123' }), /เบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0/)
assert.throws(() => readTeacherInput({ teacherId: 'T001', prefix: 'อาจารย์', firstName: 'สม', lastName: 'ใจ', gender: 'ชาย', phone: '081234567' }), /เบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0/)
assert.throws(() => readTeacherInput({ teacherId: 'T001', prefix: 'อาจารย์', firstName: 'สม', lastName: 'ใจ', gender: 'ชาย', phone: '08123456789' }), /เบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0/)
assert.throws(() => readTeacherInput({ teacherId: 'T001', prefix: 'อาจารย์', firstName: 'สม', lastName: 'ใจ', gender: 'ชาย', phone: '1812345678' }), /เบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0/)
assert.throws(() => readTeacherInput({ teacherId: 'T001', prefix: 'อาจารย์', firstName: 'สม', lastName: 'ใจ', gender: 'ชาย', phone: '081234567a' }), /เบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0/)

console.log('✔ Teacher validation rules passed!')

console.log('--- 4. Testing Company Validation Rules ---')
const validCompany = readCompanyInput({
  name: 'บริษัท ทดสอบ จำกัด',
  contactPerson: 'คุณทดสอบ',
  addressNo: '123',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'ขอนแก่น',
  postalCode: '40000',
  isActive: false
})
assert.equal(validCompany.isActive, false)

// String 'false' should be rejected, not coerced to true
assert.throws(() => readCompanyInput({
  name: 'บริษัท ทดสอบ จำกัด',
  contactPerson: 'คุณทดสอบ',
  addressNo: '123',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'ขอนแก่น',
  postalCode: '40000',
  isActive: 'false' as any
}), /สถานะใช้งานไม่ถูกต้อง/)

console.log('✔ Company validation rules passed!')
console.log('\nAll validation regression tests PASSED successfully!')

import 'dotenv/config'
import { prisma, isUniqueConstraintError } from '../server/utils/db'

async function testDatabaseRules() {
  console.log('--- 5. Testing Database Constraints & Unique Rules ---')
  const testTerm = 3
  const testYear = 2999

  // Ensure clean start
  await prisma.cooperativeCycle.deleteMany({
    where: { term: testTerm, academicYear: testYear }
  })

  // Create first record
  const cycle = await prisma.cooperativeCycle.create({
    data: {
      term: testTerm,
      academicYear: testYear,
      cohortYear: 2996,
      applicationStartDate: new Date('2999-01-01'),
      applicationEndDate: new Date('2999-01-15'),
      internshipStartDate: new Date('2999-02-01'),
      internshipEndDate: new Date('2999-05-31'),
      status: 'OPEN_FOR_APPLICATION'
    }
  })
  assert(cycle.id > 0)

  // Attempt duplicate (term, academicYear) to trigger P2002
  let duplicateCaught = false
  try {
    await prisma.cooperativeCycle.create({
      data: {
        term: testTerm,
        academicYear: testYear,
        cohortYear: 2996,
        applicationStartDate: new Date('2999-01-01'),
        applicationEndDate: new Date('2999-01-15'),
        internshipStartDate: new Date('2999-02-01'),
        internshipEndDate: new Date('2999-05-31'),
        status: 'OPEN_FOR_APPLICATION'
      }
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      duplicateCaught = true
    }
  }
  assert.equal(duplicateCaught, true, 'Duplicate term/academicYear must be caught as isUniqueConstraintError (P2002)')

  // Cleanup test record
  await prisma.cooperativeCycle.delete({ where: { id: cycle.id } })
  console.log('✔ Database constraint tests passed!')

  console.log('\n=============================================')
  console.log('All regression and business rule checks PASSED!')
  console.log('=============================================\n')
  process.exit(0)
}

testDatabaseRules().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
