export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const body = await readBody(event)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    throw createError({
      statusCode: 400,
      message: 'กรุณาระบุเหตุผลที่ปฏิเสธคำร้อง'
    })
  }

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  if (!['SUBMITTED', 'STAFF_PROCESSING', 'DOCUMENT_UNDER_REVIEW'].includes(request.status)) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถปฏิเสธคำร้องในสถานะปัจจุบันได้'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Concurrency guard: Ensure request status hasn't moved to another state
    const updated = await tx.cooperativeRequest.updateMany({
      where: {
        id: request.id,
        status: { in: ['SUBMITTED', 'STAFF_PROCESSING', 'DOCUMENT_UNDER_REVIEW'] }
      },
      data: {
        status: 'REJECTED',
        rejectedReason: reason
      }
    })

    if (updated.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ'
      })
    }

    await tx.companyApplication.update({
      where: { id: request.companyApplicationId },
      data: {
        status: 'REJECTED',
        outcomeAt: new Date(),
        note: reason
      }
    })

    // Notify student
    await tx.notification.create({
      data: {
        userId: request.companyApplication.studentUserId,
        title: 'คำร้องไม่ได้รับการอนุมัติ',
        message: `คำร้องสำหรับ ${request.companyName} ถูกปฏิเสธ: ${reason}`,
        link: '/student/applications'
      }
    })

    return tx.cooperativeRequest.findUniqueOrThrow({
      where: { id: request.id }
    })
  })

  return { success: true, request: result }
})
