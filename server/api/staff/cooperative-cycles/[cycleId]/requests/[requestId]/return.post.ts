export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const body = await readBody(event)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    throw createError({
      statusCode: 400,
      message: 'กรุณาระบุเหตุผลที่ส่งกลับแก้ไข'
    })
  }

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  if (request.status !== 'DOCUMENT_UNDER_REVIEW') {
    throw createError({
      statusCode: 400,
      message: 'สามารถส่งกลับแก้ไขได้เฉพาะคำร้องที่อยู่ในสถานะรอตรวจสอบเอกสารเท่านั้น'
    })
  }

  const latestDoc = request.documents[0]
  if (!latestDoc) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถส่งกลับแก้ไขได้เนื่องจากไม่พบเอกสารตอบรับ'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update latest document
    await tx.requestDocument.update({
      where: { id: latestDoc.id },
      data: { status: 'RETURNED_FOR_REVISION' }
    })

    // Concurrency guard: Ensure request is still in DOCUMENT_UNDER_REVIEW
    const updated = await tx.cooperativeRequest.updateMany({
      where: {
        id: request.id,
        status: 'DOCUMENT_UNDER_REVIEW'
      },
      data: {
        status: 'RETURNED_FOR_REVISION',
        returnedReason: reason
      }
    })

    if (updated.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ'
      })
    }

    // Notify student
    await tx.notification.create({
      data: {
        userId: request.companyApplication.studentUserId,
        title: 'เอกสารถูกส่งกลับเพื่อแก้ไข',
        message: `เอกสารสำหรับ ${request.companyName} ต้องแก้ไข: ${reason}`,
        link: `/student/requests/${request.id}`
      }
    })

    return tx.cooperativeRequest.findUniqueOrThrow({
      where: { id: request.id }
    })
  })

  return { success: true, request: result }
})
