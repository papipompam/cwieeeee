export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const request = await prisma.cooperativeRequest.findFirst({ where: { status: 'PLACEMENT_CONFIRMED', companyApplication: { studentUserId: user.id } }, orderBy: { confirmedAt: 'desc' }, include: { companyReview: true } })
  if (!request) return { placement: null, review: null }
  return { placement: { id: request.id, companyName: request.companyName, position: request.position, province: request.province }, review: request.companyReview }
})
