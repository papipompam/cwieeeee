import 'dotenv/config'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Setup global Nitro/H3 primitives for standalone tsx test execution
;(globalThis as any).defineEventHandler = (fn: any) => fn
;(globalThis as any).createError = (opts: { statusCode?: number; message?: string }) => {
  const err = new Error(opts.message || '')
  Object.assign(err, opts)
  return err
}
;(globalThis as any).getRouterParam = (event: any, key: string) => event.context?.params?.[key]
;(globalThis as any).getQuery = (event: any) => event.context?.query || {}
;(globalThis as any).readBody = async (event: any) => event._body
;(globalThis as any).readMultipartFormData = async (event: any) => event._formData
;(globalThis as any).sendStream = (event: any, stream: any) => stream
;(globalThis as any).setHeader = (event: any, name: string, val: string) => {}

import { prisma } from '../server/utils/db'
;(globalThis as any).prisma = prisma

import {
  getStaffCycle,
  getStaffCycleRequest,
  validatePositiveId,
  deriveStudentCycleStatus
} from '../server/utils/cycle'
import { readCompanyInput } from '../server/utils/company'
;(globalThis as any).getStaffCycle = getStaffCycle
;(globalThis as any).getStaffCycleRequest = getStaffCycleRequest
;(globalThis as any).validatePositiveId = validatePositiveId

import { requireRole } from '../server/utils/auth'
;(globalThis as any).requireRole = async (event: any, role: string) => {
  if (event.context?.user) {
    if (event.context.user.role !== role) {
      throw (globalThis as any).createError({ statusCode: 403, message: 'ไม่มีสิทธิ์ใช้งาน' })
    }
    return event.context.user
  }
  return requireRole(event, role as any)
}

const TEST_STUDENT_LOGIN = '__staff_test_student_isolated__'
const TEST_STAFF_LOGIN = '__staff_test_staff_isolated__'
const TEST_COMPANY_NAME = '__staff_test_company_isolated__'

function createMockEvent(opts: {
  params?: Record<string, string>
  query?: Record<string, string>
  body?: any
  formData?: any
  staffUser: any
}) {
  return {
    context: {
      params: opts.params || {},
      query: opts.query || {},
      user: opts.staffUser
    },
    _body: opts.body,
    _formData: opts.formData
  } as any
}

async function runSelfCheck() {
  console.log('--- Running Non-Destructive Staff Cycle Workflow Self-Check ---')

  // 1. Pure unit tests: derived cycle status mapping
  assert.equal(deriveStudentCycleStatus([]).key, 'NOT_APPLIED')
  assert.equal(deriveStudentCycleStatus([{ status: 'SUBMITTED' }]).key, 'APPLYING')
  assert.equal(deriveStudentCycleStatus([{ status: 'ACCEPTED' }]).key, 'ACCEPTED')
  assert.equal(deriveStudentCycleStatus([{ status: 'REJECTED' }, { status: 'WITHDRAWN' }]).key, 'TERMINATED')
  assert.equal(deriveStudentCycleStatus([{ status: 'CONFIRMED', cooperativeRequest: { status: 'SUBMITTED' } }]).key, 'REQUEST_SUBMITTED')
  assert.equal(deriveStudentCycleStatus([{ status: 'CONFIRMED', cooperativeRequest: { status: 'LETTER_READY' } }]).key, 'WAITING_DOCUMENT')
  assert.equal(deriveStudentCycleStatus([{ status: 'CONFIRMED', cooperativeRequest: { status: 'DOCUMENT_UNDER_REVIEW' } }]).key, 'DOCUMENT_UNDER_REVIEW')
  assert.equal(deriveStudentCycleStatus([{ status: 'CONFIRMED', cooperativeRequest: { status: 'PLACEMENT_CONFIRMED' } }]).key, 'PLACEMENT_CONFIRMED')
  console.log('✔ Derived status unit checks passed')

  // 2. Setup isolated test entities (NEVER touch real student data)
  // Clean up any previously created test runner entities
  await prisma.user.deleteMany({
    where: { loginId: { in: [TEST_STUDENT_LOGIN, TEST_STAFF_LOGIN] } }
  })
  await prisma.company.deleteMany({
    where: { name: TEST_COMPANY_NAME }
  })

  const testCycle = await prisma.cooperativeCycle.findFirst({
    where: { status: 'OPEN_FOR_APPLICATION' }
  })
  assert.ok(testCycle, 'Found active cycle for testing')

  const testStaff = await prisma.user.create({
    data: {
      loginId: TEST_STAFF_LOGIN,
      passwordHash: 'dummy_hash',
      role: 'STAFF',
      prefix: 'จนท.',
      firstName: 'ทดสอบ',
      lastName: 'ระบบรอบ',
      isActive: true
    }
  })

  const testStudent = await prisma.user.create({
    data: {
      loginId: TEST_STUDENT_LOGIN,
      passwordHash: 'dummy_hash',
      role: 'STUDENT',
      prefix: 'นศ.',
      firstName: 'ทดสอบ',
      lastName: 'เดี่ยว',
      cohortYear: testCycle.cohortYear,
      classGroup: 1,
      isActive: true
    }
  })

  const testCompany = await prisma.company.create({
    data: readCompanyInput({
      name: TEST_COMPANY_NAME,
      contactPerson: 'HR Test',
      addressNo: '1',
      subdistrict: 'ต.',
      district: 'อ.',
      province: 'กรุงเทพฯ',
      postalCode: '10000'
    })
  })

  const testApp = await prisma.companyApplication.create({
    data: {
      studentUserId: testStudent.id,
      cooperativeCycleId: testCycle.id,
      companyId: testCompany.id,
      status: 'CONFIRMED',
      applicationPosition: 'QA Intern'
    }
  })

  const testReq = await prisma.cooperativeRequest.create({
    data: {
      companyApplicationId: testApp.id,
      status: 'SUBMITTED',
      companyName: testCompany.name,
      position: 'QA Intern',
      province: 'กรุงเทพฯ',
      recipientName: 'Manager'
    }
  })

  console.log('✔ Dedicated test records created (isolated from real users)')

  // Import real handler functions dynamically
  const letterPostHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/requests/[requestId]/letter.post')).default
  const returnPostHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/requests/[requestId]/return.post')).default
  const rejectPostHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/requests/[requestId]/reject.post')).default
  const confirmPlacementHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/requests/[requestId]/confirm-placement.post')).default

  // 3. Test Real Handler: letter.post (Multipart & validation)
  console.log('--- Testing letter.post validation & status transition ---')

  // 3.1 Reject non-PDF file
  const nonPdfEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    formData: [{ name: 'file', filename: 'malicious.exe', type: 'application/octet-stream', data: Buffer.from('not pdf') }],
    staffUser: testStaff
  })
  await assert.rejects(
    async () => letterPostHandler(nonPdfEvent),
    /อนุญาตเฉพาะไฟล์ PDF เท่านั้น/,
    'Handler must reject non-PDF file'
  )

  // 3.2 Reject PDF with fake extension or invalid magic bytes
  const fakePdfEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    formData: [{ name: 'file', filename: 'fake.pdf', type: 'application/pdf', data: Buffer.from('FAKE-CONTENT-NOT-PDF') }],
    staffUser: testStaff
  })
  await assert.rejects(
    async () => letterPostHandler(fakePdfEvent),
    /อนุญาตเฉพาะไฟล์ PDF เท่านั้น/,
    'Handler must reject file without %PDF- magic bytes'
  )

  // 3.3 Valid upload on SUBMITTED request -> status becomes LETTER_READY
  const validPdfBuffer = Buffer.from('%PDF-1.4 official letter test body')
  const validUploadEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    formData: [{ name: 'file', filename: 'official-letter.pdf', type: 'application/pdf', data: validPdfBuffer }],
    staffUser: testStaff
  })
  const uploadResult = await letterPostHandler(validUploadEvent)
  assert.equal(uploadResult.request.status, 'LETTER_READY', 'SUBMITTED moves to LETTER_READY on initial upload')
  assert.ok(uploadResult.request.letterFilePath && fs.existsSync(uploadResult.request.letterFilePath), 'File exists on disk')

  // Verify student notification created
  const letterNotif = await prisma.notification.findFirst({
    where: { userId: testStudent.id },
    orderBy: { createdAt: 'desc' }
  })
  assert.ok(letterNotif, 'Student notification generated')
  assert.match(letterNotif.title, /หนังสือขอความอนุเคราะห์/)

  // 3.4 REPLACE LETTER during DOCUMENT_UNDER_REVIEW: MUST NOT REVERT TO LETTER_READY!
  // Student submits acceptance doc -> status moves to DOCUMENT_UNDER_REVIEW
  await prisma.cooperativeRequest.update({
    where: { id: testReq.id },
    data: { status: 'DOCUMENT_UNDER_REVIEW' }
  })
  await prisma.requestDocument.create({
    data: {
      cooperativeRequestId: testReq.id,
      fileName: 'student-doc.pdf',
      filePath: '/tmp/dummy.pdf',
      fileSize: 100,
      mimeType: 'application/pdf',
      status: 'UPLOADED',
      version: 1
    }
  })

  // Staff replaces the official letter file
  const replaceLetterEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    formData: [{ name: 'file', filename: 'official-letter-v2.pdf', type: 'application/pdf', data: validPdfBuffer }],
    staffUser: testStaff
  })
  const replaceResult = await letterPostHandler(replaceLetterEvent)
  assert.equal(
    replaceResult.request.status,
    'DOCUMENT_UNDER_REVIEW',
    'Replacing letter while in review MUST KEEP DOCUMENT_UNDER_REVIEW (must not revert to LETTER_READY)'
  )

  // Clean up uploaded letter file
  if (replaceResult.request.letterFilePath && fs.existsSync(replaceResult.request.letterFilePath)) {
    fs.rmSync(replaceResult.request.letterFilePath, { force: true })
  }
  console.log('✔ letter.post validation, file write, and review status preservation passed')

  // 4. Test Real Handler: return.post
  console.log('--- Testing return.post validation & atomic status guard ---')

  // 4.1 Empty reason rejected
  const emptyReasonEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    body: { reason: '   ' },
    staffUser: testStaff
  })
  await assert.rejects(
    async () => returnPostHandler(emptyReasonEvent),
    /กรุณาระบุเหตุผลที่ส่งกลับแก้ไข/,
    'Return requires non-empty reason'
  )

  // 4.2 Valid return for revision
  const validReturnEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    body: { reason: 'เอกสารขาดตราประทับบริษัท' },
    staffUser: testStaff
  })
  const returnResult = await returnPostHandler(validReturnEvent)
  assert.equal(returnResult.request.status, 'RETURNED_FOR_REVISION')
  assert.equal(returnResult.request.returnedReason, 'เอกสารขาดตราประทับบริษัท')

  // 4.3 Stale status concurrency test on return.post
  // Calling return again when status is already RETURNED_FOR_REVISION must throw 400 or 409
  await assert.rejects(
    async () => returnPostHandler(validReturnEvent),
    /สามารถส่งกลับแก้ไขได้เฉพาะคำร้องที่อยู่ในสถานะรอตรวจสอบเอกสารเท่านั้น|สถานะคำร้องมีการเปลี่ยนแปลงแล้ว/,
    'Concurrency/state guard prevents invalid transition'
  )
  console.log('✔ return.post validation, reason requirement, and concurrency guard passed')

  // 5. Test Real Handler: reject.post
  console.log('--- Testing reject.post validation & atomic status guard ---')

  // 5.1 Empty reason rejected
  const emptyRejectEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    body: { reason: '' },
    staffUser: testStaff
  })
  await assert.rejects(
    async () => rejectPostHandler(emptyRejectEvent),
    /กรุณาระบุเหตุผลที่ปฏิเสธคำร้อง/
  )

  // 5.2 Valid reject on SUBMITTED request
  await prisma.cooperativeRequest.update({
    where: { id: testReq.id },
    data: { status: 'SUBMITTED' }
  })
  const validRejectEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    body: { reason: 'คุณสมบัติไม่ตรงกับเกณฑ์ของคณะ' },
    staffUser: testStaff
  })
  const rejectResult = await rejectPostHandler(validRejectEvent)
  assert.equal(rejectResult.request.status, 'REJECTED')
  assert.equal(rejectResult.request.rejectedReason, 'คุณสมบัติไม่ตรงกับเกณฑ์ของคณะ')

  // Check application status also updated to REJECTED
  const updatedApp = await prisma.companyApplication.findUnique({ where: { id: testApp.id } })
  assert.equal(updatedApp?.status, 'REJECTED')

  // Calling reject again on terminal state rejected with 400
  await assert.rejects(
    async () => rejectPostHandler(validRejectEvent),
    /ไม่สามารถปฏิเสธคำร้องในสถานะปัจจุบันได้/
  )
  console.log('✔ reject.post validation and terminal guard passed')

  // 6. Test Real Handler: confirm-placement.post & document requirement
  console.log('--- Testing confirm-placement.post document requirement & atomic status guard ---')

  // 6.1 Reject confirmation when NO document exists
  await prisma.requestDocument.deleteMany({
    where: { cooperativeRequestId: testReq.id }
  })
  await prisma.cooperativeRequest.update({
    where: { id: testReq.id },
    data: { status: 'DOCUMENT_UNDER_REVIEW' }
  })

  const confirmNoDocEvent = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    staffUser: testStaff
  })
  await assert.rejects(
    async () => confirmPlacementHandler(confirmNoDocEvent),
    /ไม่สามารถยืนยันสถานที่ฝึกงานได้เนื่องจากไม่พบเอกสารตอบรับ/,
    'Must reject confirm-placement when no document exists'
  )
  console.log('✔ confirm-placement correctly rejects when no document exists (400)')

  // 6.2 Setup valid document
  const testDoc = await prisma.requestDocument.create({
    data: {
      cooperativeRequestId: testReq.id,
      fileName: 'acceptance-letter.pdf',
      filePath: '/tmp/test-acceptance.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      status: 'UPLOADED',
      version: 1
    }
  })

  // 6.3 Test REAL CONCURRENCY RACE condition: dispatch two simultaneous mutations
  console.log('--- Testing REAL CONCURRENCY RACE condition (dispatch 2 simultaneous mutations) ---')
  const raceEvent1 = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    staffUser: testStaff
  })
  const raceEvent2 = createMockEvent({
    params: { cycleId: String(testCycle.id), requestId: String(testReq.id) },
    body: { reason: 'ต้องการให้แก้ไขเอกสาร' },
    staffUser: testStaff
  })

  // Both handlers read DOCUMENT_UNDER_REVIEW and pass the pre-check concurrently!
  const [raceRes1, raceRes2] = await Promise.allSettled([
    confirmPlacementHandler(raceEvent1),
    returnPostHandler(raceEvent2)
  ])

  const fulfilled = [raceRes1, raceRes2].filter(r => r.status === 'fulfilled')
  const rejected = [raceRes1, raceRes2].filter(r => r.status === 'rejected')

  assert.equal(fulfilled.length, 1, 'Exactly one of the concurrent transactions must succeed')
  assert.equal(rejected.length, 1, 'The competing concurrent transaction must be rejected')

  const raceError = (rejected[0] as PromiseRejectedResult).reason
  assert.equal(raceError?.statusCode, 409, 'Competing transaction must fail with HTTP 409 Conflict')
  assert.match(raceError?.message, /สถานะคำร้องมีการเปลี่ยนแปลงแล้ว/, '409 error message must indicate state change')
  console.log('✔ Real concurrent race test passed: 1 succeeded, 1 failed with 409 Conflict')
  console.log('✔ confirm-placement.post atomic transition and guard passed')

  // 7. Cycle isolation check
  console.log('--- Testing cycle isolation ---')
  const wrongCycleEvent = createMockEvent({
    params: { cycleId: String(testCycle.id + 99999), requestId: String(testReq.id) },
    staffUser: testStaff
  })
  await assert.rejects(
    async () => confirmPlacementHandler(wrongCycleEvent),
    /ไม่พบข้อมูล/
  )
  console.log('✔ Cycle isolation verified')

  // 8. Clean up ONLY our dedicated test user & records
  await prisma.user.deleteMany({
    where: { loginId: { in: [TEST_STUDENT_LOGIN, TEST_STAFF_LOGIN] } }
  })
  await prisma.company.deleteMany({
    where: { name: TEST_COMPANY_NAME }
  })
  console.log('✔ Cleaned up test records (0 real data modified)')

  console.log('\n======================================================')
  console.log('All non-destructive staff cycle checks PASSED successfully!')
  console.log('======================================================\n')
}

runSelfCheck()
  .catch((err) => {
    console.error('Self-check failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
