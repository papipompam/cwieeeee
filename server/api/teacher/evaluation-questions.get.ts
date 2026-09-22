export default defineEventHandler(async (event) => {
  await requireRole(event, 'TEACHER')
  const cycleId = validatePositiveId(getQuery(event).cycleId, 'รอบสหกิจศึกษา')
  const type = getQuery(event).type
  return prisma.evaluationQuestion.findMany({ where: { cooperativeCycleId: cycleId, isActive: true, ...(type ? { evaluationType: String(type) } : {}) }, orderBy: [{ evaluationType: 'asc' }, { sortOrder: 'asc' }] })
})
