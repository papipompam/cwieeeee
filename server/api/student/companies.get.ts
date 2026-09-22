export default defineEventHandler(async (event) => {
  await requireRole(event, 'STUDENT')

  const query = getQuery(event)
  const id = typeof query.id === 'string' ? Number(query.id) : undefined
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const where: Record<string, any> = {
    isActive: true
  }

  if (Number.isInteger(id) && id! > 0) where.id = id

  if (search && !where.id) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } }
    ]
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 20,
    include: { companyApplications: { include: { cooperativeRequest: { include: { companyReview: true } } } } }
  })

  return companies.map(({ companyApplications, ...company }) => {
    const reviews = companyApplications.map(application => application.cooperativeRequest?.companyReview).filter(review => review?.status === 'APPROVED')
    return { ...company, reviewCount: reviews.length, averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review!.rating, 0) / reviews.length : null }
  })
})
