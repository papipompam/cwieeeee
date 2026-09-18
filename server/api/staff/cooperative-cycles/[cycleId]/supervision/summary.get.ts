export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)

  // Find confirmed placements in this cycle
  const confirmedRequests = await prisma.cooperativeRequest.findMany({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: { cooperativeCycleId: cycleId }
    },
    select: {
      companyApplication: { select: { companyId: true } }
    }
  })
  const uniqueCompanyIds: number[] = Array.from(new Set(confirmedRequests.map((r: any) => r.companyApplication.companyId)))

  // Get rounds
  const rounds = await prisma.supervisionRound.findMany({
    where: { cooperativeCycleId: cycleId },
    orderBy: { roundNo: 'asc' },
    select: { id: true, roundNo: true }
  })

  // Check first/latest round for unassigned companies
  const activeRoundId = rounds[0]?.id

  let assignedCompanyIdsInRound: number[] = []
  if (activeRoundId) {
    const assigned = await prisma.supervisionGroupCompany.findMany({
      where: { supervisionRoundId: activeRoundId },
      select: { companyId: true }
    })
    assignedCompanyIdsInRound = assigned.map((a: { companyId: number }) => a.companyId)
  }
  const unassignedCompaniesCount = uniqueCompanyIds.filter((id: number) => !assignedCompanyIdsInRound.includes(id)).length

  // Counts across this cycle's rounds
  const [
    groupsCount,
    appointmentsDraftCount,
    appointmentsPublishedCount,
    appointmentsCompletedCount,
    travelPlans
  ] = await Promise.all([
    prisma.supervisionGroup.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId } }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId }, status: 'DRAFT' }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId }, status: { in: ['PUBLISHED', 'RESCHEDULED'] } }
    }),
    prisma.supervisionAppointment.count({
      where: { supervisionRound: { cooperativeCycleId: cycleId }, status: 'COMPLETED' }
    }),
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

  let totalBudgetEstimate = 0
  for (const plan of travelPlans) {
    const dist = plan.stops.reduce((sum: number, s: { distanceKmFromPrevious: number }) => sum + s.distanceKmFromPrevious, 0)
    const fuel = dist * plan.fuelRate
    const perDiem = plan.travellers.reduce((sum: number, t: { perDiemRate: number; perDiemDays: number }) => sum + t.perDiemRate * t.perDiemDays, 0)
    const lodging = plan.travellers.reduce(
      (sum: number, t: { lodgingRate: number; nights: number; personsPerRoom: number }) => sum + (t.lodgingRate * t.nights) / Math.max(1, t.personsPerRoom),
      0
    )
    totalBudgetEstimate += fuel + perDiem + lodging
  }

  return {
    roundsCount: rounds.length,
    groupsCount,
    confirmedCompaniesCount: uniqueCompanyIds.length,
    unassignedCompaniesCount,
    appointmentsDraftCount,
    appointmentsPublishedCount,
    appointmentsCompletedCount,
    appointmentsTotalCount: appointmentsDraftCount + appointmentsPublishedCount + appointmentsCompletedCount,
    travelPlansCount: travelPlans.length,
    totalBudgetEstimate: Math.round(totalBudgetEstimate * 100) / 100
  }
})
