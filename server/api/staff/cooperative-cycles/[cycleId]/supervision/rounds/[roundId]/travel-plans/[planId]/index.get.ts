export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const planId = validatePositiveId(getRouterParam(event, 'planId'), 'รหัสแผนเดินทาง')

  await getSupervisionRound(cycleId, roundId)

  const p = await prisma.supervisionTravelPlan.findFirst({
    where: { id: planId, supervisionRoundId: roundId },
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
              companyAddress: true,
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
              lastName: true,
              phone: true,
              gender: true
            }
          }
        }
      }
    }
  })

  if (!p) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลแผนเดินทาง' })
  }

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
