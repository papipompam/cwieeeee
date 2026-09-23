export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const groupId = validatePositiveId(body?.groupId, 'รหัสกลุ่มนิเทศ')
  await getSupervisionGroup(roundId, groupId)

  const travelDate = parseStrictDate(body?.travelDate, 'วันที่เดินทาง')
  const startLocation = typeof body?.startLocation === 'string' && body.startLocation.trim()
    ? body.startLocation.trim()
    : 'มหาวิทยาลัย'
  const fuelRate = !isNaN(Number(body?.fuelRate)) && Number(body?.fuelRate) > 0 ? Number(body.fuelRate) : 4.0
  const manualFuelCost = Math.max(0, Number(body?.manualFuelCost) || 0)
  const manualPerDiemCost = Math.max(0, Number(body?.manualPerDiemCost) || 0)
  const manualLodgingCost = Math.max(0, Number(body?.manualLodgingCost) || 0)
  const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : null

  // Validate stops
  const rawStops = Array.isArray(body?.stops) ? body.stops : []
  const stopsData: Array<{ appointmentId: number; sequence: number; distanceKmFromPrevious: number }> = []

  // Check appointments belong to this group
  const groupAppointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionGroupId: groupId }
  })
  const validAppIds = new Set(groupAppointments.map((a: any) => a.id))

  const seenAppIds = new Set<number>()
  for (let i = 0; i < rawStops.length; i++) {
    const s = rawStops[i]
    const appointmentId = validatePositiveId(s.appointmentId, `จุดแวะที่ ${i + 1} รหัสนัดหมาย`)
    if (!validAppIds.has(appointmentId)) {
      throw createError({
        statusCode: 400,
        message: `นัดหมายรหัส ${appointmentId} ไม่ได้อยู่ในกลุ่มนิเทศนี้`
      })
    }
    if (seenAppIds.has(appointmentId)) {
      throw createError({
        statusCode: 400,
        message: 'ไม่สามารถระบุนัดหมายซ้ำในแผนเดินทางเดียวกันได้'
      })
    }
    seenAppIds.add(appointmentId)

    stopsData.push({
      appointmentId,
      sequence: i + 1,
      distanceKmFromPrevious: Math.max(0, Number(s.distanceKmFromPrevious) || 0)
    })
  }

  // Validate travellers
  const rawTravellers = Array.isArray(body?.travellers) ? body.travellers : []
  const travellersData: Array<{
    teacherUserId: number
    perDiemRate: number
    perDiemDays: number
    lodgingRate: number
    nights: number
    personsPerRoom: number
  }> = []

  const seenTeachers = new Set<number>()
  for (const t of rawTravellers) {
    const teacherUserId = validatePositiveId(t.teacherUserId, 'รหัสอาจารย์ผู้เดินทาง')
    if (seenTeachers.has(teacherUserId)) continue
    seenTeachers.add(teacherUserId)

    travellersData.push({
      teacherUserId,
      perDiemRate: Math.max(0, Number(t.perDiemRate) ?? 300),
      perDiemDays: Math.max(0, Number(t.perDiemDays) ?? 1),
      lodgingRate: Math.max(0, Number(t.lodgingRate) ?? 0),
      nights: Math.max(0, Number(t.nights) ?? 0),
      personsPerRoom: Math.max(1, Number(t.personsPerRoom) ?? 2)
    })
  }

  // Server boundary validation: travellers must belong to group and be active teachers
  await validateTravelPlanTravellers(groupId, travellersData.map(t => t.teacherUserId))

  const plan = await prisma.$transaction(async (tx: any) => {
    const p = await tx.supervisionTravelPlan.create({
      data: {
        supervisionRoundId: roundId,
        supervisionGroupId: groupId,
        travelDate,
        startLocation,
        fuelRate,
        manualFuelCost,
        manualPerDiemCost,
        manualLodgingCost,
        note
      }
    })

    if (stopsData.length > 0) {
      await tx.supervisionTravelStop.createMany({
        data: stopsData.map((s: any) => ({
          travelPlanId: p.id,
          appointmentId: s.appointmentId,
          sequence: s.sequence,
          distanceKmFromPrevious: s.distanceKmFromPrevious
        }))
      })
    }

    if (travellersData.length > 0) {
      await tx.supervisionTravelTraveller.createMany({
        data: travellersData.map((t: any) => ({
          travelPlanId: p.id,
          teacherUserId: t.teacherUserId,
          perDiemRate: t.perDiemRate,
          perDiemDays: t.perDiemDays,
          lodgingRate: t.lodgingRate,
          nights: t.nights,
          personsPerRoom: t.personsPerRoom
        }))
      })
    }

    return p
  })

  const calculation = calculateTravelBudget(
    fuelRate,
    stopsData,
    travellersData,
    undefined,
    { fuelCost: manualFuelCost, perDiemCost: manualPerDiemCost, lodgingCost: manualLodgingCost }
  )

  const result = {
    id: plan.id,
    supervisionRoundId: plan.supervisionRoundId,
    supervisionGroupId: plan.supervisionGroupId,
    travelDate: plan.travelDate,
    calculation,
    message: 'สร้างแผนเดินทางและประมาณการงบประมาณเรียบร้อยแล้ว'
  }

  return {
    ...result,
    travelPlan: result
  }
})
