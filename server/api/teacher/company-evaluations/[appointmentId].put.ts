const scoreKeys = ['workAlignmentScore', 'workScopeScore', 'learningOpportunityScore', 'supervisorReadinessScore', 'studentSupportScore', 'environmentScore', 'safetyScore', 'resourcesScore', 'welfareScore', 'travelScore', 'transportScore', 'accommodationScore', 'coordinationScore'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointmentId = Number(getRouterParam(event, 'appointmentId'))
  const appointment = await prisma.supervisionAppointment.findFirst({ where: { id: appointmentId, status: 'COMPLETED', teachers: { some: { teacherUserId: user.id } } } })
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
  if (submit && scoreKeys.some(key => scores[key] === null)) throw createError({ statusCode: 400, message: 'กรุณาให้คะแนนให้ครบทั้ง 13 ด้านก่อนส่งแบบประเมิน' })
  const text = (key: string) => typeof body?.[key] === 'string' && body[key].trim() ? body[key].trim() : null
  return prisma.$transaction(async (tx) => {
    const existing = await tx.companyEvaluation.findUnique({ where: { appointment_teacher_company_evaluation: { appointmentId, teacherUserId: user.id } } })
    if (existing?.status === 'SUBMITTED') throw createError({ statusCode: 400, message: 'แบบประเมินที่ส่งแล้วไม่สามารถแก้ไขได้' })
    const status: 'DRAFT' | 'SUBMITTED' = submit ? 'SUBMITTED' : 'DRAFT'
    const data = { ...scores, observations: text('observations'), companyNeeds: text('companyNeeds'), problems: text('problems'), recommendations: text('recommendations'), futureRecommendation: text('futureRecommendation'), status, submittedAt: submit ? new Date() : null }
    return existing ? tx.companyEvaluation.update({ where: { id: existing.id }, data }) : tx.companyEvaluation.create({ data: { ...data, appointmentId, teacherUserId: user.id } })
  })
})
