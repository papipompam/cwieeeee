export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const where: any = {
    status: 'PLACEMENT_CONFIRMED',
    companyApplication: {
      cooperativeCycleId: cycleId
    }
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } },
      { companyApplication: { studentUser: { loginId: { contains: search, mode: 'insensitive' } } } },
      { companyApplication: { studentUser: { firstName: { contains: search, mode: 'insensitive' } } } },
      { companyApplication: { studentUser: { lastName: { contains: search, mode: 'insensitive' } } } }
    ]
  }

  const [total, requests] = await prisma.$transaction([
    prisma.cooperativeRequest.count({ where }),
    prisma.cooperativeRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
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
                classGroup: true,
                cohortYear: true
              }
            }
          }
        }
      }
    })
  ])

  return {
    placements: requests.map(r => ({
      id: r.id,
      companyApplicationId: r.companyApplicationId,
      companyName: r.companyName,
      internshipLocationName: r.internshipLocationName,
      position: r.position,
      province: r.province,
      recipientName: r.recipientName,
      confirmedAt: r.confirmedAt,
      updatedAt: r.updatedAt,
      student: r.companyApplication.studentUser
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
})
