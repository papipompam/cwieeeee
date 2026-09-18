export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const cohortYear = query.cohortYear ? Number(query.cohortYear) : undefined
  const classGroup = query.classGroup ? Number(query.classGroup) : undefined
  const isActiveQuery = typeof query.isActive === 'string' ? query.isActive : undefined

  const where: Record<string, any> = {}

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: 'insensitive' } },
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

  return await prisma.student.findMany({
    where,
    orderBy: [
      { cohortYear: 'desc' },
      { classGroup: 'asc' },
      { studentId: 'asc' }
    ]
  })
})
