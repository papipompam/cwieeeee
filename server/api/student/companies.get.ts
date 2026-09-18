export default defineEventHandler(async (event) => {
  await requireRole(event, 'STUDENT')

  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const where: Record<string, any> = {
    isActive: true
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } }
    ]
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 20
  })

  return companies
})
