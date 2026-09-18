export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสนัดหมาย')

  await getSupervisionRound(cycleId, roundId)
  const app = await getSupervisionAppointment(roundId, appointmentId)

  if (app.status === 'COMPLETED' || app.status === 'CANCELLED') {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถเลื่อนนัดหมายที่เสร็จสิ้นหรือยกเลิกแล้วได้'
    })
  }

  const body = await readBody(event)
  const changeReason = (typeof body?.changeReason === 'string' && body.changeReason.trim()) ||
    (typeof body?.reason === 'string' && body.reason.trim()) || ''
  if (!changeReason) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุเหตุผลในการเลื่อนนัดหมาย' })
  }

  const newDate = parseStrictDate(body?.scheduledDate, 'วันนัดหมายใหม่')
  const newPeriod = ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(body?.period) ? body.period : app.period
  const timeNote = typeof body?.timeNote === 'string' ? body.timeNote.trim() || null : app.timeNote

  const teacherUserIds = app.teachers.map((t: any) => t.teacherUserId)
  const studentUserIds = app.students.map((s: any) => s.studentUserId)
  const dateFormatted = newDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const updated = await prisma.$transaction(async (tx: any) => {
    await lockTeacherScheduleSlots(tx, [{
      scheduledDate: newDate,
      teacherUserIds
    }])

    // Check conflicts across cycle inside transaction
    await checkTeacherScheduleConflict(cycleId, newDate, newPeriod, teacherUserIds, appointmentId, tx)

    const updateResult = await tx.supervisionAppointment.updateMany({
      where: {
        id: appointmentId,
        supervisionRoundId: roundId,
        status: { in: ['PUBLISHED', 'RESCHEDULED'] }
      },
      data: {
        scheduledDate: newDate,
        period: newPeriod,
        timeNote,
        status: 'RESCHEDULED',
        changeReason
      }
    })

    if (updateResult.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'สถานะของนัดหมายเปลี่ยนแปลงไปแล้ว ไม่สามารถเลื่อนกำหนดการได้'
      })
    }

    const recipientIds = Array.from(new Set([...studentUserIds, ...teacherUserIds]))
    if (recipientIds.length > 0) {
      await tx.notification.createMany({
        data: recipientIds.map((userId: number) => ({
          userId,
          title: `เลื่อนกำหนดการนิเทศงาน: ${app.companyName}`,
          message: `กำหนดการนิเทศ ณ ${app.companyName} เลื่อนเป็นวันที่ ${dateFormatted} (${newPeriod === 'MORNING' ? 'ช่วงเช้า' : newPeriod === 'AFTERNOON' ? 'ช่วงบ่าย' : 'เต็มวัน'}) เนื่องจาก: ${changeReason}`,
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
    scheduledDate: updated.scheduledDate,
    period: updated.period,
    status: updated.status,
    changeReason: updated.changeReason,
    rescheduleReason: updated.changeReason,
    appointment: updated,
    message: 'เลื่อนกำหนดการนิเทศและแจ้งผู้เกี่ยวข้องเรียบร้อยแล้ว'
  }
})
