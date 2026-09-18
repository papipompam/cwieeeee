export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const classGroup = query.classGroup && query.classGroup !== 'all' ? Number(query.classGroup) : undefined
  const status = typeof query.status === 'string' ? query.status : 'all'

  const where: any = {
    role: 'STUDENT',
    cohortYear: cycle.cohortYear,
    ...(classGroup ? { classGroup } : {}),
    ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {})
  }

  if (search) {
    where.OR = [
      { loginId: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [total, students] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ classGroup: 'asc' }, { loginId: 'asc' }],
      select: {
        id: true,
        loginId: true,
        prefix: true,
        firstName: true,
        lastName: true,
        gender: true,
        cohortYear: true,
        classGroup: true,
        isActive: true,
        companyApplications: {
          where: { cooperativeCycleId: cycleId },
          orderBy: { updatedAt: 'desc' },
          include: {
            company: {
              select: { name: true }
            },
            cooperativeRequest: {
              select: {
                id: true,
                status: true,
                companyName: true,
                position: true
              }
            }
          }
        }
      }
    })
  ])

  const mappedStudents = students.map(s => {
    const apps = s.companyApplications
    const cycleStatus = deriveStudentCycleStatus(apps)
    
    // Latest company: first from request snapshot, then company relation
    const appWithReq = apps.find(a => a.cooperativeRequest)
    const latestCompany = appWithReq?.cooperativeRequest?.companyName
      || apps[0]?.company?.name
      || null

    const latestRequestId = appWithReq?.cooperativeRequest?.id || null

    return {
      id: s.id,
      studentId: s.loginId,
      prefix: s.prefix,
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      cohortYear: s.cohortYear,
      classGroup: s.classGroup,
      isActive: s.isActive,
      cycleStatus,
      latestCompany,
      latestRequestId
    }
  })

  return {
    students: mappedStudents,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
})
