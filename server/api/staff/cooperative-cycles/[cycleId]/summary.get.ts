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
    rejectedRequestsCount,
    supervisionGroupsCount,
    supervisionAppointmentsCount,
    supervisionPublishedAppointmentsCount,
    supervisionCompletedAppointmentsCount,
    supervisionAssignedTeachersCount,
    supervisionTravelPlans
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
    }),
    prisma.supervisionGroup.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId } }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId } }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId }, status: { in: ['PUBLISHED', 'RESCHEDULED'] } }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId }, status: 'COMPLETED' }
    }),
    prisma.supervisionGroupTeacher.groupBy({
      by: ['teacherUserId'],
      where: { supervisionRound: { cooperativeCycleId: cycleId } }
    }).then(g => g.length),
    prisma.supervisionTravelPlan.findMany({
      where: { supervisionRound: { cooperativeCycleId: cycleId } },
      select: {
        fuelRate: true,
        stops: { select: { distanceKmFromPrevious: true } },
        travellers: {
          select: {
            perDiemRate: true,
            perDiemDays: true,
            lodgingRate: true,
            nights: true,
            personsPerRoom: true
          }
        }
      }
    })
  ])

  let supervisionBudgetEstimate = 0
  for (const plan of supervisionTravelPlans) {
    const dist = plan.stops.reduce((sum, s) => sum + s.distanceKmFromPrevious, 0)
    const fuel = dist * plan.fuelRate
    const perDiem = plan.travellers.reduce((sum, t) => sum + t.perDiemRate * t.perDiemDays, 0)
    const lodging = plan.travellers.reduce(
      (sum, t) => sum + (t.lodgingRate * t.nights) / Math.max(1, t.personsPerRoom),
      0
    )
    supervisionBudgetEstimate += fuel + perDiem + lodging
  }

  return {
    cohortStudentsCount,
    studentsWithApplicationCount,
    submittedRequestsCount,
    letterReadyRequestsCount,
    pendingReviewRequestsCount,
    returnedRequestsCount,
    confirmedPlacementsCount,
    rejectedRequestsCount,
    supervisionGroupsCount,
    supervisionAppointmentsCount,
    supervisionPublishedAppointmentsCount,
    supervisionCompletedAppointmentsCount,
    supervisionAssignedTeachersCount,
    supervisionTravelPlansCount: supervisionTravelPlans.length,
    supervisionBudgetEstimate: Math.round(supervisionBudgetEstimate * 100) / 100
  }
})
