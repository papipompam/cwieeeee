export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const groupId = validatePositiveId(body?.groupId, 'รหัสกลุ่มนิเทศ')
  const companyId = validatePositiveId(body?.companyId, 'รหัสสถานประกอบการ')
  const group = await getSupervisionGroup(roundId, groupId)

  // Verify company belongs to this group
  const groupCompany = group.companies.find((c: any) => c.companyId === companyId)
  if (!groupCompany) {
    throw createError({
      statusCode: 400,
      message: 'สถานประกอบการนี้ไม่ได้อยู่ในกลุ่มนิเทศที่เลือก'
    })
  }

  // Parse date and period
  const scheduledDate = parseStrictDate(body?.scheduledDate, 'วันนัดหมายนิเทศ')
  const period = ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(body?.period) ? body.period : 'MORNING'
  const timeNote = typeof body?.timeNote === 'string' ? body.timeNote.trim() || null : null

  // Check unique company per round
  const existingApp = await prisma.supervisionAppointment.findFirst({
    where: {
      supervisionRoundId: roundId,
      companyId
    }
  })
  if (existingApp) {
    throw createError({
      statusCode: 409,
      message: 'สถานประกอบการนี้มีนัดหมายในตารางนิเทศของครั้งนี้แล้ว'
    })
  }

  // Snapshot company info
  const comp = groupCompany.company
  const companyAddress = [comp.addressNo, comp.moo ? `หมู่ ${comp.moo}` : '', comp.soi ? `ซอย${comp.soi}` : '', comp.street ? `ถนน${comp.street}` : '', comp.subdistrict ? `ต.${comp.subdistrict}` : '', comp.district ? `อ.${comp.district}` : '', comp.province ? `จ.${comp.province}` : '', comp.postalCode].filter(Boolean).join(' ')

  // Resolve student IDs
  let studentIds: number[] = Array.isArray(body?.studentUserIds)
    ? body.studentUserIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : []

  if (studentIds.length === 0) {
    const confirmedRequests = await prisma.cooperativeRequest.findMany({
      where: {
        status: 'PLACEMENT_CONFIRMED',
        companyApplication: {
          cooperativeCycleId: cycleId,
          companyId
        }
      },
      include: {
        companyApplication: {
          select: { studentUserId: true }
        }
      }
    })
    studentIds = confirmedRequests.map((r: any) => r.companyApplication.studentUserId)
  }

  // Server boundary validation: students must belong to confirmed placement in cycle & company
  const studentMap = await validateAppointmentStudents(cycleId, companyId, studentIds)

  // Resolve teacher IDs
  let teacherIds: number[] = Array.isArray(body?.teacherUserIds)
    ? body.teacherUserIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : []

  if (teacherIds.length === 0) {
    teacherIds = group.teachers.map((t: any) => t.teacherUserId)
  }

  // Server boundary validation: teachers must belong to group and be active
  await validateAppointmentTeachers(groupId, teacherIds)

  // Create draft appointment with transaction
  const appointment = await prisma.$transaction(async (tx: any) => {
    const app = await tx.supervisionAppointment.create({
      data: {
        supervisionRoundId: roundId,
        supervisionGroupId: groupId,
        companyId,
        companyName: comp.name,
        companyAddress,
        province: comp.province,
        latitude: comp.latitude,
        longitude: comp.longitude,
        scheduledDate,
        period,
        timeNote,
        status: 'DRAFT'
      }
    })

    await tx.supervisionAppointmentStudent.createMany({
      data: studentIds.map((sId: number) => ({
        appointmentId: app.id,
        studentUserId: sId,
        cooperativeRequestId: studentMap.get(sId)!
      }))
    })

    await tx.supervisionAppointmentTeacher.createMany({
      data: teacherIds.map((tId: number) => ({
        appointmentId: app.id,
        teacherUserId: tId
      }))
    })

    return app
  })

  const result = {
    id: appointment.id,
    supervisionRoundId: appointment.supervisionRoundId,
    supervisionGroupId: appointment.supervisionGroupId,
    companyId: appointment.companyId,
    companyName: appointment.companyName,
    province: appointment.province,
    scheduledDate: appointment.scheduledDate,
    period: appointment.period,
    timeNote: appointment.timeNote,
    status: appointment.status,
    createdAt: appointment.createdAt
  }
  return {
    ...result,
    appointment: result
  }
})
