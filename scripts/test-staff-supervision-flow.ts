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

    // TEST 1: Fixed supervision rounds (fixtures bypass the cycle creation API)
    console.log('\n--- TEST 1: Fixed supervision rounds ---')
    const listRoundsEvent = createMockEvent({
      params: { cycleId: String(cycle1.id) },
      staffUser
    })
    const roundsRes0: any = await listRoundsHandler(listRoundsEvent as any)
    assert.equal(roundsRes0.rounds.length, 0, 'GET rounds should not mutate a direct database fixture')

    // Closed cycle GET should also NOT auto-create round 1
    const closedCycleGetEvent = createMockEvent({
      params: { cycleId: String(closedCycle.id) },
      staffUser
    })
    const closedRoundsRes: any = await listRoundsHandler(closedCycleGetEvent as any)
    assert.equal(closedRoundsRes.rounds.length, 0, 'GET rounds on closed cycle must not auto-seed round 1')

    await prisma.supervisionRound.createMany({
      data: [1, 2].map(roundNo => ({ cooperativeCycleId: cycle1.id, roundNo, name: `นิเทศครั้งที่ ${roundNo}`, status: 'DRAFT' as const }))
    })
    const fixedRounds: any = await listRoundsHandler(listRoundsEvent as any)
    assert.deepEqual(fixedRounds.rounds.map((round: any) => round.roundNo), [1, 2])
    const [round1Id, round2Id] = fixedRounds.rounds.map((round: any) => round.id)

    // TEST 2: Manual round creation is unavailable, including for closed cycles
    console.log('\n--- TEST 2: Manual round creation is unavailable ---')
    const closedCycleEvent = createMockEvent({
      params: { cycleId: String(closedCycle.id) },
      body: { roundNo: 1, title: 'รอบใหม่' },
      staffUser
    })
    await assert.rejects(
      async () => await createRoundHandler(closedCycleEvent as any),
      (err: any) => {
        assert.equal(err.statusCode, 405)
        assert.match(err.message, /ไม่สามารถเพิ่มรอบได้/)
        return true
      },
      'Should block manual round creation'
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
        companyIds: [company1.id],
        companyPlans: [{ companyId: company1.id, scheduledDate: '2055-04-20', period: 'MORNING', distanceKmFromPrevious: 0 }]
      },
      staffUser
    })
    const groupARes: any = await createGroupHandler(createGroupAEvent as any)
    const groupAId = groupARes.group.id
    const groupAAppointment = await prisma.supervisionAppointment.findFirstOrThrow({ where: { supervisionGroupId: groupAId } })
    const apptId = groupAAppointment.id

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

    // Verify listGroups returns { groups: [...] } with proper DTO
    const listGroupsEvent = createMockEvent({
      params: { cycleId: String(cycle1.id), roundId: String(round1Id) },
      staffUser
    })
    const groupsListRes: any = await listGroupsHandler(listGroupsEvent as any)
    assert(Array.isArray(groupsListRes.groups), 'listGroupsHandler should return { groups: [...] }')
    assert.equal(groupsListRes.groups.length, 1)
    assert.equal(groupsListRes.groups[0].companies[0].companyId, company1.id)
    assert(Array.isArray(groupsListRes.groups[0].companies[0].students), 'Company should have students array')

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
    assert(teacher1Appointments.appointments.some((appointment: any) => appointment.id === apptId), 'Published group appointments must be shown to assigned teachers')

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
