export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  if (request.status !== 'DOCUMENT_UNDER_REVIEW') {
    throw createError({
      statusCode: 400,
      message: 'สามารถยืนยันสถานที่ฝึกงานได้เฉพาะคำร้องที่อยู่ในสถานะรอตรวจสอบเอกสารเท่านั้น'
    })
  }

  const latestDoc = request.documents[0]
  if (!latestDoc) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถยืนยันสถานที่ฝึกงานได้เนื่องจากไม่พบเอกสารตอบรับ'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Approve latest document
    await tx.requestDocument.update({
      where: { id: latestDoc.id },
      data: { status: 'APPROVED' }
    })

    // Concurrency guard: Ensure request is still in DOCUMENT_UNDER_REVIEW
    const updated = await tx.cooperativeRequest.updateMany({
      where: {
        id: request.id,
        status: 'DOCUMENT_UNDER_REVIEW'
      },
      data: {
        status: 'PLACEMENT_CONFIRMED'
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
        status: 'CONFIRMED',
        outcomeAt: new Date()
      }
    })

    // Notify student
    await tx.notification.create({
      data: {
        userId: request.companyApplication.studentUserId,
        title: 'ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว',
        message: `สถานที่ฝึกงาน ${request.companyName} ได้รับการยืนยันแล้ว`,
        link: `/student/requests/${request.id}`
      }
    })

    return tx.cooperativeRequest.findUniqueOrThrow({
      where: { id: request.id }
    })
  })

  return { success: true, request: result }
})
