import assert from 'node:assert/strict'
import { prisma } from '../server/utils/db'
import { ACTIVE_APPLICATION_STATUSES, ALLOWED_APPLICATION_TRANSITIONS, ALLOWED_REQUEST_TRANSITIONS } from '../server/utils/student-workflow'

async function runSelfCheck() {
  console.log('--- Running Student Workflow Self-Check ---')

  // 1. Check transition matrices
  assert.deepEqual(
    ALLOWED_APPLICATION_TRANSITIONS.SUBMITTED,
    ['AWAITING_RESPONSE', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
  )
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.ACCEPTED, ['CONFIRMED'])
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.REJECTED, [])
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.CONFIRMED, [])

  assert.ok(ACTIVE_APPLICATION_STATUSES.includes('SUBMITTED'))
  assert.ok(ACTIVE_APPLICATION_STATUSES.includes('ACCEPTED'))
  assert.ok(!ACTIVE_APPLICATION_STATUSES.includes('CONFIRMED'))
  assert.ok(!ACTIVE_APPLICATION_STATUSES.includes('REJECTED'))

  // 2. Test DB insertion and transitions with test user
  const testStudent = await prisma.user.findFirst({
    where: { role: 'STUDENT', isActive: true }
  })
  assert.ok(testStudent, 'Found at least one test student')

  const cycle = await prisma.cooperativeCycle.findFirst({
    where: { status: 'OPEN_FOR_APPLICATION' }
  })
  assert.ok(cycle, 'Found active cooperative cycle')

  let company = await prisma.company.findFirst({
    where: { isActive: true }
  })
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Test Self-Check Company',
        contactPerson: 'Manager Test',
        addressNo: '99',
        subdistrict: 'In-city',
        district: 'Muang',
        province: 'Buriram',
        postalCode: '31000'
      }
    })
  }

  // Clean previous test applications for this user
  await prisma.companyApplication.deleteMany({
    where: { studentUserId: testStudent.id }
  })

  // Create initial SUBMITTED application
  const app = await prisma.companyApplication.create({
    data: {
      studentUserId: testStudent.id,
      cooperativeCycleId: cycle.id,
      companyId: company.id,
      status: 'SUBMITTED',
      applicationPosition: 'Software QA Intern',
      recipientName: 'HR Director',
      letterAddress: '99 Muang Buriram 31000'
    }
  })
  assert.equal(app.status, 'SUBMITTED')

  // Attempt transition SUBMITTED -> ACCEPTED
  const updatedApp = await prisma.companyApplication.update({
    where: { id: app.id },
    data: { status: 'ACCEPTED', outcomeAt: new Date() }
  })
  assert.equal(updatedApp.status, 'ACCEPTED')

  // Atomic Confirm: update to CONFIRMED, create CooperativeRequest with snapshot, create notifications
  const request = await prisma.$transaction(async (tx) => {
    await tx.companyApplication.update({
      where: { id: app.id },
      data: { status: 'CONFIRMED' }
    })

    const req = await tx.cooperativeRequest.create({
      data: {
        companyApplicationId: app.id,
        status: 'SUBMITTED',
        companyName: company.name,
        position: app.applicationPosition,
        address: `${company.addressNo} ${company.subdistrict} ${company.district}`,
        province: company.province,
        recipientName: app.recipientName,
        letterAddress: app.letterAddress
      }
    })

    await tx.notification.create({
      data: {
        userId: testStudent.id,
        title: 'ยืนยันคำร้องสำเร็จ',
        message: 'ส่งคำร้องไปยังเจ้าหน้าที่แล้ว',
        link: `/student/requests/${req.id}`
      }
    })

    return req
  })

  assert.equal(request.companyName, company.name)
  assert.equal(request.position, 'Software QA Intern')
  assert.equal(request.status, 'SUBMITTED')

  // Check student notification was created
  const notif = await prisma.notification.findFirst({
    where: { userId: testStudent.id },
    orderBy: { createdAt: 'desc' }
  })
  assert.ok(notif)
  assert.equal(notif.userId, testStudent.id)

  // Test document creation & versioning
  const doc = await prisma.requestDocument.create({
    data: {
      cooperativeRequestId: request.id,
      fileName: 'test-document.pdf',
      filePath: '/tmp/test.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'UPLOADED',
      version: 1
    }
  })
  assert.equal(doc.version, 1)

  // Clean up test data
  await prisma.companyApplication.deleteMany({
    where: { studentUserId: testStudent.id }
  })

  console.log('✔ All Student Workflow checks passed successfully!')
}

runSelfCheck()
  .catch((err) => {
    console.error('Self-check failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
