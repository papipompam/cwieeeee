export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event)

  const [
    cohortStudentsCount,
    studentsWithApplicationCount,
    submittedRequestsCount,
    letterReadyRequestsCount,
    pendingReviewRequestsCount,
    returnedRequestsCount,
    confirmedPlacementsCount,
    rejectedRequestsCount
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: 'STUDENT',
        cohortYear: cycle.cohortYear
      }
    }),
    prisma.companyApplication.groupBy({
      by: ['studentUserId'],
      where: { cooperativeCycleId: cycleId }
    }).then(groups => groups.length),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: { in: ['SUBMITTED', 'STAFF_PROCESSING'] }
      }
    }),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: 'LETTER_READY'
      }
    }),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: 'DOCUMENT_UNDER_REVIEW'
      }
    }),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: 'RETURNED_FOR_REVISION'
      }
    }),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: 'PLACEMENT_CONFIRMED'
      }
    }),
    prisma.cooperativeRequest.count({
      where: {
        companyApplication: { cooperativeCycleId: cycleId },
        status: 'REJECTED'
      }
    })
  ])

  return {
    cohortStudentsCount,
    studentsWithApplicationCount,
    submittedRequestsCount,
    letterReadyRequestsCount,
    pendingReviewRequestsCount,
    returnedRequestsCount,
    confirmedPlacementsCount,
    rejectedRequestsCount
  }
})
