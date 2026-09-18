export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const query = getQuery(event)
  const groupId = query.groupId ? Number(query.groupId) : undefined

  const where: any = {
    supervisionRoundId: roundId
  }
  if (groupId) {
    where.supervisionGroupId = groupId
  }

  const plans = await prisma.supervisionTravelPlan.findMany({
    where,
    orderBy: { travelDate: 'asc' },
    include: {
      supervisionGroup: {
        select: { id: true, name: true }
      },
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          appointment: {
            select: {
              id: true,
              companyName: true,
              province: true,
              scheduledDate: true,
              period: true,
              status: true
            }
          }
        }
      },
      travellers: {
        include: {
          teacherUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  })

  const travelPlans = plans.map((p: any) => {
    const calculation = calculateTravelBudget(
      p.fuelRate,
      p.stops,
      p.travellers.map((t: any) => ({
        teacherUserId: t.teacherUserId,
        teacherName: `${t.teacherUser.prefix || ''}${t.teacherUser.firstName} ${t.teacherUser.lastName}`.trim(),
        perDiemRate: t.perDiemRate,
        perDiemDays: t.perDiemDays,
        lodgingRate: t.lodgingRate,
        nights: t.nights,
        personsPerRoom: t.personsPerRoom
      })),
      { rate: p.lodgingRate, nights: p.lodgingNights, rooms: p.lodgingRooms }
    )

    return {
      id: p.id,
      supervisionRoundId: p.supervisionRoundId,
      supervisionGroupId: p.supervisionGroupId,
      group: p.supervisionGroup,
      travelDate: p.travelDate,
      startLocation: p.startLocation,
      fuelRate: p.fuelRate,
      lodgingRate: p.lodgingRate,
      lodgingNights: p.lodgingNights,
      lodgingRooms: p.lodgingRooms,
      note: p.note,
      stopsCount: p.stops.length,
      travellersCount: p.travellers.length,
      stops: p.stops.map((s: any) => ({
        id: s.id,
        sequence: s.sequence,
        distanceKmFromPrevious: s.distanceKmFromPrevious,
        appointment: s.appointment
      })),
      travellers: p.travellers.map((t: any) => ({
        id: t.id,
        teacherUserId: t.teacherUserId,
        teacher: t.teacherUser,
        perDiemRate: t.perDiemRate,
        perDiemDays: t.perDiemDays,
        lodgingRate: t.lodgingRate,
        nights: t.nights,
        personsPerRoom: t.personsPerRoom
      })),
      calculation,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }
  })

  return { travelPlans }
})
