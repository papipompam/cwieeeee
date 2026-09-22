export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const companyId = Number(getQuery(event).companyId)
  const requests = await prisma.cooperativeRequest.findMany({
    where: {
      status: { in: ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'RETURNED_FOR_REVISION'] },
      requestLetterParticipations: { none: { requestLetterVersion: { isActive: true } } },
      companyApplication: { cooperativeCycleId: cycleId, ...(Number.isInteger(companyId) && companyId > 0 ? { companyId } : {}) }
    },
    select: { id: true, companyName: true, recipientName: true, companyApplication: { select: { companyId: true, studentUser: { select: { id: true, prefix: true, firstName: true, lastName: true, loginId: true } } } } },
    orderBy: [{ companyName: 'asc' }, { confirmedAt: 'asc' }]
  })
  return requests.map(request => ({
    id: request.id, companyId: request.companyApplication.companyId, companyName: request.companyName, recipientName: request.recipientName,
    student: request.companyApplication.studentUser
  }))
})
