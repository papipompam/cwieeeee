import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../server/utils/db'
import { readCompanyInput } from '../server/utils/company'
import { ACTIVE_APPLICATION_STATUSES, ALLOWED_APPLICATION_TRANSITIONS } from '../server/utils/student-workflow'

const TEST_STUDENT_LOGIN = '__student_test_isolated__'
const TEST_COMPANY_NAME = '__student_test_company_isolated__'
const TEST_CYCLE_YEAR = 3998
const TEST_CYCLE_TERM = 1
const TEST_CYCLE_COHORT = 3995

async function runSelfCheck() {
  console.log('--- Running Student Workflow Self-Check ---')

  // 1. Check transition matrices
  assert.deepEqual(
    ALLOWED_APPLICATION_TRANSITIONS.SUBMITTED,
    ['AWAITING_RESPONSE', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
  )
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.ACCEPTED, [])
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.REJECTED, [])
  assert.deepEqual(ALLOWED_APPLICATION_TRANSITIONS.CONFIRMED, [])

  assert.ok(ACTIVE_APPLICATION_STATUSES.includes('SUBMITTED'))
  assert.ok(ACTIVE_APPLICATION_STATUSES.includes('ACCEPTED'))
  assert.ok(!ACTIVE_APPLICATION_STATUSES.includes('CONFIRMED'))
  assert.ok(!ACTIVE_APPLICATION_STATUSES.includes('REJECTED'))

  // 2. Setup isolated test cycle, test student, and test company
  let cycle = await prisma.cooperativeCycle.findFirst({
    where: { status: 'OPEN_FOR_APPLICATION' }
  })
  let testCycleCreated = false
  if (!cycle) {
    cycle = await prisma.cooperativeCycle.create({
      data: {
        term: TEST_CYCLE_TERM,
        academicYear: TEST_CYCLE_YEAR,
        cohortYear: TEST_CYCLE_COHORT,
        applicationStartDate: new Date('3998-01-01'),
        applicationEndDate: new Date('3998-01-30'),
        internshipStartDate: new Date('3998-02-01'),
        internshipEndDate: new Date('3998-05-31'),
        status: 'OPEN_FOR_APPLICATION'
      }
    })
    testCycleCreated = true
  }

  // Find or create isolated test student
  let testStudent = await prisma.user.findUnique({
    where: { loginId: TEST_STUDENT_LOGIN }
  })
  if (!testStudent) {
    testStudent = await prisma.user.create({
      data: {
        loginId: TEST_STUDENT_LOGIN,
        passwordHash: 'dummy-hash',
        role: 'STUDENT',
        prefix: 'นาย',
        firstName: 'ทดสอบ',
        lastName: 'แยกต่างหาก',
        cohortYear: cycle.cohortYear || 2567,
        classGroup: 1,
        isActive: true
      }
    })
  }

  // Find or create isolated test company using readCompanyInput
  let company = await prisma.company.findFirst({
    where: { name: TEST_COMPANY_NAME }
  })
  if (!company) {
    company = await prisma.company.create({
      data: readCompanyInput({
        name: TEST_COMPANY_NAME,
        contactPerson: 'Manager Test',
        addressNo: '99',
        subdistrict: 'In-city',
        district: 'Muang',
        province: 'Buriram',
        postalCode: '31000'
      })
    })
  }

  try {
    // Clean any prior leftover test applications for this test student only
    await prisma.companyApplication.deleteMany({
      where: { studentUserId: testStudent.id }
    })
    await prisma.notification.deleteMany({
      where: { userId: testStudent.id }
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

    console.log('✔ All Student Workflow checks passed successfully (isolated from real users)!')
  } finally {
    // Clean up isolated test data
    if (testStudent) {
      await prisma.notification.deleteMany({
        where: { userId: testStudent.id }
      })
      await prisma.companyApplication.deleteMany({
        where: { studentUserId: testStudent.id }
      })
      await prisma.user.delete({
        where: { id: testStudent.id }
      })
    }

    if (company) {
      await prisma.company.delete({
        where: { id: company.id }
      })
    }

    if (testCycleCreated && cycle) {
      await prisma.cooperativeCycle.delete({
        where: { id: cycle.id }
      })
    }
  }
}

runSelfCheck()
  .catch((err) => {
    console.error('Self-check failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
