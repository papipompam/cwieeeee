export default defineEventHandler(async () => {
  return await prisma.cooperativeCycle.findMany({
    orderBy: [
      { academicYear: 'desc' },
      { term: 'desc' }
    ]
  })
})
