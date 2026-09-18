export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const groups = await prisma.supervisionGroup.findMany({
    where: { supervisionRoundId: roundId },
    orderBy: { name: 'asc' },
    include: {
      companies: {
        include: {
          company: true
        }
      },
      teachers: {
        include: {
          teacherUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              phone: true,
              gender: true
            }
          }
        }
      },
      appointments: {
        select: {
          id: true,
          status: true,
          companyId: true,
          scheduledDate: true,
          period: true,
          timeNote: true
        }
      },
      travelPlans: {
        orderBy: { travelDate: 'asc' },
        select: {
          startLocation: true,
          fuelRate: true,
          lodgingRate: true,
          lodgingNights: true,
          lodgingRooms: true,
          note: true,
          travellers: {
            orderBy: { id: 'asc' },
            select: { perDiemRate: true, perDiemDays: true, lodgingRate: true, nights: true, personsPerRoom: true }
          }
        }
      }
    }
  })

  // Also query confirmed requests in this cycle to map students to companies
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
              classGroup: true
            }
          }
        }
      }
    }
  })

  // Map companyId -> student list
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

  const mappedGroups = groups.map((g: any) => {
    const provinces = Array.from(new Set(g.companies.map((c: any) => c.company.province).filter(Boolean)))

    let totalStudentsCount = 0
    const enrichedCompanies = g.companies.map((c: any) => {
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
          addressNo: c.company.addressNo
        },
        studentsCount: students.length,
        students
      }
    })

    return {
      id: g.id,
      name: g.name,
      note: g.note,
      supervisionRoundId: g.supervisionRoundId,
      companiesCount: g.companies.length,
      studentsCount: totalStudentsCount,
      teachersCount: g.teachers.length,
      provinces,
      companies: enrichedCompanies,
      teachers: g.teachers.map((t: any) => ({
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
        }
      })),
      appointmentsCount: g.appointments.length,
      appointments: g.appointments,
      travelPlans: g.travelPlans,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }
  })

  return {
    groups: mappedGroups
  }
})
