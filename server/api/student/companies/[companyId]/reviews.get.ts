export default defineEventHandler(async (event) => {
  await requireRole(event, 'STUDENT')
  const companyId = validatePositiveId(getRouterParam(event, 'companyId'), 'รหัสสถานประกอบการ')
  const reviews = await prisma.companyReview.findMany({ where: { status: 'APPROVED', cooperativeRequest: { companyApplication: { companyId } } }, select: { id: true, rating: true, comment: true, createdAt: true, cooperativeRequest: { select: { companyApplication: { select: { cooperativeCycle: { select: { term: true, academicYear: true } } } } } } }, orderBy: { createdAt: 'desc' } })
  return reviews.map(review => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt, term: review.cooperativeRequest.companyApplication.cooperativeCycle.term, academicYear: review.cooperativeRequest.companyApplication.cooperativeCycle.academicYear }))
})
