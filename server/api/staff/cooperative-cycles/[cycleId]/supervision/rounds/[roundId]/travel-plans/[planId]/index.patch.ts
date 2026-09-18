export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const planId = validatePositiveId(getRouterParam(event, 'planId'), 'รหัสแผนเดินทาง')

  await getSupervisionRound(cycleId, roundId)

  const existing = await prisma.supervisionTravelPlan.findFirst({
    where: { id: planId, supervisionRoundId: roundId }
  })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลแผนเดินทาง' })
  }

  const body = await readBody(event)
  const data: any = {}

  if (body?.travelDate) {
    data.travelDate = parseStrictDate(body.travelDate, 'วันที่เดินทาง')
  }
  if (typeof body?.startLocation === 'string' && body.startLocation.trim()) {
    data.startLocation = body.startLocation.trim()
  }
  if (!isNaN(Number(body?.fuelRate)) && Number(body?.fuelRate) > 0) {
    data.fuelRate = Number(body.fuelRate)
  }
  if (body?.note !== undefined) {
    data.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }

  const updatedPlan = await prisma.$transaction(async (tx: any) => {
    const p = await tx.supervisionTravelPlan.update({
      where: { id: planId },
      data
    })

    if (Array.isArray(body?.stops)) {
      await tx.supervisionTravelStop.deleteMany({
        where: { travelPlanId: planId }
      })

      const groupAppointments = await tx.supervisionAppointment.findMany({
        where: { supervisionGroupId: existing.supervisionGroupId }
      })
      const validAppIds = new Set(groupAppointments.map((a: any) => a.id))
      const seenAppIds = new Set<number>()

      const stopsData: Array<{ appointmentId: number; sequence: number; distanceKmFromPrevious: number }> = []
      for (let i = 0; i < body.stops.length; i++) {
        const s = body.stops[i]
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

      if (stopsData.length > 0) {
        await tx.supervisionTravelStop.createMany({
          data: stopsData.map((s: any) => ({
            travelPlanId: planId,
            appointmentId: s.appointmentId,
            sequence: s.sequence,
            distanceKmFromPrevious: s.distanceKmFromPrevious
          }))
        })
      }
    }

    if (Array.isArray(body?.travellers)) {
      await tx.supervisionTravelTraveller.deleteMany({
        where: { travelPlanId: planId }
      })

      const seenTeachers = new Set<number>()
      const travellersData: Array<{
        teacherUserId: number
        perDiemRate: number
        perDiemDays: number
        lodgingRate: number
        nights: number
        personsPerRoom: number
      }> = []

      for (const t of body.travellers) {
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

      await validateTravelPlanTravellers(existing.supervisionGroupId, travellersData.map(t => t.teacherUserId), tx)

      if (travellersData.length > 0) {
        await tx.supervisionTravelTraveller.createMany({
          data: travellersData.map((t: any) => ({
            travelPlanId: planId,
            teacherUserId: t.teacherUserId,
            perDiemRate: t.perDiemRate,
            perDiemDays: t.perDiemDays,
            lodgingRate: t.lodgingRate,
            nights: t.nights,
            personsPerRoom: t.personsPerRoom
          }))
        })
      }
    }

    return p
  })

  return {
    id: updatedPlan.id,
    travelDate: updatedPlan.travelDate,
    updatedAt: updatedPlan.updatedAt,
    message: 'ปรับปรุงแผนเดินทางเรียบร้อยแล้ว'
  }
})
