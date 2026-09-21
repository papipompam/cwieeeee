export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)
  const activeLetterVersion = await prisma.requestLetterVersion.findFirst({
    where: {
      cooperativeRequestId: request.id,
      isActive: true
    },
    orderBy: { version: 'desc' },
    select: {
      version: true,
      source: true,
      letterNumber: true,
      issueDate: true,
      templateVersion: true,
      signerName: true,
      signerTitle: true,
      issuedByUser: {
        select: { prefix: true, firstName: true, lastName: true }
      }
    }
  })

  return {
    ...request,
    activeLetterVersion,
    letterCycle: {
      term: cycle.term,
      academicYear: cycle.academicYear,
      internshipHours: cycle.internshipHours,
      internshipStartDate: cycle.internshipStartDate,
      internshipEndDate: cycle.internshipEndDate
    }
  }
})
