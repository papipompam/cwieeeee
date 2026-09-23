export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  return prisma.companyReview.findMany({
    include: {
      studentUser: { select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } },
      cooperativeRequest: { select: { id: true, companyName: true, province: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })
})
