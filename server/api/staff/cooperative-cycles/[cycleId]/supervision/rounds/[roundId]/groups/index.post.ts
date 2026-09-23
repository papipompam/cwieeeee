export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อกลุ่มนิเทศ' })
  }

  const readIds = (value: unknown, label: string) => {
    if (value === undefined) return []
    if (!Array.isArray(value)) {
      throw createError({ statusCode: 400, message: `${label}ต้องเป็นรายการ` })
    }
    return [...new Set(value.map(id => validatePositiveId(id, label)))]
  }

  const teacherUserIds = readIds(body?.teacherUserIds, 'รหัสอาจารย์')
  const companyIds = readIds(body?.companyIds, 'รหัสสถานประกอบการ')
  const rawCompanyPlans = body?.companyPlans
  const companyPlans = rawCompanyPlans === undefined
    ? []
    : Array.isArray(rawCompanyPlans)
      ? rawCompanyPlans.map((plan, index) => ({
          companyId: validatePositiveId(plan?.companyId, `สถานประกอบการลำดับ ${index + 1}`),
          scheduledDate: parseStrictDate(plan?.scheduledDate, `วันนิเทศของสถานประกอบการลำดับ ${index + 1}`),
          period: ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(plan?.period) ? plan.period : 'MORNING',
          timeNote: typeof plan?.timeNote === 'string' ? plan.timeNote.trim() || null : null,
          distanceKmFromPrevious: Math.max(0, Number(plan?.distanceKmFromPrevious) || 0)
        }))
      : (() => { throw createError({ statusCode: 400, message: 'แผนช่วงเวลานิเทศต้องเป็นรายการ' }) })()

  if (companyPlans.length > 0 && new Set(companyPlans.map(plan => plan.companyId)).size !== companyPlans.length) {
    throw createError({ statusCode: 400, message: 'ไม่สามารถกำหนดแผนนิเทศของสถานประกอบการซ้ำได้' })
  }
  if (companyPlans.length > 0 && (companyIds.length !== companyPlans.length || companyPlans.some(plan => !companyIds.includes(plan.companyId)))) {
    throw createError({ statusCode: 400, message: 'รายการสถานประกอบการและแผนช่วงเวลานิเทศไม่ตรงกัน' })
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
    plansInSlot.forEach((plan, index) => appointmentTeacherIds.set(
      plan.companyId,
      plansInSlot.length > 1 ? [teacherUserIds[index]!] : teacherUserIds
    ))
  }

  const budget = body?.budget && typeof body.budget === 'object'
    ? {
        startLocation: typeof body.budget.startLocation === 'string' && body.budget.startLocation.trim()
          ? body.budget.startLocation.trim()
          : 'มหาวิทยาลัย',
        fuelRate: Math.max(0, Number(body.budget.fuelRate) || 0),
        perDiemRate: Math.max(0, Number(body.budget.perDiemRate) || 0),
        perDiemDays: Math.max(0, Number(body.budget.perDiemDays) || 0),
        lodgingRate: Math.max(0, Number(body.budget.lodgingRate) || 0),
        nights: Math.max(0, Number(body.budget.nights) || 0),
        rooms: Math.max(0, Number(body.budget.rooms) || 0),
        note: typeof body.budget.note === 'string' ? body.budget.note.trim() || null : null
      }
    : null

  const group = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${19_100}, ${cycleId})`
    const round = await tx.supervisionRound.findUniqueOrThrow({ where: { id: roundId }, select: { status: true } })
    if (teacherUserIds.length === 0 || companyPlans.length === 0) {
      throw createError({ statusCode: 400, message: 'กรุณาเลือกอาจารย์และกำหนดแผนนิเทศของสถานประกอบการอย่างน้อยอย่างละ 1 รายการ' })
    }
    const existing = await tx.supervisionGroup.findFirst({
      where: { supervisionRoundId: roundId, name }
    })
    if (existing) {
      throw createError({ statusCode: 409, message: `มีกลุ่มนิเทศชื่อ "${name}" ในครั้งนี้แล้ว` })
    }

    if (teacherUserIds.length > 0) {
      const teachers = await tx.user.findMany({
        where: { id: { in: teacherUserIds }, role: 'TEACHER', isActive: true },
        select: { id: true }
      })
      if (teachers.length !== teacherUserIds.length) {
        throw createError({ statusCode: 400, message: 'มีอาจารย์ที่เลือกไม่พร้อมปฏิบัติงาน' })
      }

      const assignedTeachers = await tx.supervisionGroupTeacher.findMany({
        where: { supervisionRoundId: roundId, teacherUserId: { in: teacherUserIds } },
        include: { supervisionGroup: { select: { name: true } } }
      })
      if (assignedTeachers.length > 0) {
        throw createError({
          statusCode: 409,
          message: `อาจารย์ที่เลือกอยู่ในกลุ่ม "${assignedTeachers[0]!.supervisionGroup.name}" แล้วในครั้งนี้`
        })
      }
    }

    if (companyIds.length > 0) {
      const confirmedCompanies = await tx.company.findMany({
        where: {
          id: { in: companyIds },
          companyApplications: {
            some: {
              cooperativeCycleId: cycleId,
              cooperativeRequest: { is: { status: 'PLACEMENT_CONFIRMED' } }
            }
          }
        },
        select: { id: true }
      })
      if (confirmedCompanies.length !== companyIds.length) {
        throw createError({ statusCode: 400, message: 'มีสถานประกอบการที่ไม่มีนักศึกษายืนยันฝึกงานในรอบสหกิจนี้' })
      }

      const assignedCompanies = await tx.supervisionGroupCompany.findMany({
        where: { supervisionRoundId: roundId, companyId: { in: companyIds } },
        include: { supervisionGroup: { select: { name: true } } }
      })
      if (assignedCompanies.length > 0) {
        throw createError({
          statusCode: 409,
          message: `สถานประกอบการที่เลือกอยู่ในกลุ่ม "${assignedCompanies[0]!.supervisionGroup.name}" แล้วในครั้งนี้`
        })
      }
    }

    await lockTeacherScheduleSlots(tx, companyPlans.map(plan => ({
      scheduledDate: plan.scheduledDate,
      teacherUserIds: appointmentTeacherIds.get(plan.companyId)!
    })))
    for (const plan of companyPlans) {
      await checkTeacherScheduleConflict(
        cycleId,
        plan.scheduledDate,
        plan.period,
        appointmentTeacherIds.get(plan.companyId)!,
        undefined,
        tx
      )
    }

    const group = await tx.supervisionGroup.create({
      data: {
        supervisionRoundId: roundId,
        name,
        note: typeof body?.note === 'string' ? body.note.trim() : null,
        teachers: { create: teacherUserIds.map(teacherUserId => ({ supervisionRoundId: roundId, teacherUserId })) },
        companies: { create: companyIds.map(companyId => ({ supervisionRoundId: roundId, companyId })) }
      }
    })

    if (companyPlans.length > 0) {
      const companies = await tx.company.findMany({
        where: { id: { in: companyIds } },
        select: {
          id: true, name: true, addressNo: true, moo: true, soi: true, street: true,
          subdistrict: true, district: true, province: true, postalCode: true, latitude: true, longitude: true
        }
      })
      const companyById = new Map(companies.map(company => [company.id, company]))
      const confirmedRequests = await tx.cooperativeRequest.findMany({
        where: {
          status: 'PLACEMENT_CONFIRMED',
          companyApplication: { cooperativeCycleId: cycleId, companyId: { in: companyIds } }
        },
        select: { id: true, companyApplication: { select: { companyId: true, studentUserId: true } } }
      })
      const studentsByCompany = new Map<number, Array<{ studentUserId: number; requestId: number }>>()
      for (const request of confirmedRequests) {
        const list = studentsByCompany.get(request.companyApplication.companyId) || []
        list.push({ studentUserId: request.companyApplication.studentUserId, requestId: request.id })
        studentsByCompany.set(request.companyApplication.companyId, list)
      }

      const appointments = [] as Array<{ id: number; scheduledDate: Date; distanceKmFromPrevious: number }>
      for (const plan of companyPlans) {
        const company = companyById.get(plan.companyId)!
        const students = studentsByCompany.get(plan.companyId) || []
        const companyAddress = [company.addressNo, company.moo ? `หมู่ ${company.moo}` : '', company.soi ? `ซอย${company.soi}` : '', company.street ? `ถนน${company.street}` : '', company.subdistrict ? `ต.${company.subdistrict}` : '', company.district ? `อ.${company.district}` : '', company.province ? `จ.${company.province}` : '', company.postalCode].filter(Boolean).join(' ')
        const appointment = await tx.supervisionAppointment.create({
          data: {
            supervisionRoundId: roundId, supervisionGroupId: group.id, companyId: plan.companyId,
            companyName: company.name, companyAddress, province: company.province, latitude: company.latitude,
            longitude: company.longitude, scheduledDate: plan.scheduledDate, period: plan.period,
            timeNote: plan.timeNote, status: round.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
            publishedAt: round.status === 'DRAFT' ? null : new Date(),
            students: { create: students.map(student => ({ studentUserId: student.studentUserId, cooperativeRequestId: student.requestId })) },
            teachers: { create: appointmentTeacherIds.get(plan.companyId)!.map(teacherUserId => ({ teacherUserId })) }
          }
        })
        appointments.push({ id: appointment.id, scheduledDate: plan.scheduledDate, distanceKmFromPrevious: plan.distanceKmFromPrevious })
      }

      if (budget) {
        const appointmentsByDate = new Map<string, typeof appointments>()
        for (const appointment of appointments) {
          const key = appointment.scheduledDate.toISOString().slice(0, 10)
          appointmentsByDate.set(key, [...(appointmentsByDate.get(key) || []), appointment])
        }
        for (const dayAppointments of appointmentsByDate.values()) {
          await tx.supervisionTravelPlan.create({
            data: {
              supervisionRoundId: roundId, supervisionGroupId: group.id, travelDate: dayAppointments[0]!.scheduledDate,
              startLocation: budget.startLocation, fuelRate: budget.fuelRate, lodgingRate: budget.lodgingRate,
              lodgingNights: budget.nights, lodgingRooms: budget.rooms, note: budget.note,
              stops: { create: dayAppointments.map((appointment, index) => ({ appointmentId: appointment.id, sequence: index + 1, distanceKmFromPrevious: appointment.distanceKmFromPrevious })) },
              travellers: { create: teacherUserIds.map(teacherUserId => ({
                teacherUserId, perDiemRate: budget.perDiemRate, perDiemDays: budget.perDiemDays,
                lodgingRate: 0, nights: 0, personsPerRoom: 1
              })) }
            }
          })
        }
      }
    }

    return group
  })

  const result = {
    id: group.id,
    name: group.name,
    notes: group.note,
    note: group.note,
    supervisionRoundId: group.supervisionRoundId,
    createdAt: group.createdAt
  }
  return {
    ...result,
    group: result
  }
})
