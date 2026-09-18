const scoreKeys = ['responsibilityScore', 'disciplineScore', 'communicationScore', 'knowledgeScore', 'workQualityScore', 'problemSolvingScore'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointmentId = Number(getRouterParam(event, 'appointmentId'))
  const studentUserId = Number(getRouterParam(event, 'studentId'))
  if (!Number.isInteger(appointmentId) || !Number.isInteger(studentUserId)) throw createError({ statusCode: 400, message: 'ข้อมูลรายการประเมินไม่ถูกต้อง' })

  const appointment = await prisma.supervisionAppointment.findFirst({
    where: { id: appointmentId, status: 'COMPLETED', teachers: { some: { teacherUserId: user.id } }, students: { some: { studentUserId } } }
  })
  if (!appointment) throw createError({ statusCode: 403, message: 'ยังไม่มีสิทธิ์ประเมินรายการนี้ หรือการนิเทศยังไม่เสร็จสิ้น' })

  const body = await readBody(event)
  const submit = body?.submit === true
  const scores = Object.fromEntries(scoreKeys.map(key => {
    const value = body?.[key]
    if (value === null || value === undefined || value === '') return [key, null]
    const score = Number(value)
    if (!Number.isInteger(score) || score < 1 || score > 5) throw createError({ statusCode: 400, message: 'คะแนนต้องเป็นจำนวนเต็ม 1 ถึง 5' })
    return [key, score]
  }))
  if (submit && scoreKeys.some(key => scores[key] === null)) throw createError({ statusCode: 400, message: 'กรุณาให้คะแนนให้ครบทั้ง 6 ด้านก่อนส่งแบบประเมิน' })
  const text = (key: string) => typeof body?.[key] === 'string' && body[key].trim() ? body[key].trim() : null

  return prisma.$transaction(async (tx) => {
    const existing = await tx.studentEvaluation.findUnique({ where: { appointment_student_teacher: { appointmentId, studentUserId, teacherUserId: user.id } } })
    if (existing?.status === 'SUBMITTED') throw createError({ statusCode: 400, message: 'แบบประเมินที่ส่งแล้วไม่สามารถแก้ไขได้' })
    const evaluationStatus: 'DRAFT' | 'SUBMITTED' = submit ? 'SUBMITTED' : 'DRAFT'
    const data = { ...scores, strengths: text('strengths'), problems: text('problems'), recommendations: text('recommendations'), followUp: text('followUp'), status: evaluationStatus, submittedAt: submit ? new Date() : null }
    return existing
      ? tx.studentEvaluation.update({ where: { id: existing.id }, data })
      : tx.studentEvaluation.create({ data: { ...data, appointmentId, studentUserId, teacherUserId: user.id } })
  })
})
