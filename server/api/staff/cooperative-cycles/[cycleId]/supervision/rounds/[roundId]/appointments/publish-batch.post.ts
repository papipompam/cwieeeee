export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const appointmentIds: number[] = Array.isArray(body?.appointmentIds)
    ? body.appointmentIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : []

  if (appointmentIds.length === 0) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกนัดหมายที่ต้องการเผยแพร่' })
  }

  const appointments = await prisma.supervisionAppointment.findMany({
    where: {
      id: { in: appointmentIds }
    },
    include: {
      students: true,
      teachers: {
        include: {
          teacherUser: {
            select: { id: true, prefix: true, firstName: true, lastName: true }
          }
        }
      }
    }
  })

  if (appointments.length !== appointmentIds.length) {
    throw createError({ statusCode: 400, message: 'พบนัดหมายที่ไม่ถูกต้องหรือไม่พบข้อมูลในระบบ' })
  }

  // Validate each appointment
  for (const app of appointments) {
    if (app.supervisionRoundId !== roundId) {
      throw createError({
        statusCode: 400,
        message: `นัดหมาย "${app.companyName}" ไม่ได้อยู่ในครั้งที่นิเทศนี้`
      })
    }
    if (app.status !== 'DRAFT') {
      throw createError({
        statusCode: 409,
        message: `นัดหมาย "${app.companyName}" มีสถานะเป็น "${app.status}" ไม่ใช่ฉบับร่าง`
      })
    }
    if (app.students.length === 0) {
      throw createError({
        statusCode: 400,
        message: `นัดหมาย "${app.companyName}" ไม่มีนักศึกษา`
      })
    }
    if (app.teachers.length === 0) {
      throw createError({
        statusCode: 400,
        message: `นัดหมาย "${app.companyName}" ไม่มีอาจารย์นิเทศ`
      })
    }
  }

  // Check intra-batch conflicts between the selected draft appointments
  checkIntraBatchTeacherConflict(appointments as any)

  const now = new Date()
  await prisma.$transaction(async (tx: any) => {
    await lockTeacherScheduleSlots(tx, appointments.map((app: any) => ({
      scheduledDate: app.scheduledDate,
      teacherUserIds: app.teachers.map((teacher: any) => teacher.teacherUserId)
    })))

    // Check conflicts across cycle inside transaction
    for (const app of appointments) {
      const teacherIds = app.teachers.map((t: any) => t.teacherUserId)
      await checkTeacherScheduleConflict(cycleId, app.scheduledDate, app.period, teacherIds, app.id, tx)
    }

    const updateResult = await tx.supervisionAppointment.updateMany({
      where: {
        id: { in: appointmentIds },
        supervisionRoundId: roundId,
        status: 'DRAFT'
      },
      data: {
        status: 'PUBLISHED',
        publishedAt: now
      }
    })

    if (updateResult.count !== appointmentIds.length) {
      throw createError({
        statusCode: 409,
        message: 'มีบางนัดหมายที่สถานะเปลี่ยนแปลงไปแล้ว ไม่สามารถเผยแพร่พร้อมกันได้'
      })
    }

    // Create notifications
    const notifications: Array<{ userId: number; title: string; message: string; link: string }> = []
    for (const app of appointments) {
      const recipientIds = Array.from(new Set([
        ...app.students.map((s: any) => s.studentUserId),
        ...app.teachers.map((t: any) => t.teacherUserId)
      ]))
      const dateFormatted = new Date(app.scheduledDate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      for (const uid of recipientIds) {
        notifications.push({
          userId: uid,
          title: `กำหนดการนิเทศงาน: ${app.companyName}`,
          message: `กำหนดการนิเทศงาน ณ ${app.companyName} ในวันที่ ${dateFormatted} ได้รับการเผยแพร่แล้ว`,
          link: `/staff/cooperative-cycles/${cycleId}/visits`
        })
      }
    }

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications })
    }
  })

  return {
    success: true,
    publishedCount: appointments.length,
    message: `เผยแพร่ตารางนิเทศสำเร็จ ${appointments.length} รายการ`
  }
})
