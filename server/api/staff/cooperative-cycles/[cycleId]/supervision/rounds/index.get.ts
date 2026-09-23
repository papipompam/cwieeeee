export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)

  const rounds = await prisma.supervisionRound.findMany({
    where: { cooperativeCycleId: cycleId, roundNo: { in: [1, 2] } },
    orderBy: { roundNo: 'asc' },
    include: {
      groups: {
        select: { id: true }
      },
      appointments: {
        select: { id: true, status: true }
      },
      travelPlans: {
        select: {
          id: true,
          fuelRate: true,
          manualFuelCost: true,
          manualPerDiemCost: true,
          lodgingRate: true,
          lodgingNights: true,
          lodgingRooms: true,
          manualLodgingCost: true,
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
      }
    }
  })

  return {
    rounds: rounds.map((r) => {
      let budgetEstimate = 0
      for (const plan of r.travelPlans) {
        const dist = plan.stops.reduce((sum: number, s: { distanceKmFromPrevious: number }) => sum + s.distanceKmFromPrevious, 0)
        const fuel = plan.manualFuelCost ?? dist * plan.fuelRate
        const perDiem = plan.manualPerDiemCost ?? plan.travellers.reduce((sum: number, t: { perDiemRate: number; perDiemDays: number }) => sum + t.perDiemRate * t.perDiemDays, 0)
        const lodging = plan.manualLodgingCost ?? (plan.lodgingRooms > 0
          ? plan.lodgingRate * plan.lodgingNights * plan.lodgingRooms
          : plan.travellers.reduce(
          (sum: number, t: { lodgingRate: number; nights: number; personsPerRoom: number }) => sum + (t.lodgingRate * t.nights) / Math.max(1, t.personsPerRoom),
          0
        ))
        budgetEstimate += fuel + perDiem + lodging
      }

      return {
        id: r.id,
        roundNo: r.roundNo,
        title: `นิเทศครั้งที่ ${r.roundNo}`,
        status: r.status,
        groupsCount: r.groups.length,
        appointmentsCount: r.appointments.length,
        appointmentsPublishedCount: r.appointments.filter(a => a.status === 'PUBLISHED' || a.status === 'RESCHEDULED').length,
        appointmentsCompletedCount: r.appointments.filter(a => a.status === 'COMPLETED').length,
        travelPlansCount: r.travelPlans.length,
        budgetEstimate: Math.round(budgetEstimate * 100) / 100,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }
    })
  }
})
