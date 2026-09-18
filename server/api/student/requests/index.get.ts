export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const requests = await prisma.cooperativeRequest.findMany({
    where: {
      companyApplication: {
        studentUserId: user.id
      }
    },
    include: {
      companyApplication: {
        include: {
          company: true,
          cooperativeCycle: true
        }
      },
      documents: {
        orderBy: { version: 'desc' }
      }
    },
    orderBy: { confirmedAt: 'desc' }
  })

  return requests
})
