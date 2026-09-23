export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const documents = await prisma.requestDocument.findMany({
    where: {
      cooperativeRequest: {
        companyApplication: {
          studentUserId: user.id
        }
      }
    },
    include: {
      cooperativeRequest: {
        select: {
          id: true,
          status: true,
          companyName: true,
          position: true
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  })

  return documents
})
