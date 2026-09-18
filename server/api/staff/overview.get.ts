export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')

  const [openApplicationCyclesCount, internshipCyclesCount, pendingRequestsCount, pendingDocumentsCount, studentsCount, teachersCount, staffCount, companiesCount, recentCycles] = await Promise.all([
    prisma.cooperativeCycle.count({ where: { status: 'OPEN_FOR_APPLICATION' } }),
    prisma.cooperativeCycle.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.cooperativeRequest.count({ where: { status: { in: ['SUBMITTED', 'STAFF_PROCESSING'] } } }),
    prisma.cooperativeRequest.count({ where: { status: 'DOCUMENT_UNDER_REVIEW' } }),
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.user.count({ where: { role: 'STAFF', isActive: true } }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.cooperativeCycle.findMany({
      take: 5,
      orderBy: [{ academicYear: 'desc' }, { term: 'desc' }],
      select: {
        id: true,
        term: true,
        academicYear: true,
        status: true,
        applicationStartDate: true,
        applicationEndDate: true,
        internshipStartDate: true,
        internshipEndDate: true,
        _count: { select: { enrollments: true } }
      }
    })
  ])

  return {
    openApplicationCyclesCount,
    internshipCyclesCount,
    pendingRequestsCount,
    pendingDocumentsCount,
    studentsCount,
    teachersCount,
    staffCount,
    companiesCount,
    recentCycles: recentCycles.map(cycle => ({ ...cycle, enrolledStudentsCount: cycle._count.enrollments }))
  }
})
