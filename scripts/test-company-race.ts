import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma, isUniqueConstraintError } from '../server/utils/db'
import {
  normalizeIdentityText,
  computeCompanyIdentityKey,
  hashIdentityKeyToLockKeys,
  readCompanyInput
} from '../server/utils/company'
import { ACTIVE_APPLICATION_STATUSES } from '../server/utils/student-workflow'

// Polyfill Nitro / Nuxt auto-imports on globalThis for standalone tsx test execution
;(globalThis as any).defineEventHandler = (fn: any) => fn
;(globalThis as any).createError = (opts: { statusCode?: number; message?: string }) => {
  const err = new Error(opts.message || '')
  Object.assign(err, opts)
  return err
}
;(globalThis as any).getRouterParam = (event: any, key: string) => event.context?.params?.[key]
;(globalThis as any).getQuery = (event: any) => event.context?.query || {}
;(globalThis as any).readBody = async (event: any) => event._body
;(globalThis as any).prisma = prisma
;(globalThis as any).isUniqueConstraintError = isUniqueConstraintError
;(globalThis as any).ACTIVE_APPLICATION_STATUSES = ACTIVE_APPLICATION_STATUSES
;(globalThis as any).readCompanyInput = readCompanyInput
;(globalThis as any).hashIdentityKeyToLockKeys = hashIdentityKeyToLockKeys
;(globalThis as any).requireRole = async (event: any, role: string) => {
  if (event.context?.user) {
    if (event.context.user.role !== role) {
      throw (globalThis as any).createError({ statusCode: 403, message: 'ไม่มีสิทธิ์ใช้งาน' })
    }
    return event.context.user
  }
  throw (globalThis as any).createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
}

const TEST_YEAR = 3999
const TEST_TERM = 1
const TEST_COHORT = 3996

const PREFIX = '__test_company_race_'
const STUDENT_1_LOGIN = `${PREFIX}student_1__`
const STUDENT_2_LOGIN = `${PREFIX}student_2__`
const STUDENT_3_LOGIN = `${PREFIX}student_3__`
const STUDENT_4_LOGIN = `${PREFIX}student_4__`

const COMPANY_NAME = `${PREFIX}Tech_Corp__`

function createStudentEvent(studentUser: any, body: any) {
  return {
    context: {
      user: studentUser,
      params: {},
      query: {}
    },
    _body: body
  } as any
}

async function runTests() {
  console.log('--- 1. Testing Canonical Key Normalization & Deliberate Branch Differentiation ---')

  // Normalization: whitespace, case-insensitivity, and Thai Unicode decomposition (NFKC)
  const norm1 = normalizeIdentityText('  บริษัท  ทดสอบ  จำกัด  ')
  const norm2 = normalizeIdentityText('บริษัท ทดสอบ จํากัด')
  assert.equal(norm1, norm2, 'NFKC normalization must unify Thai Sara Am and collapse multiple whitespace')

  const keyA1 = computeCompanyIdentityKey({
    name: ' ACME Inc. ',
    addressNo: ' 100/1 ',
    moo: null,
    soi: 'ซอย 1',
    street: ' ถนน สุขุมวิท ',
    subdistrict: 'คลองเตย',
    district: 'คลองเตย',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110'
  })

  const keyA2 = computeCompanyIdentityKey({
    name: 'acme inc.',
    addressNo: '100/1',
    moo: '',
    soi: ' ซอย 1 ',
    street: 'ถนน สุขุมวิท',
    subdistrict: ' คลองเตย ',
    district: 'คลองเตย',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110'
  })

  assert.equal(keyA1, keyA2, 'Canonical keys must match despite formatting, casing, or whitespace differences')

  // Different branch (different address): must NOT merge
  const keyBranchB = computeCompanyIdentityKey({
    name: 'acme inc.',
    addressNo: '200/2',
    moo: '',
    soi: 'ซอย 2',
    street: 'ถนน สีลม',
    subdistrict: 'สีลม',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    postalCode: '10500'
  })

  assert.notEqual(keyA1, keyBranchB, 'Different branches at different addresses must produce distinct canonical keys')

  // Two 32-bit integers from SHA-256 for pg_advisory_xact_lock
  const [k1, k2] = hashIdentityKeyToLockKeys(keyA1)
  assert.equal(typeof k1, 'number')
  assert.equal(typeof k2, 'number')
  assert.ok(Number.isInteger(k1) && Number.isInteger(k2))
  assert.deepEqual(hashIdentityKeyToLockKeys(keyA1), [k1, k2], 'Hash lock keys must be deterministic')

  console.log('✔ Normalization and key computation unit tests passed!')

  console.log('--- 2. Setting Up Isolated Test Environment ---')

  // Clean previous test artifacts if interrupted
  await prisma.cooperativeCycle.deleteMany({
    where: { cohortYear: TEST_COHORT, academicYear: TEST_YEAR }
  })
  await prisma.user.deleteMany({
    where: {
      loginId: {
        in: [STUDENT_1_LOGIN, STUDENT_2_LOGIN, STUDENT_3_LOGIN, STUDENT_4_LOGIN]
      }
    }
  })

  // Create isolated test cycle
  const cycle = await prisma.cooperativeCycle.create({
    data: {
      term: TEST_TERM,
      academicYear: TEST_YEAR,
      cohortYear: TEST_COHORT,
      applicationStartDate: new Date('3999-01-01'),
      applicationEndDate: new Date('3999-01-30'),
      internshipStartDate: new Date('3999-02-01'),
      internshipEndDate: new Date('3999-05-31'),
      status: 'OPEN_FOR_APPLICATION'
    }
  })

  // Create 4 isolated test students
  const student1 = await prisma.user.create({
    data: {
      loginId: STUDENT_1_LOGIN,
      passwordHash: 'dummy-hash',
      role: 'STUDENT',
      prefix: 'นาย',
      firstName: 'แข่ง',
      lastName: 'หนึ่ง',
      cohortYear: TEST_COHORT,
      classGroup: 1,
      isActive: true
    }
  })

  const student2 = await prisma.user.create({
    data: {
      loginId: STUDENT_2_LOGIN,
      passwordHash: 'dummy-hash',
      role: 'STUDENT',
      prefix: 'นางสาว',
      firstName: 'แข่ง',
      lastName: 'สอง',
      cohortYear: TEST_COHORT,
      classGroup: 1,
      isActive: true
    }
  })

  const student3 = await prisma.user.create({
    data: {
      loginId: STUDENT_3_LOGIN,
      passwordHash: 'dummy-hash',
      role: 'STUDENT',
      prefix: 'นาย',
      firstName: 'แข่ง',
      lastName: 'สาม',
      cohortYear: TEST_COHORT,
      classGroup: 1,
      isActive: true
    }
  })

  const student4 = await prisma.user.create({
    data: {
      loginId: STUDENT_4_LOGIN,
      passwordHash: 'dummy-hash',
      role: 'STUDENT',
      prefix: 'นาย',
      firstName: 'แข่ง',
      lastName: 'สี่',
      cohortYear: TEST_COHORT,
      classGroup: 1,
      isActive: true
    }
  })

  const createdCompanyIds: number[] = []

  try {
    const studentAppPostHandler = (await import('../server/api/student/applications/index.post')).default
    const companyPostHandler = (await import('../server/api/companies/index.post')).default

    console.log('--- 3. Testing Real Concurrent Submissions for Identical New Company ---')

    const newCompanyData1 = {
      name: COMPANY_NAME,
      contactPerson: 'HR Original',
      phone: '0811111111',
      email: 'hr-original@test.com',
      addressNo: '888/88',
      moo: '1',
      soi: 'สุขสบาย 1',
      street: 'เจริญกรุง',
      subdistrict: 'ยานนาวา',
      district: 'สาทร',
      province: 'กรุงเทพมหานคร',
      postalCode: '10120'
    }

    // Student 2 submits the exact same company address, but with different contactPerson/email
    const newCompanyData2 = {
      ...newCompanyData1,
      contactPerson: 'HR Subsequent (Should Not Overwrite)',
      email: 'hr-subsequent@test.com'
    }

    const event1 = createStudentEvent(student1, {
      applicationPosition: 'Frontend Intern',
      applicationMethod: 'EMAIL',
      newCompany: newCompanyData1
    })

    const event2 = createStudentEvent(student2, {
      applicationPosition: 'Backend Intern',
      applicationMethod: 'WEBSITE',
      newCompany: newCompanyData2
    })

    // Execute concurrently using Promise.all to simulate true race condition
    const [app1, app2] = await Promise.all([
      studentAppPostHandler(event1),
      studentAppPostHandler(event2)
    ])

    assert.ok(app1 && app1.id, 'Application 1 must succeed')
    assert.ok(app2 && app2.id, 'Application 2 must succeed')
    assert.notEqual(app1.id, app2.id, 'Student 1 and Student 2 must each have their own distinct CompanyApplication')
    assert.equal(
      app1.companyId,
      app2.companyId,
      'Both applications must point to the exact same companyId'
    )
    createdCompanyIds.push(app1.companyId)

    // Verify company row count in DB
    const expectedKey = computeCompanyIdentityKey(newCompanyData1)
    const companyCount = await prisma.company.count({
      where: { companyIdentityKey: expectedKey }
    })
    assert.equal(companyCount, 1, 'Exactly ONE Company record must exist in the database for this canonical identity')

    // Verify master data was NOT overwritten
    const storedCompany = await prisma.company.findUnique({
      where: { id: app1.companyId }
    })
    assert.ok(storedCompany)
    assert.equal(
      storedCompany.contactPerson,
      'HR Original',
      'Master company data must be preserved and not overwritten by subsequent submissions'
    )

    console.log('✔ Concurrent submissions for identical new company resolved atomically to single Company row!')

    console.log('--- 4. Testing Same Company Name but Different Address (Branch Isolation) ---')

    const branchCompanyData = {
      name: COMPANY_NAME, // Same name!
      contactPerson: 'HR Branch Chiang Mai',
      phone: '053111111',
      email: 'cm@test.com',
      addressNo: '99/9',
      moo: null,
      soi: 'นิมมาน 5',
      street: 'นิมมานเหมินท์',
      subdistrict: 'สุเทพ',
      district: 'เมืองเชียงใหม่',
      province: 'เชียงใหม่',
      postalCode: '50200'
    }

    const event3 = createStudentEvent(student3, {
      applicationPosition: 'Mobile Intern',
      applicationMethod: 'IN_PERSON',
      newCompany: branchCompanyData
    })

    const app3 = await studentAppPostHandler(event3)
    assert.ok(app3 && app3.id)
    assert.notEqual(
      app3.companyId,
      app1.companyId,
      'Different branches with different addresses must NOT merge into the same companyId'
    )
    createdCompanyIds.push(app3.companyId)

    const totalCompaniesForName = await prisma.company.count({
      where: { name: COMPANY_NAME }
    })
    assert.equal(
      totalCompaniesForName,
      2,
      'Must have 2 distinct Company records for different branches of the same company name'
    )

    console.log('✔ Different branches with same company name remained separate entities!')

    console.log('--- 5. Testing Selection of Existing Company (body.companyId) ---')

    const event4 = createStudentEvent(student4, {
      applicationPosition: 'DevOps Intern',
      applicationMethod: 'EMAIL',
      companyId: app1.companyId
    })

    const app4 = await studentAppPostHandler(event4)
    assert.ok(app4 && app4.id)
    assert.equal(
      app4.companyId,
      app1.companyId,
      'Application choosing existing companyId must link directly to that companyId'
    )

    const totalCompaniesAfterSelect = await prisma.company.count({
      where: { name: COMPANY_NAME }
    })
    assert.equal(
      totalCompaniesAfterSelect,
      2,
      'No new Company record should be created when selecting existing companyId'
    )

    console.log('✔ Selection of existing companyId works correctly!')

    console.log('--- 6. Testing Subsequent Submission of Pre-Existing Company via newCompany ---')

    // Clean student 4 application to test submitting identical newCompany when company already exists
    await prisma.companyApplication.delete({ where: { id: app4.id } })

    const event4ResubmitNewCompany = createStudentEvent(student4, {
      applicationPosition: 'Fullstack Intern',
      applicationMethod: 'WEBSITE',
      newCompany: {
        ...newCompanyData1,
        contactPerson: 'Another Person Trying to Overwrite'
      }
    })

    const app4Resubmitted = await studentAppPostHandler(event4ResubmitNewCompany)
    assert.ok(app4Resubmitted && app4Resubmitted.id)
    assert.equal(
      app4Resubmitted.companyId,
      app1.companyId,
      'Subsequent newCompany submission of already existing company connects to existing companyId'
    )

    const storedCompanyAfterResubmit = await prisma.company.findUnique({
      where: { id: app1.companyId }
    })
    assert.equal(
      storedCompanyAfterResubmit?.contactPerson,
      'HR Original',
      'Master data must still remain unchanged after subsequent newCompany submission'
    )

    console.log('✔ Subsequent submission of existing company via newCompany links without overwrite!')

    console.log('--- 7. Testing Duplicate Company Creation via Staff companies.post ---')

    const staffDuplicateEvent = {
      _body: newCompanyData1
    } as any

    await assert.rejects(
      async () => companyPostHandler(staffDuplicateEvent),
      (err: any) => {
        assert.equal(err.statusCode, 409)
        assert.match(err.message, /มีข้อมูลสถานประกอบการนี้ในระบบแล้ว/)
        return true
      },
      'Staff creating duplicate company must be rejected with 409 Conflict'
    )

    console.log('✔ Staff duplicate company creation correctly rejected with 409 Conflict!')

    console.log('--- 8. Testing Legacy Composed vs Decomposed Thai Text (Unicode NFKC Consistency) ---')

    // Composed Sara Am (\u0e33) vs Decomposed Nikhahit (\u0e4d) + Sara Aa (\u0e32)
    const composedName = 'บริษัท จำลอง จำกัด'
    const decomposedName = 'บริษัท จ\u0e4d\u0e32ลอง จ\u0e4d\u0e32กัด'

    // Verify Node normalizer equivalence
    assert.equal(
      normalizeIdentityText(composedName),
      normalizeIdentityText(decomposedName),
      'Node normalizer must yield identical output for composed and decomposed Thai text'
    )

    // Verify PostgreSQL normalize(..., NFKC) equivalence with Node normalizer
    const pgNormRes = await prisma.$queryRaw<{ norm_composed: string; norm_decomposed: string }[]>`
      SELECT
        normalize(${composedName}, NFKC) AS norm_composed,
        normalize(${decomposedName}, NFKC) AS norm_decomposed
    `
    assert.equal(
      pgNormRes[0].norm_composed,
      normalizeIdentityText(composedName),
      'PostgreSQL normalize(NFKC) on composed text must match Node normalizer'
    )
    assert.equal(
      pgNormRes[0].norm_decomposed,
      normalizeIdentityText(decomposedName),
      'PostgreSQL normalize(NFKC) on decomposed text must match Node normalizer'
    )
    assert.equal(
      pgNormRes[0].norm_composed,
      pgNormRes[0].norm_decomposed,
      'PostgreSQL normalize(NFKC) must unify composed and decomposed forms'
    )

    // Simulate a row backfilled by the pre-NFKC migration, then repair it with
    // the same PostgreSQL expression used by the forward-only repair migration.
    const legacyInput = readCompanyInput({
      name: composedName,
      contactPerson: 'คุณสมหมาย',
      addressNo: '77/7',
      subdistrict: 'ตำบลสบตุ๋ย',
      district: 'อำเภอเมือง',
      province: 'ลำปาง',
      postalCode: '52100'
    })
    const preNfkcKey = [
      composedName,
      legacyInput.addressNo,
      legacyInput.moo || '',
      legacyInput.soi || '',
      legacyInput.street || '',
      legacyInput.subdistrict,
      legacyInput.district,
      legacyInput.province,
      legacyInput.postalCode
    ].map(value => String(value).trim().toLowerCase().replace(/\s+/g, ' ')).join('|')
    assert.notEqual(preNfkcKey, legacyInput.companyIdentityKey, 'Fixture must begin with a pre-NFKC legacy key')

    const legacyComposedCompany = await prisma.company.create({
      data: { ...legacyInput, companyIdentityKey: preNfkcKey }
    })
    createdCompanyIds.push(legacyComposedCompany.id)

    const repairLegacyKeySql = [
      'UPDATE "companies" SET "company_identity_key" =',
      "regexp_replace(trim(lower(normalize(\"name\", NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(\"address_no\", NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(COALESCE(\"moo\", ''), NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(COALESCE(\"soi\", ''), NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(COALESCE(\"street\", ''), NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(\"subdistrict\", NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(\"district\", NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(\"province\", NFKC))), '\\s+', ' ', 'g') || '|' ||",
      "regexp_replace(trim(lower(normalize(\"postal_code\", NFKC))), '\\s+', ' ', 'g')",
      'WHERE "id" = ' + legacyComposedCompany.id
    ].join(' ')
    await prisma.$executeRawUnsafe(repairLegacyKeySql)
    const repairedCompany = await prisma.company.findUniqueOrThrow({ where: { id: legacyComposedCompany.id } })
    assert.equal(repairedCompany.companyIdentityKey, legacyInput.companyIdentityKey, 'Forward repair must produce the server canonical key')

    // Clear prior application for student4 so they can apply again
    await prisma.companyApplication.deleteMany({
      where: { studentUserId: student4.id }
    })

    // Student submits newCompany with DECOMPOSED Thai text
    // (e.g. entered from a system or IME that outputs decomposed Nikhahit + Sara Aa)
    const studentDecomposedEvent = createStudentEvent(student4, {
      applicationPosition: 'Data Intern',
      applicationMethod: 'EMAIL',
      newCompany: {
        name: decomposedName, // DECOMPOSED
        contactPerson: 'คนละคน',
        addressNo: '77/7',
        subdistrict: 'ต\u0e4d\u0e32บลสบตุ๋ย', // DECOMPOSED
        district: 'อ\u0e4d\u0e32เภอเมือง',    // DECOMPOSED
        province: 'ล\u0e4d\u0e32ปาง',        // DECOMPOSED
        postalCode: '52100'
      }
    })

    const appDecomposed = await studentAppPostHandler(studentDecomposedEvent)
    assert.ok(appDecomposed && appDecomposed.id)
    assert.equal(
      appDecomposed.companyId,
      legacyComposedCompany.id,
      'Submission with decomposed Thai text must find and connect to existing company stored with composed text'
    )

    const totalLegacyCompanies = await prisma.company.count({
      where: { companyIdentityKey: repairedCompany.companyIdentityKey }
    })
    assert.equal(
      totalLegacyCompanies,
      1,
      'Must NOT duplicate Company when student submits alternate Thai Unicode form'
    )

    console.log('✔ Legacy composed/decomposed Thai Unicode matches seamlessly across SQL and server normalizer!')

  } finally {
    console.log('--- Cleaning Up Isolated Test Records ---')

    // 1. Delete test company applications
    await prisma.companyApplication.deleteMany({
      where: {
        studentUserId: {
          in: [student1.id, student2.id, student3.id, student4.id]
        }
      }
    })

    // 2. Delete test companies
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } }
      })
    }

    // 3. Delete test students
    await prisma.user.deleteMany({
      where: {
        id: { in: [student1.id, student2.id, student3.id, student4.id] }
      }
    })

    // 4. Delete test cycle
    await prisma.cooperativeCycle.deleteMany({
      where: { id: cycle.id }
    })

    console.log('✔ All isolated test data cleanly removed (0 real user data touched)')
  }

  console.log('\n======================================================')
  console.log('All company race condition regression tests PASSED!')
  console.log('======================================================\n')
}

runTests()
  .catch((err) => {
    console.error('Test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
