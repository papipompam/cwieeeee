export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')
  const body = await readBody(event)
  if (!Array.isArray(body?.teacherUserIds) || !Array.isArray(body?.companyPlans)) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุอาจารย์และแผนนิเทศให้ครบ' })
  }
  const teacherUserIds = [...new Set<number>(body.teacherUserIds.map((id: unknown) => validatePositiveId(id, 'รหัสอาจารย์')))]
  const plans: Array<{ companyId: number, scheduledDate: Date, period: string, timeNote: string | null }> = body.companyPlans.map((item: Record<string, unknown>) => ({
    companyId: validatePositiveId(item?.companyId, 'รหัสสถานประกอบการ'),
    scheduledDate: parseStrictDate(item?.scheduledDate, 'วันที่นิเทศ'),
    period: typeof item?.period === 'string' && ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(item.period) ? item.period : '',
    timeNote: typeof item?.timeNote === 'string' ? item.timeNote.trim() || null : null
  }))
  if (!teacherUserIds.length || !plans.length || plans.some(plan => !plan.period) || new Set(plans.map(plan => plan.companyId)).size !== plans.length) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกอาจารย์ สถานประกอบการ และช่วงเวลาที่ถูกต้องโดยไม่ซ้ำกัน' })
  }

  const group = await prisma.supervisionGroup.findFirst({ where: { id: groupId, teachers: { some: { teacherUserId: teacher.id } } }, select: { supervisionRound: { select: { cooperativeCycleId: true } } } })
  if (!group) throw createError({ statusCode: 404, message: 'ไม่พบกลุ่มนิเทศที่คุณรับผิดชอบ' })
  const cycleId = group.supervisionRound.cooperativeCycleId

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${19_100}, ${cycleId})`
    const current = await tx.supervisionGroup.findFirst({
      where: { id: groupId, teachers: { some: { teacherUserId: teacher.id } }, supervisionRound: { status: 'PUBLISHED', cooperativeCycle: { status: { not: 'CLOSED' } } } },
      include: {
        supervisionRound: { select: { id: true, roundNo: true } },
        teachers: { select: { teacherUserId: true } },
        appointments: { include: { students: { select: { studentUserId: true } }, teachers: { select: { teacherUserId: true } }, _count: { select: { studentEvaluations: true, companyEvaluations: true, photos: true, travelStops: true } } } },
        travelPlans: { select: { id: true } }
      }
    })
    if (!current) throw createError({ statusCode: 409, message: 'กลุ่มนิเทศไม่พร้อมแก้ไข หรือสิทธิ์ของคุณเปลี่ยนไปแล้ว' })
    if (current.travelPlans.length || current.appointments.some(item => item._count.studentEvaluations || item._count.companyEvaluations || item._count.photos || item._count.travelStops || !['PUBLISHED', 'RESCHEDULED'].includes(item.status))) {
      throw createError({ statusCode: 409, message: 'ไม่สามารถแก้ตารางที่มีงบประมาณ ผลประเมิน รูปภาพ หรือจบการนิเทศแล้ว' })
    }
    const sameTeachers = current.teachers.length === teacherUserIds.length && current.teachers.every(item => teacherUserIds.includes(item.teacherUserId))
    const samePlans = current.appointments.length === plans.length && plans.every(plan => current.appointments.some(item => item.companyId === plan.companyId && item.scheduledDate.getTime() === plan.scheduledDate.getTime() && item.period === plan.period && item.timeNote === plan.timeNote))
    if (sameTeachers && samePlans) return { success: true, unchanged: true }
    const roundId = current.supervisionRound.id
    const [validTeachers, assignedTeachers, assignedCompanies, requests] = await Promise.all([
      tx.user.findMany({ where: { id: { in: teacherUserIds }, role: 'TEACHER', isActive: true }, select: { id: true } }),
      tx.supervisionGroupTeacher.findMany({ where: { supervisionRoundId: roundId, supervisionGroupId: { not: groupId }, teacherUserId: { in: teacherUserIds } }, select: { teacherUserId: true } }),
      tx.supervisionGroupCompany.findMany({ where: { supervisionRoundId: roundId, supervisionGroupId: { not: groupId }, companyId: { in: plans.map(plan => plan.companyId) } }, select: { companyId: true } }),
      tx.cooperativeRequest.findMany({ where: { status: 'PLACEMENT_CONFIRMED', companyApplication: { cooperativeCycleId: cycleId, companyId: { in: plans.map(plan => plan.companyId) } } }, select: { id: true, companyApplication: { select: { companyId: true, studentUserId: true, company: true } } } })
    ])
    if (validTeachers.length !== teacherUserIds.length || assignedTeachers.length || assignedCompanies.length) throw createError({ statusCode: 409, message: 'อาจารย์หรือสถานประกอบการที่เลือกไม่พร้อมจัดกลุ่มแล้ว' })
    const companyIds = new Set(requests.map(item => item.companyApplication.companyId))
    if (plans.some(plan => !companyIds.has(plan.companyId))) throw createError({ statusCode: 400, message: 'มีสถานประกอบการที่ไม่มีนักศึกษายืนยันที่ฝึกในรอบนี้' })

    const plansBySlot = new Map<string, typeof plans>()
    for (const plan of plans) {
      const key = `${plan.scheduledDate.toISOString().slice(0, 10)}:${plan.period}`
      plansBySlot.set(key, [...(plansBySlot.get(key) || []), plan])
    }
    const appointmentTeacherIds = new Map<number, number[]>()
    for (const slotPlans of plansBySlot.values()) {
      if (slotPlans.length > teacherUserIds.length) throw createError({ statusCode: 400, message: 'อาจารย์ไม่พอสำหรับนัดหมายในวันและช่วงเวลาเดียวกัน' })
      slotPlans.forEach((plan, index) => appointmentTeacherIds.set(plan.companyId, slotPlans.length > 1 ? [teacherUserIds[index]!] : teacherUserIds))
    }
    await lockTeacherScheduleSlots(tx, plans.map(plan => ({ scheduledDate: plan.scheduledDate, teacherUserIds: appointmentTeacherIds.get(plan.companyId)! })))
    for (const plan of plans) {
      await checkTeacherScheduleConflict(cycleId, plan.scheduledDate, plan.period, appointmentTeacherIds.get(plan.companyId)!, current.appointments.map(item => item.id), tx)
    }
    const proposed = plans.map(plan => ({ id: plan.companyId, companyName: requests.find(item => item.companyApplication.companyId === plan.companyId)!.companyApplication.company.name, scheduledDate: plan.scheduledDate, period: plan.period, teachers: appointmentTeacherIds.get(plan.companyId)!.map(teacherUserId => ({ teacherUserId })) }))
    checkIntraBatchTeacherConflict(proposed)

    const oldAppointments = new Map(current.appointments.map(item => [item.companyId, item]))
    const selectedCompanies = new Set(plans.map(plan => plan.companyId))
    for (const appointment of current.appointments) {
      if (!selectedCompanies.has(appointment.companyId)) await tx.supervisionAppointment.delete({ where: { id: appointment.id } })
    }
    await tx.supervisionGroupTeacher.deleteMany({ where: { supervisionGroupId: groupId } })
    await tx.supervisionGroupCompany.deleteMany({ where: { supervisionGroupId: groupId } })
    await tx.supervisionGroupTeacher.createMany({ data: teacherUserIds.map(teacherUserId => ({ supervisionRoundId: roundId, supervisionGroupId: groupId, teacherUserId })) })
    await tx.supervisionGroupCompany.createMany({ data: plans.map(plan => ({ supervisionRoundId: roundId, supervisionGroupId: groupId, companyId: plan.companyId })) })

    const affectedStudentIds = new Set(current.appointments.flatMap(item => item.students.map(student => student.studentUserId)))
    for (const plan of plans) {
      const teacherIds = appointmentTeacherIds.get(plan.companyId)!
      const old = oldAppointments.get(plan.companyId)
      if (old) {
        const scheduleChanged = old.scheduledDate.getTime() !== plan.scheduledDate.getTime() || old.period !== plan.period || old.timeNote !== plan.timeNote
        if (scheduleChanged) await tx.supervisionAppointment.update({ where: { id: old.id }, data: { scheduledDate: plan.scheduledDate, period: plan.period, timeNote: plan.timeNote, status: 'RESCHEDULED', changeReason: 'อาจารย์แก้ไขตารางนิเทศ' } })
        await tx.supervisionAppointmentTeacher.deleteMany({ where: { appointmentId: old.id } })
        await tx.supervisionAppointmentTeacher.createMany({ data: teacherIds.map(teacherUserId => ({ appointmentId: old.id, teacherUserId })) })
      } else {
        const company = requests.find(item => item.companyApplication.companyId === plan.companyId)!.companyApplication.company
        await tx.supervisionAppointment.create({ data: {
          supervisionRoundId: roundId, supervisionGroupId: groupId, companyId: company.id, companyName: company.name,
          companyAddress: [company.addressNo, company.moo ? `หมู่ ${company.moo}` : '', company.soi ? `ซอย${company.soi}` : '', company.street ? `ถนน${company.street}` : '', company.subdistrict ? `ต.${company.subdistrict}` : '', company.district ? `อ.${company.district}` : '', company.province ? `จ.${company.province}` : '', company.postalCode].filter(Boolean).join(' '),
          province: company.province, latitude: company.latitude, longitude: company.longitude,
          scheduledDate: plan.scheduledDate, period: plan.period, timeNote: plan.timeNote, status: 'PUBLISHED', publishedAt: new Date(),
          students: { create: requests.filter(item => item.companyApplication.companyId === company.id).map(item => ({ studentUserId: item.companyApplication.studentUserId, cooperativeRequestId: item.id })) },
          teachers: { create: teacherIds.map(teacherUserId => ({ teacherUserId })) }
        } })
      }
      for (const request of requests.filter(item => item.companyApplication.companyId === plan.companyId)) affectedStudentIds.add(request.companyApplication.studentUserId)
    }
    const affectedTeacherIds = new Set([...current.teachers.map(item => item.teacherUserId), ...teacherUserIds])
    await tx.notification.createMany({ data: [
      ...[...affectedStudentIds].map(userId => ({ userId, title: 'ตารางนิเทศมีการเปลี่ยนแปลง', message: `โปรดตรวจตารางนิเทศครั้งที่ ${current.supervisionRound.roundNo} อีกครั้ง`, link: '/student/visits' })),
      ...[...affectedTeacherIds].map(userId => ({ userId, title: 'ตารางนิเทศมีการเปลี่ยนแปลง', message: `โปรดตรวจตารางนิเทศครั้งที่ ${current.supervisionRound.roundNo} อีกครั้ง`, link: '/teacher/visits' }))
    ] })
    return { success: true }
  })
})
