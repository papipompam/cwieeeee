const scoreKeys = ['responsibilityScore', 'disciplineScore', 'communicationScore', 'knowledgeScore', 'workQualityScore', 'problemSolvingScore'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointmentId = Number(getRouterParam(event, 'appointmentId'))
  const studentUserId = Number(getRouterParam(event, 'studentId'))
  if (!Number.isInteger(appointmentId) || !Number.isInteger(studentUserId)) throw createError({ statusCode: 400, message: 'ข้อมูลรายการประเมินไม่ถูกต้อง' })

  const appointment = await prisma.supervisionAppointment.findFirst({
    where: {
      id: appointmentId,
      status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED'] },
      supervisionGroup: { teachers: { some: { teacherUserId: user.id } } },
      students: { some: { studentUserId } }
    }
  })
  if (!appointment) throw createError({ statusCode: 403, message: 'ไม่มีสิทธิ์ประเมินรายการนี้ หรือรายการนิเทศไม่พร้อมใช้งาน' })

  const body = await readBody(event)
  const scores = Object.fromEntries(scoreKeys.map(key => {
    const value = body?.[key]
    if (value === null || value === undefined || value === '') return [key, null]
    const score = Number(value)
    if (!Number.isInteger(score) || score < 1 || score > 5) throw createError({ statusCode: 400, message: 'คะแนนต้องเป็นจำนวนเต็ม 1 ถึง 5' })
    return [key, score]
  }))
  if (scoreKeys.some(key => scores[key] === null)) throw createError({ statusCode: 400, message: 'กรุณาให้คะแนนให้ครบทั้ง 6 ด้านก่อนส่งแบบประเมิน' })
  const text = (key: string) => typeof body?.[key] === 'string' && body[key].trim() ? body[key].trim() : null

  const data = { ...scores, strengths: text('strengths'), problems: text('problems'), recommendations: text('recommendations'), followUp: text('followUp') }
  return prisma.studentEvaluation.upsert({
    where: { appointment_student_teacher: { appointmentId, studentUserId, teacherUserId: user.id } },
    create: { ...data, appointmentId, studentUserId, teacherUserId: user.id },
    update: data
  })
})
