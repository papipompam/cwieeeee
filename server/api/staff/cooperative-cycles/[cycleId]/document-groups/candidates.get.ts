export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requests = await prisma.cooperativeRequest.findMany({
    where: {
      status: { in: ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'RETURNED_FOR_REVISION'] },
      requestLetterParticipations: { none: { requestLetterVersion: { isActive: true } } },
      companyApplication: { cooperativeCycleId: cycleId }
    },
    select: { id: true, companyName: true, recipientName: true, companyApplication: { select: { studentUser: { select: { id: true, prefix: true, firstName: true, lastName: true, loginId: true } } } } },
    orderBy: [{ companyName: 'asc' }, { confirmedAt: 'asc' }]
  })
  return requests.map(request => ({
    id: request.id, companyName: request.companyName, recipientName: request.recipientName,
    student: request.companyApplication.studentUser
  }))
})
