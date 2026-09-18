export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const visits = await prisma.supervisionVisit.findMany({
    where: {
      studentUserId: user.id,
      status: 'PUBLISHED'
    },
    include: {
      cooperativeCycle: {
        select: {
          id: true,
          term: true,
          academicYear: true
        }
      }
    },
    orderBy: { visitDate: 'asc' }
  })

  return visits
})
