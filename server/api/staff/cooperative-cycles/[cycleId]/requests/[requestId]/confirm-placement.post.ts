export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const request = await getStaffCycleRequest(event, cycleId, requestId)
  const group = await prisma.requestLetterVersion.findFirst({
    where: { isActive: true, participants: { some: { cooperativeRequestId: request.id } } },
    include: { participants: { include: { cooperativeRequest: { include: { companyApplication: { select: { id: true, studentUserId: true } } } } } } }
  })
  const members = group?.participants.map(item => item.cooperativeRequest) || [request]
  const latestDoc = await prisma.requestDocument.findFirst({ where: group ? { requestLetterVersionId: group.id } : { cooperativeRequestId: request.id, requestLetterVersionId: null }, orderBy: { version: 'desc' } })
  if (!latestDoc || !members.every(member => member.status === 'DOCUMENT_UNDER_REVIEW')) throw createError({ statusCode: 400, message: 'สามารถยืนยันสถานที่ฝึกงานได้เมื่อเอกสารตอบรับของชุดนี้อยู่ระหว่างตรวจสอบเท่านั้น' })

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${group?.id ?? request.id}, 2)`
    const document = await tx.requestDocument.updateMany({ where: { id: latestDoc.id, status: { in: ['UPLOADED', 'UNDER_REVIEW'] } }, data: { status: 'APPROVED', reviewedAt: new Date() } })
    const requestIds = members.map(member => member.id)
    const updated = await tx.cooperativeRequest.updateMany({ where: { id: { in: requestIds }, status: 'DOCUMENT_UNDER_REVIEW' }, data: { status: 'PLACEMENT_CONFIRMED' } })
    if (!document.count || updated.count !== requestIds.length) throw createError({ statusCode: 409, message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ' })
    await tx.companyApplication.updateMany({ where: { id: { in: members.map(member => member.companyApplicationId) } }, data: { status: 'CONFIRMED', outcomeAt: new Date() } })
    await tx.notification.createMany({ data: members.map(member => ({ userId: member.companyApplication.studentUserId, title: 'ยืนยันสถานที่ฝึกงานเรียบร้อยแล้ว', message: `สถานที่ฝึกงาน ${request.companyName} ได้รับการยืนยันแล้ว`, link: '/student/applications' })) })
    return tx.cooperativeRequest.findUniqueOrThrow({ where: { id: request.id } })
  })
  return { success: true, request: result }
})
