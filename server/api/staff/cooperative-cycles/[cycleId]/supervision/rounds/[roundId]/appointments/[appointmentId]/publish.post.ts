export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสนัดหมาย')

  await getSupervisionRound(cycleId, roundId)
  const app = await getSupervisionAppointment(roundId, appointmentId)

  if (app.status !== 'DRAFT') {
    throw createError({
      statusCode: 400,
      message: `ไม่สามารถเผยแพร่นัดหมายที่มีสถานะ "${app.status}" ได้`
    })
  }

  // Validation: must have company, student, teacher
  if (!app.companyId) {
    throw createError({ statusCode: 400, message: 'นัดหมายต้องมีข้อมูลสถานประกอบการ' })
  }
  if (app.students.length === 0) {
    throw createError({ statusCode: 400, message: 'นัดหมายต้องมีนักศึกษาอย่างน้อย 1 คน' })
  }
  if (app.teachers.length === 0) {
    throw createError({ statusCode: 400, message: 'นัดหมายต้องมีอาจารย์นิเทศอย่างน้อย 1 ท่าน' })
  }

  const teacherUserIds = app.teachers.map((t: any) => t.teacherUserId)
  const studentUserIds = app.students.map((s: any) => s.studentUserId)
  const dateFormatted = new Date(app.scheduledDate).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const updated = await prisma.$transaction(async (tx: any) => {
    await lockTeacherScheduleSlots(tx, [{
      scheduledDate: app.scheduledDate,
      teacherUserIds
    }])

    // Check conflicts across cycle inside transaction
    await checkTeacherScheduleConflict(cycleId, app.scheduledDate, app.period, teacherUserIds, appointmentId, tx)

    const updateResult = await tx.supervisionAppointment.updateMany({
      where: {
        id: appointmentId,
        supervisionRoundId: roundId,
        status: 'DRAFT'
      },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    })

    if (updateResult.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'สถานะของนัดหมายเปลี่ยนแปลงไปแล้ว หรือได้รับการเผยแพร่โดยผู้อื่นแล้ว'
      })
    }

    const recipientIds = Array.from(new Set([...studentUserIds, ...teacherUserIds]))
    if (recipientIds.length > 0) {
      await tx.notification.createMany({
        data: recipientIds.map((userId: number) => ({
          userId,
          title: `กำหนดการนิเทศงาน: ${app.companyName}`,
          message: `กำหนดการนิเทศงาน ณ ${app.companyName} ในวันที่ ${dateFormatted} (${app.period === 'MORNING' ? 'ช่วงเช้า' : app.period === 'AFTERNOON' ? 'ช่วงบ่าย' : 'เต็มวัน'}) ได้รับการเผยแพร่แล้ว`,
          link: `/staff/cooperative-cycles/${cycleId}/visits`
        }))
      })
    }

    return await tx.supervisionAppointment.findUnique({
      where: { id: appointmentId }
    })
  })

  return {
    id: updated.id,
    status: updated.status,
    publishedAt: updated.publishedAt,
    message: 'เผยแพร่กำหนดการนิเทศเรียบร้อยแล้ว'
  }
})
