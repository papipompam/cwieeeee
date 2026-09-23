export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสรายการนิเทศ')
  const body = await readBody(event)
  const evaluationNote = typeof body?.evaluationNote === 'string' ? body.evaluationNote.trim() || null : null
  const result = await prisma.supervisionAppointment.updateMany({
    where: {
      id: appointmentId,
      status: { in: ['PUBLISHED', 'RESCHEDULED'] },
      teachers: { some: { teacherUserId: teacher.id } }
    },
    data: { status: 'COMPLETED', evaluationNote, evaluatedAt: new Date() }
  })
  if (!result.count) throw createError({ statusCode: 409, message: 'ไม่พบรายการที่คุณรับผิดชอบ หรือรายการนี้จบการประเมินแล้ว' })
  return { success: true, message: 'บันทึกผลและจบการประเมินเรียบร้อยแล้ว' }
})
