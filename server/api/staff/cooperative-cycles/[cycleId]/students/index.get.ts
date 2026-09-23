export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const classGroup = query.classGroup && query.classGroup !== 'all' ? Number(query.classGroup) : undefined
  const status = typeof query.status === 'string' ? query.status : 'all'
  const sortStatus = query.sortStatus === 'asc' || query.sortStatus === 'desc' ? query.sortStatus : null
  const cycleStatusFilter = typeof query.cycleStatus === 'string' ? query.cycleStatus : 'all'
  const needsDerivedResults = Boolean(sortStatus || cycleStatusFilter !== 'all')

  const where: any = {
    role: 'STUDENT',
    cycleEnrollments: { some: { cooperativeCycleId: cycleId } },
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
      skip: needsDerivedResults ? undefined : (page - 1) * pageSize,
      take: needsDerivedResults ? undefined : pageSize,
      orderBy: [{ classGroup: 'asc' }, { loginId: 'asc' }],
      select: {
        id: true,
        loginId: true,
        prefix: true,
        firstName: true,
        lastName: true,
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
    const latestApp = appWithReq || apps[0]
    const latestCompany = appWithReq?.cooperativeRequest?.companyName
      || apps[0]?.company?.name
      || null

    const latestRequestId = appWithReq?.cooperativeRequest?.id || null
    const latestApplicationStatus = latestApp?.status || null

    return {
      id: s.id,
      studentId: s.loginId,
      prefix: s.prefix,
      firstName: s.firstName,
      lastName: s.lastName,
      cohortYear: s.cohortYear,
      classGroup: s.classGroup,
      isActive: s.isActive,
      cycleStatus,
      latestCompany,
      latestRequestId,
      latestApplicationStatus
    }
  })

  const filteredStudents = cycleStatusFilter === 'all'
    ? mappedStudents
    : mappedStudents.filter(student => matchesStudentCycleStatusFilter(student.cycleStatus.key, cycleStatusFilter))

  if (sortStatus) {
    filteredStudents.sort((a, b) => {
      return compareStudentCycleStatuses(a.cycleStatus.key, b.cycleStatus.key, sortStatus) || (a.classGroup ?? 0) - (b.classGroup ?? 0) || a.studentId.localeCompare(b.studentId)
    })
  }

  return {
    students: needsDerivedResults ? filteredStudents.slice((page - 1) * pageSize, page * pageSize) : filteredStudents,
    total: needsDerivedResults ? filteredStudents.length : total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((needsDerivedResults ? filteredStudents.length : total) / pageSize))
  }
})
