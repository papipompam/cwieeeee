export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสรายการนิเทศ')
  const body = await readBody<{ status?: string, reason?: string }>(event)
  const status = body?.status
  if (!['PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'].includes(status || '')) {
    throw createError({ statusCode: 400, message: 'สถานะไม่ถูกต้อง' })
  }
  const result = await prisma.supervisionAppointment.updateMany({
    where: { id: appointmentId, teachers: { some: { teacherUserId: teacher.id } } },
    data: {
      status: status as 'PUBLISHED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED',
      changeReason: status === 'RESCHEDULED' ? (body.reason?.trim() || null) : null,
      cancelReason: status === 'CANCELLED' ? (body.reason?.trim() || null) : null,
      evaluatedAt: status === 'COMPLETED' ? new Date() : undefined
    }
  })
  if (!result.count) throw createError({ statusCode: 404, message: 'ไม่พบรายการนิเทศที่คุณรับผิดชอบ' })
  return { success: true }
})
