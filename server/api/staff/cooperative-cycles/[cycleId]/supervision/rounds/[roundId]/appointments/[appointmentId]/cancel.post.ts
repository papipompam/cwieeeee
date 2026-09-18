export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสนัดหมาย')

  await getSupervisionRound(cycleId, roundId)
  const app = await getSupervisionAppointment(roundId, appointmentId)

  if (app.status === 'COMPLETED' || app.status === 'CANCELLED') {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถยกเลิกนัดหมายที่เสร็จสิ้นหรือยกเลิกแล้วได้'
    })
  }

  const body = await readBody(event)
  const cancelReason = (typeof body?.cancelReason === 'string' && body.cancelReason.trim()) ||
    (typeof body?.reason === 'string' && body.reason.trim()) || ''
  if (!cancelReason) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุเหตุผลในการยกเลิกนัดหมาย' })
  }

  const wasPublished = app.status === 'PUBLISHED' || app.status === 'RESCHEDULED'
  const studentUserIds = app.students.map((s: any) => s.studentUserId)
  const teacherUserIds = app.teachers.map((t: any) => t.teacherUserId)

  const updated = await prisma.$transaction(async (tx: any) => {
    const updateResult = await tx.supervisionAppointment.updateMany({
      where: {
        id: appointmentId,
        supervisionRoundId: roundId,
        status: { in: ['DRAFT', 'PUBLISHED', 'RESCHEDULED'] }
      },
      data: {
        status: 'CANCELLED',
        cancelReason
      }
    })

    if (updateResult.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'สถานะของนัดหมายเปลี่ยนแปลงไปแล้ว ไม่สามารถยกเลิกได้'
      })
    }

    if (wasPublished) {
      const recipientIds = Array.from(new Set([...studentUserIds, ...teacherUserIds]))
      if (recipientIds.length > 0) {
        await tx.notification.createMany({
          data: recipientIds.map((userId: number) => ({
            userId,
            title: `ยกเลิกกำหนดการนิเทศงาน: ${app.companyName}`,
            message: `กำหนดการนิเทศงาน ณ ${app.companyName} ถูกยกเลิก เนื่องจาก: ${cancelReason}`,
            link: `/staff/cooperative-cycles/${cycleId}/visits`
          }))
        })
      }
    }

    return await tx.supervisionAppointment.findUnique({
      where: { id: appointmentId }
    })
  })

  return {
    id: updated.id,
    status: updated.status,
    cancelReason: updated.cancelReason,
    cancellationReason: updated.cancelReason,
    appointment: updated,
    message: 'ยกเลิกกำหนดการนิเทศเรียบร้อยแล้ว'
  }
})
