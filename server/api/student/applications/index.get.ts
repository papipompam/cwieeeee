export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const status = typeof query.status === 'string' ? query.status : undefined
  const requestStatus = typeof query.requestStatus === 'string' ? query.requestStatus : undefined

  const where: Record<string, any> = {
    studentUserId: user.id
  }

  if (status && status !== 'all') {
    where.status = status
  }

  if (requestStatus && requestStatus !== 'all') {
    if (requestStatus === 'NONE') {
      where.cooperativeRequest = null
    } else {
      where.cooperativeRequest = {
        status: requestStatus
      }
    }
  }

  if (search) {
    where.company = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { province: { contains: search, mode: 'insensitive' } }
      ]
    }
  }

  const applications = await prisma.companyApplication.findMany({
    where,
    include: {
      company: true,
      cooperativeRequest: true,
      cooperativeCycle: {
        select: {
          id: true,
          term: true,
          academicYear: true,
          cohortYear: true,
          status: true
        }
      }
    },
    orderBy: [
      { appliedAt: 'desc' },
      { id: 'desc' }
    ]
  })

  return applications
})
