export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  const body = await readBody(event)
  const data: any = {}

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name) {
      throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อกลุ่มนิเทศ' })
    }
    // Check duplicate name
    const existing = await prisma.supervisionGroup.findFirst({
      where: {
        supervisionRoundId: roundId,
        name,
        id: { not: groupId }
      }
    })
    if (existing) {
      throw createError({ statusCode: 409, message: `มีกลุ่มนิเทศชื่อ "${name}" ในครั้งนี้แล้ว` })
    }
    data.name = name
  }

  if (body?.note !== undefined) {
    data.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }

  const isPlanUpdate = body?.teacherUserIds !== undefined || body?.companyPlans !== undefined || body?.budget !== undefined
  if (!isPlanUpdate) {
    const updated = await prisma.supervisionGroup.update({ where: { id: groupId }, data })
    return { id: updated.id, name: updated.name, note: updated.note, updatedAt: updated.updatedAt }
  }

  if (!Array.isArray(body?.teacherUserIds) || !Array.isArray(body?.companyPlans)) {
    throw createError({ statusCode: 400, message: 'การแก้ไขแผนกลุ่มต้องระบุอาจารย์และสถานประกอบการให้ครบ' })
  }
  const groupAppointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionGroupId: groupId },
    select: { _count: { select: { studentEvaluations: true, companyEvaluations: true } } }
  })
  if (groupAppointments.some((appointment: any) => appointment._count.studentEvaluations || appointment._count.companyEvaluations)) {
    throw createError({ statusCode: 400, message: 'ไม่สามารถแก้ไขแผนกลุ่มที่มีผลประเมินแล้ว' })
  }

  const teacherUserIds: number[] = [...new Set<number>(body.teacherUserIds.map((id: unknown): number => validatePositiveId(id, 'รหัสอาจารย์')))]
  const companyPlans = body.companyPlans.map((plan: any, index: number) => ({
    companyId: validatePositiveId(plan?.companyId, `สถานประกอบการลำดับ ${index + 1}`),
    scheduledDate: parseStrictDate(plan?.scheduledDate, `วันนิเทศของสถานประกอบการลำดับ ${index + 1}`),
    period: ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(plan?.period) ? plan.period : 'MORNING',
    timeNote: typeof plan?.timeNote === 'string' ? plan.timeNote.trim() || null : null,
    distanceKmFromPrevious: Math.max(0, Number(plan?.distanceKmFromPrevious) || 0)
  }))
  const companyIds = companyPlans.map((plan: any) => plan.companyId)
  if (teacherUserIds.length === 0 || companyPlans.length === 0) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกอาจารย์และสถานประกอบการอย่างน้อยอย่างละ 1 รายการ' })
  }
  if (new Set(companyIds).size !== companyIds.length) {
    throw createError({ statusCode: 400, message: 'ไม่สามารถกำหนดแผนนิเทศของสถานประกอบการซ้ำได้' })
  }
  const appointmentTeacherIds = new Map<number, number[]>()
  const plansBySlot = new Map<string, typeof companyPlans>()
  for (const plan of companyPlans) {
    const key = `${plan.scheduledDate.toISOString().slice(0, 10)}:${plan.period}`
    plansBySlot.set(key, [...(plansBySlot.get(key) || []), plan])
  }
  for (const plansInSlot of plansBySlot.values()) {
    if (plansInSlot.length > teacherUserIds.length) {
      throw createError({ statusCode: 400, message: 'อาจารย์ที่เลือกมีไม่พอสำหรับสถานประกอบการในวันและช่วงเวลาเดียวกัน' })
    }
    plansInSlot.forEach((plan: typeof companyPlans[number], index: number) => appointmentTeacherIds.set(plan.companyId, plansInSlot.length > 1 ? [teacherUserIds[index]!] : teacherUserIds))
  }

  const budget = body?.budget && typeof body.budget === 'object'
    ? {
        startLocation: typeof body.budget.startLocation === 'string' && body.budget.startLocation.trim() ? body.budget.startLocation.trim() : 'มหาวิทยาลัย',
        fuelRate: Math.max(0, Number(body.budget.fuelRate) || 0),
        perDiemRate: Math.max(0, Number(body.budget.perDiemRate) || 0),
        perDiemDays: Math.max(0, Number(body.budget.perDiemDays) || 0),
        lodgingRate: Math.max(0, Number(body.budget.lodgingRate) || 0),
        nights: Math.max(0, Number(body.budget.nights) || 0),
        rooms: Math.max(0, Number(body.budget.rooms) || 0),
        note: typeof body.budget.note === 'string' ? body.budget.note.trim() || null : null
      }
    : null

  const updated = await prisma.$transaction(async (tx: any) => {
    const [teachers, companies, assignedTeachers, assignedCompanies] = await Promise.all([
      tx.user.findMany({ where: { id: { in: teacherUserIds }, role: 'TEACHER', isActive: true }, select: { id: true } }),
      tx.company.findMany({
        where: { id: { in: companyIds }, companyApplications: { some: { cooperativeCycleId: cycleId, cooperativeRequest: { is: { status: 'PLACEMENT_CONFIRMED' } } } } },
        select: { id: true, name: true, addressNo: true, moo: true, soi: true, street: true, subdistrict: true, district: true, province: true, postalCode: true, latitude: true, longitude: true }
      }),
      tx.supervisionGroupTeacher.findMany({ where: { supervisionRoundId: roundId, teacherUserId: { in: teacherUserIds }, supervisionGroupId: { not: groupId } }, include: { supervisionGroup: { select: { name: true } } } }),
      tx.supervisionGroupCompany.findMany({ where: { supervisionRoundId: roundId, companyId: { in: companyIds }, supervisionGroupId: { not: groupId } }, include: { supervisionGroup: { select: { name: true } } } })
    ])
    if (teachers.length !== teacherUserIds.length) throw createError({ statusCode: 400, message: 'มีอาจารย์ที่เลือกไม่พร้อมปฏิบัติงาน' })
    if (companies.length !== companyIds.length) throw createError({ statusCode: 400, message: 'มีสถานประกอบการที่ไม่มีนักศึกษายืนยันฝึกงานในรอบสหกิจนี้' })
    if (assignedTeachers.length) throw createError({ statusCode: 409, message: `อาจารย์ที่เลือกอยู่ในกลุ่ม "${assignedTeachers[0]!.supervisionGroup.name}" แล้วในครั้งนี้` })
    if (assignedCompanies.length) throw createError({ statusCode: 409, message: `สถานประกอบการที่เลือกอยู่ในกลุ่ม "${assignedCompanies[0]!.supervisionGroup.name}" แล้วในครั้งนี้` })

    const appointmentIds = await tx.supervisionAppointment.findMany({
      where: { supervisionGroupId: groupId },
      select: { id: true }
    })
    await lockTeacherScheduleSlots(tx, companyPlans.map((plan: typeof companyPlans[number]) => ({
      scheduledDate: plan.scheduledDate,
      teacherUserIds: appointmentTeacherIds.get(plan.companyId)!
    })))
    for (const plan of companyPlans) {
      await checkTeacherScheduleConflict(
        cycleId,
        plan.scheduledDate,
        plan.period,
        appointmentTeacherIds.get(plan.companyId)!,
        appointmentIds.map((appointment: { id: number }) => appointment.id),
        tx
      )
    }

    await tx.supervisionTravelPlan.deleteMany({ where: { supervisionGroupId: groupId } })
    await tx.supervisionAppointment.deleteMany({ where: { supervisionGroupId: groupId } })
    await tx.supervisionGroupTeacher.deleteMany({ where: { supervisionGroupId: groupId } })
    await tx.supervisionGroupCompany.deleteMany({ where: { supervisionGroupId: groupId } })
    const savedGroup = await tx.supervisionGroup.update({ where: { id: groupId }, data: { ...data, teachers: { create: teacherUserIds.map(teacherUserId => ({ supervisionRoundId: roundId, teacherUserId })) }, companies: { create: companyIds.map((companyId: number) => ({ supervisionRoundId: roundId, companyId })) } } })

    const confirmedRequests = await tx.cooperativeRequest.findMany({ where: { status: 'PLACEMENT_CONFIRMED', companyApplication: { cooperativeCycleId: cycleId, companyId: { in: companyIds } } }, select: { id: true, companyApplication: { select: { companyId: true, studentUserId: true } } } })
    const studentsByCompany = new Map<number, Array<{ studentUserId: number; requestId: number }>>()
    for (const request of confirmedRequests) studentsByCompany.set(request.companyApplication.companyId, [...(studentsByCompany.get(request.companyApplication.companyId) || []), { studentUserId: request.companyApplication.studentUserId, requestId: request.id }])
    const companyById = new Map<number, any>(companies.map((company: any) => [company.id, company]))
    const appointments: Array<{ id: number; scheduledDate: Date; distanceKmFromPrevious: number }> = []
    for (const plan of companyPlans) {
      const company = companyById.get(plan.companyId)!
      const companyAddress = [company.addressNo, company.moo ? `หมู่ ${company.moo}` : '', company.soi ? `ซอย${company.soi}` : '', company.street ? `ถนน${company.street}` : '', company.subdistrict ? `ต.${company.subdistrict}` : '', company.district ? `อ.${company.district}` : '', company.province ? `จ.${company.province}` : '', company.postalCode].filter(Boolean).join(' ')
      const appointment = await tx.supervisionAppointment.create({ data: { supervisionRoundId: roundId, supervisionGroupId: groupId, companyId: plan.companyId, companyName: company.name, companyAddress, province: company.province, latitude: company.latitude, longitude: company.longitude, scheduledDate: plan.scheduledDate, period: plan.period, timeNote: plan.timeNote, status: 'PUBLISHED', publishedAt: new Date(), students: { create: (studentsByCompany.get(plan.companyId) || []).map(student => ({ studentUserId: student.studentUserId, cooperativeRequestId: student.requestId })) }, teachers: { create: appointmentTeacherIds.get(plan.companyId)!.map(teacherUserId => ({ teacherUserId })) } } })
      appointments.push({ id: appointment.id, scheduledDate: plan.scheduledDate, distanceKmFromPrevious: plan.distanceKmFromPrevious })
    }
    if (budget) {
      const byDate = new Map<string, typeof appointments>()
      for (const appointment of appointments) {
        const key = appointment.scheduledDate.toISOString().slice(0, 10)
        byDate.set(key, [...(byDate.get(key) || []), appointment])
      }
      for (const dayAppointments of byDate.values()) await tx.supervisionTravelPlan.create({ data: { supervisionRoundId: roundId, supervisionGroupId: groupId, travelDate: dayAppointments[0]!.scheduledDate, startLocation: budget.startLocation, fuelRate: budget.fuelRate, lodgingRate: budget.lodgingRate, lodgingNights: budget.nights, lodgingRooms: budget.rooms, note: budget.note, stops: { create: dayAppointments.map((appointment, index) => ({ appointmentId: appointment.id, sequence: index + 1, distanceKmFromPrevious: appointment.distanceKmFromPrevious })) }, travellers: { create: teacherUserIds.map(teacherUserId => ({ teacherUserId, perDiemRate: budget.perDiemRate, perDiemDays: budget.perDiemDays, lodgingRate: 0, nights: 0, personsPerRoom: 1 })) } } })
    }
    return savedGroup
  })

  return {
    id: updated.id,
    name: updated.name,
    note: updated.note,
    updatedAt: updated.updatedAt
  }
})
