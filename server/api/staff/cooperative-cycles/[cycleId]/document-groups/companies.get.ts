export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requests = await prisma.cooperativeRequest.findMany({
    where: { companyApplication: { cooperativeCycleId: cycleId } },
    include: {
      companyApplication: { include: { company: { select: { id: true, name: true } }, studentUser: { select: { prefix: true, firstName: true, lastName: true } } } },
      requestLetterParticipations: {
        where: { requestLetterVersion: { isActive: true } },
        select: { requestLetterVersionId: true, requestLetterVersion: { select: { responseDocuments: { orderBy: { version: 'desc' }, take: 1, select: { status: true } } } } }
      }
    },
    orderBy: { confirmedAt: 'desc' }
  })
  const groups = new Map<number, { companyId: number, companyName: string, requests: typeof requests }>()
  for (const request of requests) {
    const company = request.companyApplication.company
    const group = groups.get(company.id) || { companyId: company.id, companyName: company.name, requests: [] as typeof requests }
    group.requests.push(request)
    groups.set(company.id, group)
  }
  return Array.from(groups.values()).map(group => ({
    companyId: group.companyId,
    companyName: group.companyName,
    applicantCount: group.requests.length,
    confirmedCount: group.requests.filter(request => request.status === 'PLACEMENT_CONFIRMED').length,
    inProgressCount: group.requests.filter(request => request.status !== 'PLACEMENT_CONFIRMED').length,
    pendingCount: group.requests.filter(request => !request.requestLetterParticipations.length && ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'RETURNED_FOR_REVISION'].includes(request.status)).length,
    issuedCount: new Set(group.requests.flatMap(request => request.requestLetterParticipations.map(item => item.requestLetterVersionId))).size,
    documentRequestId: group.requests.find(request => request.requestLetterParticipations.length)?.id || null,
    latestResponseStatus: group.requests.flatMap(request => request.requestLetterParticipations.flatMap(item => item.requestLetterVersion.responseDocuments)).at(0)?.status || null,
    students: group.requests.map(request => `${request.companyApplication.studentUser.prefix}${request.companyApplication.studentUser.firstName} ${request.companyApplication.studentUser.lastName}`)
  }))
})
