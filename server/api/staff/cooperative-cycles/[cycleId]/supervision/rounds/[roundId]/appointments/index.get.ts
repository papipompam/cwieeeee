export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  const groupId = query.groupId ? Number(query.groupId) : undefined
  const status = typeof query.status === 'string' && query.status.trim() ? query.status.trim() : undefined
  const province = typeof query.province === 'string' && query.province.trim() ? query.province.trim() : undefined
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const where: any = {
    supervisionRoundId: roundId
  }

  if (groupId) {
    where.supervisionGroupId = groupId
  }

  if (status) {
    where.status = status
  }

  if (province) {
    where.province = province
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } },
      { supervisionGroup: { name: { contains: search, mode: 'insensitive' } } },
      {
        students: {
          some: {
            studentUser: {
              OR: [
                { loginId: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        }
      },
      {
        teachers: {
          some: {
            teacherUser: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        }
      }
    ]
  }

  const [total, appointments] = await prisma.$transaction([
    prisma.supervisionAppointment.count({ where }),
    prisma.supervisionAppointment.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { scheduledDate: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        supervisionGroup: {
          select: { id: true, name: true }
        },
        company: {
          select: { id: true, name: true, province: true, district: true, phone: true }
        },
        students: {
          include: {
            studentUser: {
              select: {
                id: true,
                loginId: true,
                prefix: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
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
                phone: true
              }
            }
          }
        }
      }
    })
  ])

  return {
    appointments: appointments.map((a: any) => ({
      id: a.id,
      supervisionRoundId: a.supervisionRoundId,
      supervisionGroupId: a.supervisionGroupId,
      group: a.supervisionGroup,
      companyId: a.companyId,
      companyName: a.companyName,
      companyAddress: a.companyAddress,
      province: a.province,
      latitude: a.latitude,
      longitude: a.longitude,
      scheduledDate: a.scheduledDate,
      period: a.period,
      timeNote: a.timeNote,
      status: a.status,
      changeReason: a.changeReason,
      cancelReason: a.cancelReason,
      publishedAt: a.publishedAt,
      evaluationNote: a.evaluationNote,
      evaluatedAt: a.evaluatedAt,
      studentsCount: a.students.length,
      students: a.students.map((s: any) => ({
        id: s.studentUser.id,
        loginId: s.studentUser.loginId,
        prefix: s.studentUser.prefix,
        firstName: s.studentUser.firstName,
        lastName: s.studentUser.lastName,
        phone: s.studentUser.phone
      })),
      teachersCount: a.teachers.length,
      teachers: a.teachers.map((t: any) => ({
        id: t.teacherUser.id,
        teacherId: t.teacherUser.loginId,
        prefix: t.teacherUser.prefix,
        firstName: t.teacherUser.firstName,
        lastName: t.teacherUser.lastName,
        phone: t.teacherUser.phone
      })),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
})
