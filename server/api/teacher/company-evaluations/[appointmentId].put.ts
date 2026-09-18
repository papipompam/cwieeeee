const scoreKeys = ['workAlignmentScore', 'workScopeScore', 'learningOpportunityScore', 'supervisorReadinessScore', 'studentSupportScore', 'environmentScore', 'safetyScore', 'resourcesScore', 'welfareScore', 'travelScore', 'transportScore', 'accommodationScore', 'coordinationScore'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointmentId = Number(getRouterParam(event, 'appointmentId'))
  const appointment = await prisma.supervisionAppointment.findFirst({
    where: {
      id: appointmentId,
      status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED'] },
      supervisionGroup: { teachers: { some: { teacherUserId: user.id } } }
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
  if (scoreKeys.some(key => scores[key] === null)) throw createError({ statusCode: 400, message: 'กรุณาให้คะแนนให้ครบทั้ง 13 ด้านก่อนส่งแบบประเมิน' })
  const text = (key: string) => typeof body?.[key] === 'string' && body[key].trim() ? body[key].trim() : null
  const data = { ...scores, observations: text('observations'), companyNeeds: text('companyNeeds'), problems: text('problems'), recommendations: text('recommendations'), futureRecommendation: text('futureRecommendation') }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${appointmentId}, ${7_301})`
    const existing = await tx.companyEvaluation.findFirst({
      where: { appointmentId },
      orderBy: { updatedAt: 'desc' }
    })
    if (existing) {
      return tx.companyEvaluation.update({ where: { id: existing.id }, data })
    }
    return tx.companyEvaluation.create({ data: { ...data, appointmentId, teacherUserId: user.id } })
  })
})
