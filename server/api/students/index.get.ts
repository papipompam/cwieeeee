export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const cohortYear = query.cohortYear ? Number(query.cohortYear) : undefined
  const classGroup = query.classGroup ? Number(query.classGroup) : undefined
  const isActiveQuery = typeof query.isActive === 'string' ? query.isActive : undefined

  const where: Record<string, any> = {
    role: 'STUDENT'
  }

  if (search) {
    where.OR = [
      { loginId: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (cohortYear && !isNaN(cohortYear)) {
    where.cohortYear = cohortYear
  }

  if (classGroup && !isNaN(classGroup)) {
    where.classGroup = classGroup
  }

  if (isActiveQuery === 'true') {
    where.isActive = true
  } else if (isActiveQuery === 'false') {
    where.isActive = false
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [
      { cohortYear: 'desc' },
      { classGroup: 'asc' },
      { loginId: 'asc' }
    ]
  })

  return users.map(u => ({
    id: u.id,
    studentId: u.loginId,
    prefix: u.prefix ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    gender: u.gender ?? '',
    cohortYear: u.cohortYear ?? 0,
    classGroup: u.classGroup ?? 0,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }))
})
