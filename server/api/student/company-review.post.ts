export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const body = await readBody<{ requestId?: number, rating?: number, comment?: string }>(event)
  const requestId = validatePositiveId(String(body?.requestId || ''), 'รายการฝึกงาน')
  const rating = Number(body?.rating)
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) throw createError({ statusCode: 400, message: 'กรุณาให้คะแนนและเขียนความคิดเห็น' })
  const request = await prisma.cooperativeRequest.findFirst({ where: { id: requestId, status: 'PLACEMENT_CONFIRMED', companyApplication: { studentUserId: user.id } }, select: { id: true } })
  if (!request) throw createError({ statusCode: 403, message: 'ไม่พบสถานประกอบการที่คุณมีสิทธิ์รีวิว' })
  const existing = await prisma.companyReview.findUnique({ where: { cooperativeRequestId: requestId } })
  if (existing) return prisma.companyReview.update({ where: { id: existing.id }, data: { rating, comment, status: 'PENDING', reviewerNote: null, reviewedAt: null } })
  return prisma.companyReview.create({ data: { cooperativeRequestId: requestId, studentUserId: user.id, rating, comment } })
})
