import 'dotenv/config'
import assert from 'node:assert/strict'

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

import { isUniqueConstraintError, prisma } from '../server/utils/db'
;(globalThis as any).prisma = prisma
;(globalThis as any).isUniqueConstraintError = isUniqueConstraintError

import * as cycleUtils from '../server/utils/cycle'
import * as supervisionUtils from '../server/utils/supervision'

Object.assign(globalThis, cycleUtils)
Object.assign(globalThis, supervisionUtils)

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

const PREFIX = '__test_sup_'
const STAFF_LOGIN = `${PREFIX}staff`
const TEACHER1_LOGIN = `${PREFIX}teacher1`
const TEACHER2_LOGIN = `${PREFIX}teacher2`
const STUDENT1_LOGIN = `${PREFIX}student1`
const STUDENT2_LOGIN = `${PREFIX}student2`
const COMPANY1_NAME = `${PREFIX}company1`
const COMPANY2_NAME = `${PREFIX}company2`

function createMockEvent(opts: {
  params?: Record<string, string>
  query?: Record<string, string>
  body?: any
  staffUser: any
}) {
  return {
    context: {
      params: opts.params || {},
      query: opts.query || {},
      user: opts.staffUser
    },
    _body: opts.body
  }
}

async function run() {
  console.log('🚀 Starting Staff Supervision Planning Workflow Integration Test...')

  // Dynamic import of handlers after globals are initialized
  const listRoundsHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/index.get')).default
  const createRoundHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/index.post')).default
  const unassignedCompaniesHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/unassigned-companies.get')).default
  const listGroupsHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/groups/index.get')).default
  const createGroupHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/groups/index.post')).default
  const updateGroupHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/groups/[groupId]/index.patch')).default
  const addCompanyToGroupHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/groups/[groupId]/companies/index.post')).default
  const addTeacherToGroupHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/groups/[groupId]/teachers/index.post')).default
  const listAppointmentsHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/index.get')).default
  const createAppointmentHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/index.post')).default
  const publishAppointmentHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/[appointmentId]/publish.post')).default
  const publishBatchHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/publish-batch.post')).default
  const rescheduleAppointmentHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/[appointmentId]/reschedule.post')).default
  const cancelAppointmentHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/appointments/[appointmentId]/cancel.post')).default
  const createTravelPlanHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/travel-plans/index.post')).default
  const listTravelPlansHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/rounds/[roundId]/travel-plans/index.get')).default
  const supervisionSummaryHandler = (await import('../server/api/staff/cooperative-cycles/[cycleId]/supervision/summary.get')).default
  const listTeacherAppointmentsHandler = (await import('../server/api/teacher/supervision-appointments/index.get')).default
  const submitStudentEvaluationHandler = (await import('../server/api/teacher/student-evaluations/[appointmentId]/[studentId].put')).default
  const submitCompanyEvaluationHandler = (await import('../server/api/teacher/company-evaluations/[appointmentId].put')).default

  let staffUser: any
  let teacher1User: any
  let teacher2User: any
  let student1User: any
  let student2User: any
  let cycle1: any
  let cycle2: any
  let closedCycle: any
  let company1: any
  let company2: any

  try {
    // 1. Setup isolated test data
    console.log('📦 Creating isolated test fixtures...')
    staffUser = await prisma.user.create({
      data: {
        loginId: STAFF_LOGIN,
        passwordHash: 'dummy',
        role: 'STAFF',
        prefix: 'จนท.',
        firstName: 'Staff',
        lastName: 'Tester'
      }
    })

    teacher1User = await prisma.user.create({
      data: {
        loginId: TEACHER1_LOGIN,
        passwordHash: 'dummy',
        role: 'TEACHER',
        prefix: 'อ.',
        firstName: 'สมชาย',
        lastName: 'สอนดี'
      }
    })

    teacher2User = await prisma.user.create({
      data: {
        loginId: TEACHER2_LOGIN,
        passwordHash: 'dummy',
        role: 'TEACHER',
        prefix: 'ดร.',
        firstName: 'สมหญิง',
        lastName: 'วิชาการ'
      }
    })

    student1User = await prisma.user.create({
      data: {
        loginId: STUDENT1_LOGIN,
        passwordHash: 'dummy',
        role: 'STUDENT',
        prefix: 'นาย',
        firstName: 'นักศึกษา1',
        lastName: 'ทดสอบ',
        cohortYear: 2567
      }
    })

    student2User = await prisma.user.create({
      data: {
        loginId: STUDENT2_LOGIN,
        passwordHash: 'dummy',
        role: 'STUDENT',
        prefix: 'นาย',
        firstName: 'นักศึกษา2',
        lastName: 'ทดสอบ',
        cohortYear: 2567
      }
    })

    cycle1 = await prisma.cooperativeCycle.create({
      data: {
        term: 1,
        academicYear: 2598,
        cohortYear: 2567,
        applicationStartDate: new Date('2055-01-01'),
        applicationEndDate: new Date('2055-02-01'),
        internshipStartDate: new Date('2055-03-01'),
        internshipEndDate: new Date('2055-07-01'),
        status: 'IN_PROGRESS'
      }
    })

    cycle2 = await prisma.cooperativeCycle.create({
      data: {
        term: 2,
        academicYear: 2598,
        cohortYear: 2567,
        applicationStartDate: new Date('2055-08-01'),
        applicationEndDate: new Date('2055-09-01'),
        internshipStartDate: new Date('2055-10-01'),
        internshipEndDate: new Date('2056-02-01'),
        status: 'IN_PROGRESS'
      }
    })

    closedCycle = await prisma.cooperativeCycle.create({
      data: {
        term: 3,
        academicYear: 2598,
        cohortYear: 2567,
        applicationStartDate: new Date('2056-03-01'),
        applicationEndDate: new Date('2056-04-01'),
        internshipStartDate: new Date('2056-05-01'),
        internshipEndDate: new Date('2056-08-01'),
        status: 'CLOSED'
      }
    })

    company1 = await prisma.company.create({
      data: {
        name: COMPANY1_NAME,
        contactPerson: 'HR 1',
        addressNo: '123',
        subdistrict: 'คลองเตย',
        district: 'คลองเตย',
        province: 'กรุงเทพมหานคร',
        postalCode: '10110',
        companyIdentityKey: `${COMPANY1_NAME}|10110`
      }
    })

    company2 = await prisma.company.create({
      data: {
        name: COMPANY2_NAME,
        contactPerson: 'HR 2',
        addressNo: '456',
        subdistrict: 'ดอนหัวฬ่อ',
        district: 'เมือง',
        province: 'ชลบุรี',
        postalCode: '20000',
        companyIdentityKey: `${COMPANY2_NAME}|20000`
      }
    })

    // Create CompanyApplication and Confirmed CooperativeRequests in cycle1
    const app1 = await prisma.companyApplication.create({
      data: {
        cooperativeCycleId: cycle1.id,
        companyId: company1.id,
        studentUserId: student1User.id,
        status: 'CONFIRMED'
      }
    })
    await prisma.cooperativeRequest.create({
      data: {
        companyApplicationId: app1.id,
        companyName: company1.name,
        recipientName: 'ผู้จัดการฝ่ายบุคคล',
        status: 'PLACEMENT_CONFIRMED',
        confirmedAt: new Date()
      }
    })

    const app2 = await prisma.companyApplication.create({
      data: {
        cooperativeCycleId: cycle1.id,
        companyId: company2.id,
        studentUserId: student2User.id,
        status: 'CONFIRMED'
      }
    })
    await prisma.cooperativeRequest.create({
      data: {
        companyApplicationId: app2.id,
        companyName: company2.name,
        recipientName: 'ผู้จัดการฝ่ายบุคคล',
        status: 'PLACEMENT_CONFIRMED',
        confirmedAt: new Date()
      }
    })

    console.log('✅ Fixtures created successfully.')

    // TEST 1: Supervision Round creation & No Auto-seed on GET
    console.log('\n--- TEST 1: Supervision Round creation & No Auto-seed on GET ---')
    const listRoundsEvent = createMockEvent({
      params: { cycleId: String(cycle1.id) },
      staffUser
    })
    const roundsRes0: any = await listRoundsHandler(listRoundsEvent as any)
    assert.equal(roundsRes0.rounds.length, 0, 'GET rounds should NOT auto-create round 1')

    // Closed cycle GET should also NOT auto-create round 1
    const closedCycleGetEvent = createMockEvent({
      params: { cycleId: String(closedCycle.id) },
      staffUser
    })
    const closedRoundsRes: any = await listRoundsHandler(closedCycleGetEvent as any)
    assert.equal(closedRoundsRes.rounds.length, 0, 'GET rounds on closed cycle must not auto-seed round 1')

    // Create Round 1 explicitly
    const createRound1Event = createMockEvent({
      params: { cycleId: String(cycle1.id) },
      body: { roundNo: 1, title: 'การนิเทศรอบที่ 1' },
      staffUser
    })
    const round1Res: any = await createRoundHandler(createRound1Event as any)
    const round1Id = round1Res.round.id
    assert.equal(round1Res.round.roundNo, 1)

    // Create Round 2 explicitly
    const createRound2Event = createMockEvent({
      params: { cycleId: String(cycle1.id) },
      body: { roundNo: 2, title: 'การนิเทศรอบที่ 2' },
      staffUser
    })
    const round2Res: any = await createRoundHandler(createRound2Event as any)
    const round2Id = round2Res.round.id
    assert.equal(round2Res.round.roundNo, 2)

    // TEST 2: Closed Cycle Mutation Guard
    console.log('\n--- TEST 2: Closed Cycle Mutation Guard ---')
    const closedCycleEvent = createMockEvent({
      params: { cycleId: String(closedCycle.id) },
      body: { roundNo: 1, title: 'รอบใหม่' },
      staffUser
    })
    await assert.rejects(
      async () => await createRoundHandler(closedCycleEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /ปิดรอบแล้ว/)
        return true
      },
      'Should block creating round in closed cycle'
    )

    // TEST 3: Cycle Isolation
    console.log('\n--- TEST 3: Cycle Isolation ---')
    const crossCycleEvent = createMockEvent({
      params: { cycleId: String(cycle2.id), roundId: String(round1Id) },
      staffUser
    })
    await assert.rejects(
      async () => await unassignedCompaniesHandler(crossCycleEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 404)
        return true
      },
      'Should return 404 when accessing round belonging to another cycle'
    )

    // TEST 4: Unassigned Companies in Round 1
    console.log('\n--- TEST 4: Unassigned Companies ---')
    const unassignedEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      staffUser
    })
    const unassignedRes: any = await unassignedCompaniesHandler(unassignedEvent as any)
    assert.equal(unassignedRes.companies.length, 2, 'Should list both confirmed companies as unassigned in round 1')

    // TEST 5: Create a complete group in one request
    console.log('\n--- TEST 5: Create Group with Teachers & Companies ---')
    const createGroupAEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        name: 'กลุ่ม A (กรุงเทพ)',
        teacherUserIds: [teacher1User.id],
        companyIds: [company1.id]
      },
      staffUser
    })
    const groupARes: any = await createGroupHandler(createGroupAEvent as any)
    const groupAId = groupARes.group.id

    // The planning flow creates group members, published appointments, and travel budget together.
    const createPlannedGroupEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round2Id) },
      body: {
        name: 'กลุ่มแผนทดสอบ',
        teacherUserIds: [teacher1User.id, teacher2User.id],
        companyIds: [company1.id, company2.id],
        companyPlans: [
          { companyId: company1.id, scheduledDate: '2055-04-12', period: 'MORNING', timeNote: 'นัดหมายจากการจัดกลุ่ม', distanceKmFromPrevious: 18 },
          { companyId: company2.id, scheduledDate: '2055-04-12', period: 'MORNING', timeNote: 'นัดหมายจากการจัดกลุ่ม', distanceKmFromPrevious: 12 }
        ],
        budget: {
          startLocation: 'มหาวิทยาลัย', fuelRate: 4, perDiemRate: 240, perDiemDays: 1,
          lodgingRate: 1500, nights: 1, rooms: 2
        }
      },
      staffUser
    })
    const plannedGroupRes: any = await createGroupHandler(createPlannedGroupEvent as any)
    const plannedAppointments = await prisma.supervisionAppointment.findMany({
      where: { supervisionGroupId: plannedGroupRes.group.id },
      include: { teachers: true, students: true, travelStops: { include: { travelPlan: { include: { travellers: true } } } } }
    })
    assert.equal(plannedAppointments.length, 2, 'Complete group creation should create an appointment for every company')
    assert(plannedAppointments.every(appointment => appointment.status === 'PUBLISHED'), 'Group scheduling must publish appointments without a separate draft step')
    assert.deepEqual(new Set(plannedAppointments.map(appointment => appointment.teachers[0]?.teacherUserId)), new Set([teacher1User.id, teacher2User.id]), 'Companies in the same slot should receive different selected teachers')
    assert.equal(plannedAppointments[0]!.students.length, 1)
    assert.equal(plannedAppointments[0]!.travelStops.length, 1, 'Appointment should be included in its travel budget')
    assert.equal(plannedAppointments[0]!.travelStops[0]!.travelPlan.travellers.length, 2)

    const updatePlannedGroupEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round2Id), groupId: String(plannedGroupRes.group.id) },
      body: {
        name: 'กลุ่มแผนทดสอบ (แก้ไข)',
        teacherUserIds: [teacher1User.id],
        companyPlans: [{ companyId: company1.id, scheduledDate: '2055-04-13', period: 'AFTERNOON', distanceKmFromPrevious: 24 }],
        budget: { startLocation: 'มหาวิทยาลัย', fuelRate: 5, perDiemRate: 300, perDiemDays: 1, lodgingRate: 1200, nights: 1, rooms: 2 }
      },
      staffUser
    })
    await updateGroupHandler(updatePlannedGroupEvent as any)
    const updatedAppointment = await prisma.supervisionAppointment.findFirst({
      where: { supervisionGroupId: plannedGroupRes.group.id },
      include: { travelStops: { include: { travelPlan: true } } }
    })
    assert.equal(updatedAppointment?.scheduledDate.toISOString().slice(0, 10), '2055-04-13', 'Published group plan should remain editable before evaluation is completed')
    assert.equal(updatedAppointment?.period, 'AFTERNOON')
    assert.equal(updatedAppointment?.travelStops[0]?.distanceKmFromPrevious, 24)
    assert.equal(updatedAppointment?.travelStops[0]?.travelPlan.fuelRate, 5)
    assert.equal(updatedAppointment?.travelStops[0]?.travelPlan.lodgingRooms, 2)

    const createGroupBEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: { name: 'กลุ่ม B (ชลบุรี)' },
      staffUser
    })
    const groupBRes: any = await createGroupHandler(createGroupBEvent as any)
    const groupBId = groupBRes.group.id

    // Verify the company selected at creation is immediately assigned.
    const unassignedAfterAssign: any = await unassignedCompaniesHandler(unassignedEvent as any)
    assert.equal(unassignedAfterAssign.companies.length, 1)
    assert.equal(unassignedAfterAssign.companies[0].companyId, company2.id)

    // Verify listGroups returns { groups: [...] } with proper DTO
    const listGroupsEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      staffUser
    })
    const groupsListRes: any = await listGroupsHandler(listGroupsEvent as any)
    assert(Array.isArray(groupsListRes.groups), 'listGroupsHandler should return { groups: [...] }')
    assert.equal(groupsListRes.groups.length, 2)
    assert.equal(groupsListRes.groups[0].companies[0].companyId, company1.id)
    assert(Array.isArray(groupsListRes.groups[0].companies[0].students), 'Company should have students array')

    // TEST 6: Duplicate Company Assignment in Same Round (Constraint)
    console.log('\n--- TEST 6: Duplicate Company in Same Round (409) ---')
    const dupCompanyEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), groupId: String(groupBId) },
      body: { companyId: company1.id },
      staffUser
    })
    await assert.rejects(
      async () => await addCompanyToGroupHandler(dupCompanyEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      },
      'Should reject assigning same company to another group in the same round'
    )

    // TEST 7: Assign Teachers & Duplicate Guard
    console.log('\n--- TEST 7: Duplicate Teacher in Same Round (409) ---')
    // Attempt to assign Teacher 1 to Group B in round 1
    const assignTeacher1ToBEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), groupId: String(groupBId) },
      body: { teacherUserId: teacher1User.id },
      staffUser
    })
    await assert.rejects(
      async () => await addTeacherToGroupHandler(assignTeacher1ToBEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      },
      'Should reject assigning same teacher to another group in the same round'
    )

    // Assign Teacher 2 to Group B
    const assignTeacher2ToBEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), groupId: String(groupBId) },
      body: { teacherUserId: teacher2User.id },
      staffUser
    })
    await addTeacherToGroupHandler(assignTeacher2ToBEvent as any)

    // TEST 8: Boundary Validation on Appointment Creation
    console.log('\n--- TEST 8: Boundary Validation on Appointment Creation ---')
    // 8.1 Foreign student (student2 is at company2, not company1) -> 400
    const foreignStudentEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupAId,
        companyId: company1.id,
        scheduledDate: '2055-04-10',
        period: 'MORNING',
        studentUserIds: [student2User.id],
        teacherUserIds: [teacher1User.id]
      },
      staffUser
    })
    await assert.rejects(
      async () => await createAppointmentHandler(foreignStudentEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /ไม่ได้ยืนยันการฝึกงานกับสถานประกอบการนี้/)
        return true
      },
      'Should reject foreign student not confirmed at company1'
    )

    // 8.2 Non-group teacher (teacher2 is in groupB, not groupA) -> 400
    const nonGroupTeacherEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupAId,
        companyId: company1.id,
        scheduledDate: '2055-04-10',
        period: 'MORNING',
        studentUserIds: [student1User.id],
        teacherUserIds: [teacher2User.id]
      },
      staffUser
    })
    await assert.rejects(
      async () => await createAppointmentHandler(nonGroupTeacherEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /ไม่ได้อยู่ในกลุ่มนิเทศนี้/)
        return true
      },
      'Should reject teacher not assigned to groupA'
    )

    // 8.3 Valid appointment creation
    const createDraftEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupAId,
        companyId: company1.id,
        scheduledDate: '2055-04-10',
        period: 'MORNING',
        timeNote: '09:30 น. ห้องประชุม 1',
        studentUserIds: [student1User.id],
        teacherUserIds: [teacher1User.id]
      },
      staffUser
    })
    const draftRes: any = await createAppointmentHandler(createDraftEvent as any)
    const apptId = draftRes.appointment.id
    assert.equal(draftRes.appointment.status, 'DRAFT')
    assert.equal(draftRes.appointment.timeNote, '09:30 น. ห้องประชุม 1')

    const listAppointmentsEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      query: { pageSize: '100' },
      staffUser
    })
    const appointmentsListRes: any = await listAppointmentsHandler(listAppointmentsEvent as any)
    assert.equal(appointmentsListRes.total, 1)
    assert.equal(appointmentsListRes.appointments[0].companyName, company1.name)
    assert.equal(appointmentsListRes.appointments[0].students[0].id, student1User.id)
    assert.equal(appointmentsListRes.appointments[0].teachers[0].id, teacher1User.id)

    // TEST 9: Batch Publish Validation & Intra-batch Conflict
    console.log('\n--- TEST 9: Batch Publish Validation & Intra-batch Conflict ---')
    // Assign company2 to Group B
    await addCompanyToGroupHandler(createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), groupId: String(groupBId) },
      body: { companyId: company2.id },
      staffUser
    }) as any)

    // Create Draft 2 in Group B on same date and period (MORNING) with teacher2
    const createDraft2Event = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupBId,
        companyId: company2.id,
        scheduledDate: '2055-04-10',
        period: 'MORNING',
        studentUserIds: [student2User.id],
        teacherUserIds: [teacher2User.id]
      },
      staffUser
    })
    const draft2Res: any = await createAppointmentHandler(createDraft2Event as any)
    const appt2Id = draft2Res.appointment.id

    // Now intentionally add teacher2 to Draft 1 directly to simulate intra-batch conflict test
    await prisma.supervisionAppointmentTeacher.create({
      data: { appointmentId: apptId, teacherUserId: teacher2User.id }
    })

    // Batch publish apptId and appt2Id -> both have teacher2 on 2055-04-10 MORNING -> should reject 400
    const batchConflictEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: { appointmentIds: [apptId, appt2Id] },
      staffUser
    })
    await assert.rejects(
      async () => await publishBatchHandler(batchConflictEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /รายการนัดหมายที่เลือกเผยแพร่พร้อมกัน/)
        return true
      },
      'Intra-batch conflict detection must reject with 400'
    )

    // Remove teacher2 from apptId
    await prisma.supervisionAppointmentTeacher.deleteMany({
      where: { appointmentId: apptId, teacherUserId: teacher2User.id }
    })

    // Batch publish should now succeed
    const batchPublishEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: { appointmentIds: [apptId, appt2Id] },
      staffUser
    })
    const batchRes: any = await publishBatchHandler(batchPublishEvent as any)
    assert.equal(batchRes.publishedCount, 2)

    // TEST 10: Cycle-wide Conflict Check on Reschedule
    console.log('\n--- TEST 10: Cycle-wide Conflict Check on Reschedule ---')
    // Attempt to reschedule Appt 2 to have teacher1 on 2055-04-10 MORNING (where Appt 1 is published with teacher1)
    // First, verify reschedule without reason fails
    const badRescheduleEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), appointmentId: String(appt2Id) },
      body: { scheduledDate: '2055-04-10', period: 'MORNING', reason: '   ' },
      staffUser
    })
    await assert.rejects(
      async () => await rescheduleAppointmentHandler(badRescheduleEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        return true
      },
      'Should reject reschedule without reason'
    )

    // Reschedule with valid reason
    const goodRescheduleEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), appointmentId: String(apptId) },
      body: { scheduledDate: '2055-04-15', period: 'AFTERNOON', reason: 'สถานประกอบการขอเลื่อนวัน' },
      staffUser
    })
    const reschedRes: any = await rescheduleAppointmentHandler(goodRescheduleEvent as any)
    assert.equal(reschedRes.status, 'RESCHEDULED')
    assert.equal(reschedRes.changeReason, 'สถานประกอบการขอเลื่อนวัน')

    // TEST 11: Cancel with Reason Validation
    console.log('\n--- TEST 11: Cancel with Reason Validation ---')
    const badCancelEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), appointmentId: String(apptId) },
      body: { reason: '' },
      staffUser
    })
    await assert.rejects(
      async () => await cancelAppointmentHandler(badCancelEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        return true
      },
      'Should reject cancel without reason'
    )

    const goodCancelEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id), appointmentId: String(apptId) },
      body: { reason: 'ยกเลิกเนื่องจากเปลี่ยนรูปแบบการนิเทศ' },
      staffUser
    })
    const cancelRes: any = await cancelAppointmentHandler(goodCancelEvent as any)
    assert.equal(cancelRes.status, 'CANCELLED')
    assert.equal(cancelRes.cancelReason, 'ยกเลิกเนื่องจากเปลี่ยนรูปแบบการนิเทศ')

    // TEST 12: Travel Plan & Budget Calculation & Boundary Validation
    console.log('\n--- TEST 12: Travel Plan & Budget Validation ---')
    // 12.1 Non-group teacher in travel plan travellers -> 400
    const badTravellerEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupAId,
        travelDate: '2055-04-20',
        fuelRate: 4,
        stops: [{ appointmentId: apptId, distanceKmFromPrevious: 100 }],
        travellers: [{ teacherUserId: teacher2User.id }] // teacher2 is in groupB, not groupA!
      },
      staffUser
    })
    await assert.rejects(
      async () => await createTravelPlanHandler(badTravellerEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /ไม่ใช่อาจารย์ที่อยู่ในกลุ่มนิเทศนี้/)
        return true
      },
      'Should reject non-group traveller in travel plan'
    )

    // 12.2 Valid Travel Plan
    // Distance = 120 km, FuelRate = 4.0 -> fuelCost = 480
    // Traveller: teacher1, perDiemRate = 240, days = 1 -> perDiemTotal = 240
    // Lodging: lodgingRate = 1500, nights = 1, persons = 2 -> lodgingTotal = 750
    // Total estimate = 480 + 240 + 750 = 1470
    const createTravelPlanEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      body: {
        groupId: groupAId,
        travelDate: '2055-04-20',
        startLocation: 'มหาวิทยาลัย',
        fuelRate: 4,
        note: 'สาย กทม.',
        stops: [
          { appointmentId: apptId, distanceKmFromPrevious: 120 }
        ],
        travellers: [
          {
            teacherUserId: teacher1User.id,
            perDiemRate: 240,
            perDiemDays: 1,
            lodgingRate: 1500,
            nights: 1,
            personsPerRoom: 2
          }
        ]
      },
      staffUser
    })
    const travelPlanRes: any = await createTravelPlanHandler(createTravelPlanEvent as any)
    assert.equal(travelPlanRes.travelPlan.calculation.totalDistanceKm, 120)
    assert.equal(travelPlanRes.travelPlan.calculation.fuelCost, 480)
    assert.equal(travelPlanRes.travelPlan.calculation.perDiemTotal, 240)
    assert.equal(travelPlanRes.travelPlan.calculation.lodgingTotal, 750)
    assert.equal(travelPlanRes.travelPlan.calculation.totalEstimate, 1470)

    // TEST 13: List Travel Plans DTO verification
    console.log('\n--- TEST 13: List Travel Plans DTO ---')
    const listTravelEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      staffUser
    })
    const listTravelRes: any = await listTravelPlansHandler(listTravelEvent as any)
    assert(Array.isArray(listTravelRes.travelPlans), 'Should return { travelPlans: [...] }')
    assert.equal(listTravelRes.travelPlans.length, 1)
    const tp0 = listTravelRes.travelPlans[0]
    assert.equal(tp0.calculation.totalEstimate, 1470)
    assert.equal(tp0.group.name, 'กลุ่ม A (กรุงเทพ)')

    // TEST 14: Supervision Summary API
    console.log('\n--- TEST 14: Supervision Summary API ---')
    const summaryEvent = createMockEvent({
      params: { cycleId: String(cycle1.id) },
      staffUser
    })
    const summaryRes: any = await supervisionSummaryHandler(summaryEvent as any)
    assert.equal(summaryRes.roundsCount, 2)
    assert.equal(summaryRes.confirmedCompaniesCount, 2)
    assert.equal(summaryRes.travelPlansCount, 2)
    assert.equal(summaryRes.totalBudgetEstimate, 4290)

    // TEST 15: Every teacher in the group can access an appointment, including one not assigned to them individually.
    console.log('\n--- TEST 15: Teacher group access ---')
    const teacher1Appointments: any = await listTeacherAppointmentsHandler(createMockEvent({ staffUser: teacher1User }) as any)
    assert(teacher1Appointments.appointments.every((appointment: any) => appointment.id !== apptId), 'Cancelled appointments must not be shown to teachers')

    assert(updatedAppointment, 'Planned appointment must exist for teacher group access test')
    await prisma.supervisionGroupTeacher.create({
      data: { supervisionRoundId: round2Id, supervisionGroupId: plannedGroupRes.group.id, teacherUserId: teacher2User.id }
    })
    const teacher2Appointments: any = await listTeacherAppointmentsHandler(createMockEvent({ staffUser: teacher2User }) as any)
    assert(teacher2Appointments.appointments.some((appointment: any) => appointment.id === updatedAppointment.id), 'A teacher in the group must see a published appointment even when it is assigned to another teacher')

    // TEST 16: Evaluations can be saved before the visit and edited later by the same group teacher.
    console.log('\n--- TEST 16: Immediate and editable teacher evaluations ---')
    const studentEvaluationEvent = createMockEvent({
      params: { appointmentId: String(updatedAppointment.id), studentId: String(student1User.id) },
      body: { responsibilityScore: 4, disciplineScore: 4, communicationScore: 4, knowledgeScore: 4, workQualityScore: 4, problemSolvingScore: 4 },
      staffUser: teacher2User
    })
    await assert.rejects(
      async () => await submitStudentEvaluationHandler(createMockEvent({ params: studentEvaluationEvent.context.params, body: {}, staffUser: teacher2User }) as any),
      (err: any) => err.statusCode === 400,
      'Incomplete student evaluation must be rejected'
    )
    await submitStudentEvaluationHandler(studentEvaluationEvent as any)
    await submitStudentEvaluationHandler(createMockEvent({
      params: studentEvaluationEvent.context.params,
      body: { responsibilityScore: 5, disciplineScore: 4, communicationScore: 4, knowledgeScore: 4, workQualityScore: 4, problemSolvingScore: 4 },
      staffUser: teacher2User
    }) as any)
    const editedStudentEvaluation = await prisma.studentEvaluation.findUniqueOrThrow({
      where: { appointment_student_teacher: { appointmentId: updatedAppointment.id, studentUserId: student1User.id, teacherUserId: teacher2User.id } }
    })
    assert.equal(editedStudentEvaluation.responsibilityScore, 5, 'A teacher must be able to edit their submitted student evaluation')

    const companyEvaluationEvent = createMockEvent({
      params: { appointmentId: String(updatedAppointment.id) },
      body: Object.fromEntries(['workAlignmentScore', 'workScopeScore', 'learningOpportunityScore', 'supervisorReadinessScore', 'studentSupportScore', 'environmentScore', 'safetyScore', 'resourcesScore', 'welfareScore', 'travelScore', 'transportScore', 'accommodationScore', 'coordinationScore'].map(key => [key, 4])),
      staffUser: teacher2User
    })
    await submitCompanyEvaluationHandler(companyEvaluationEvent as any)
    await submitCompanyEvaluationHandler(createMockEvent({
      params: companyEvaluationEvent.context.params,
      body: Object.fromEntries(['workAlignmentScore', 'workScopeScore', 'learningOpportunityScore', 'supervisorReadinessScore', 'studentSupportScore', 'environmentScore', 'safetyScore', 'resourcesScore', 'welfareScore', 'travelScore', 'transportScore', 'accommodationScore', 'coordinationScore'].map(key => [key, 5])),
      staffUser: teacher2User
    }) as any)
    const editedCompanyEvaluation = await prisma.companyEvaluation.findUniqueOrThrow({
      where: { appointment_teacher_company_evaluation: { appointmentId: updatedAppointment.id, teacherUserId: teacher2User.id } }
    })
    assert.equal(editedCompanyEvaluation.workAlignmentScore, 5, 'A teacher must be able to edit their submitted company evaluation')

    await assert.rejects(
      async () => await updateGroupHandler(createMockEvent({
        params: { cycleId: String(cycle1.id), roundId: String(round2Id), groupId: String(plannedGroupRes.group.id) },
        body: {
          teacherUserIds: [teacher1User.id, teacher2User.id],
          companyPlans: [{ companyId: company1.id, scheduledDate: '2055-04-13', period: 'AFTERNOON', distanceKmFromPrevious: 24 }]
        },
        staffUser
      }) as any),
      (err: any) => err.statusCode === 400,
      'Updating a group must not delete appointments that already have evaluations'
    )

    console.log('\n🎉 ALL 16 INTEGRATION TESTS PASSED PERFECTLY!')
  } finally {
    // Teardown / Cleanup
    console.log('\n🧹 Cleaning up test fixtures...')
    try {
      if (cycle1) {
        const rounds = await prisma.supervisionRound.findMany({ where: { cooperativeCycleId: cycle1.id } })
        for (const r of rounds) {
          await prisma.supervisionTravelStop.deleteMany({ where: { travelPlan: { supervisionRoundId: r.id } } })
          await prisma.supervisionTravelTraveller.deleteMany({ where: { travelPlan: { supervisionRoundId: r.id } } })
          await prisma.supervisionTravelPlan.deleteMany({ where: { supervisionRoundId: r.id } })
          await prisma.supervisionAppointmentStudent.deleteMany({ where: { appointment: { supervisionRoundId: r.id } } })
          await prisma.supervisionAppointmentTeacher.deleteMany({ where: { appointment: { supervisionRoundId: r.id } } })
          await prisma.supervisionAppointment.deleteMany({ where: { supervisionRoundId: r.id } })
          await prisma.supervisionGroupCompany.deleteMany({ where: { supervisionRoundId: r.id } })
          await prisma.supervisionGroupTeacher.deleteMany({ where: { supervisionRoundId: r.id } })
          await prisma.supervisionGroup.deleteMany({ where: { supervisionRoundId: r.id } })
        }
        await prisma.supervisionRound.deleteMany({ where: { cooperativeCycleId: cycle1.id } })

        await prisma.cooperativeRequest.deleteMany({
          where: { companyApplication: { cooperativeCycleId: cycle1.id } }
        })
        await prisma.companyApplication.deleteMany({
          where: { cooperativeCycleId: cycle1.id }
        })
        await prisma.cooperativeCycle.delete({ where: { id: cycle1.id } })
      }

      if (cycle2) {
        await prisma.supervisionRound.deleteMany({ where: { cooperativeCycleId: cycle2.id } })
        await prisma.cooperativeCycle.delete({ where: { id: cycle2.id } })
      }

      if (closedCycle) {
        await prisma.cooperativeCycle.delete({ where: { id: closedCycle.id } })
      }

      await prisma.company.deleteMany({
        where: { name: { in: [COMPANY1_NAME, COMPANY2_NAME] } }
      })

      await prisma.user.deleteMany({
        where: {
          loginId: {
            in: [STAFF_LOGIN, TEACHER1_LOGIN, TEACHER2_LOGIN, STUDENT1_LOGIN, STUDENT2_LOGIN]
          }
        }
      })
      console.log('🧹 Cleanup complete.')
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr)
    }
  }
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err)
  process.exit(1)
})
