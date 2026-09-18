export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสการสมัครไม่ถูกต้อง' })
  }

  const application = await prisma.companyApplication.findFirst({
    where: {
      id,
      studentUserId: user.id
    },
    include: {
      cooperativeCycle: true,
      cooperativeRequest: true
    }
  })

  if (!application) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  if (application.cooperativeCycle.status !== 'OPEN_FOR_APPLICATION') {
    throw createError({ statusCode: 400, message: 'รอบสหกิจนี้ปิดรับคำร้องแล้ว ไม่สามารถแก้ไขผลการสมัครได้' })
  }

  const body = await readBody(event)
  const targetStatus = body?.status || body?.outcome

  const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] || []
  if (!targetStatus || !allowed.includes(targetStatus)) {
    throw createError({
      statusCode: 400,
      message: `ไม่สามารถเปลี่ยนสถานะจาก ${application.status} ไปเป็น ${targetStatus} ได้`
    })
  }

  const updated = await prisma.companyApplication.update({
    where: { id },
    data: {
      status: targetStatus,
      outcomeAt: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(targetStatus) ? new Date() : application.outcomeAt
    },
    include: {
      company: true,
      cooperativeRequest: true,
      cooperativeCycle: true
    }
  })

  return updated
})
