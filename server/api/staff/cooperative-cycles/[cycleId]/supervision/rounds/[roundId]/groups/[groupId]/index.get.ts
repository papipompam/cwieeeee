export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  const group = await getSupervisionGroup(roundId, groupId)

  // Query confirmed placements in this cycle to map students to companies
  const confirmedRequests = await prisma.cooperativeRequest.findMany({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: { cooperativeCycleId: cycleId }
    },
    include: {
      companyApplication: {
        include: {
          studentUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              cohortYear: true,
              classGroup: true,
              phone: true
            }
          }
        }
      }
    }
  })

  const companyStudentsMap = new Map<number, any[]>()
  for (const req of confirmedRequests) {
    const cId = req.companyApplication.companyId
    if (!companyStudentsMap.has(cId)) {
      companyStudentsMap.set(cId, [])
    }
    companyStudentsMap.get(cId)!.push({
      requestId: req.id,
      ...req.companyApplication.studentUser
    })
  }

  let totalStudentsCount = 0
  const enrichedCompanies = group.companies.map((c: any) => {
    const students = companyStudentsMap.get(c.companyId) || []
    totalStudentsCount += students.length
    return {
      id: c.id,
      companyId: c.companyId,
      company: {
        id: c.company.id,
        name: c.company.name,
        province: c.company.province,
        district: c.company.district,
        addressNo: c.company.addressNo,
        latitude: c.company.latitude,
        longitude: c.company.longitude,
        contactPerson: c.company.contactPerson,
        phone: c.company.phone
      },
      studentsCount: students.length,
      students
    }
  })

  // Calculate teacher workloads (across round and in this group)
  const enrichedTeachers = await Promise.all(
    group.teachers.map(async (t: any) => {
      // In this round, teacher is in 1 group (due to constraint), so workload in this round equals this group
      return {
        id: t.id,
        teacherUserId: t.teacherUserId,
        teacher: {
          id: t.teacherUser.id,
          loginId: t.teacherUser.loginId,
          prefix: t.teacherUser.prefix,
          firstName: t.teacherUser.firstName,
          lastName: t.teacherUser.lastName,
          phone: t.teacherUser.phone,
          gender: t.teacherUser.gender
        },
        assignedCompaniesCount: group.companies.length,
        assignedStudentsCount: totalStudentsCount
      }
    })
  )

  return {
    id: group.id,
    name: group.name,
    note: group.note,
    supervisionRoundId: group.supervisionRoundId,
    companiesCount: group.companies.length,
    studentsCount: totalStudentsCount,
    teachersCount: group.teachers.length,
    companies: enrichedCompanies,
    teachers: enrichedTeachers,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt
  }
})
