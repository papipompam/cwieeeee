export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const reviewId = validatePositiveId(getRouterParam(event, 'reviewId'), 'รหัสรีวิว')
  const body = await readBody<{ status?: string, reviewerNote?: string }>(event)
  if (!['APPROVED', 'RETURNED', 'HIDDEN'].includes(body?.status || '')) throw createError({ statusCode: 400, message: 'สถานะรีวิวไม่ถูกต้อง' })
  return prisma.companyReview.update({ where: { id: reviewId }, data: { status: body.status!, reviewerNote: typeof body.reviewerNote === 'string' ? body.reviewerNote.trim() || null : null, reviewedAt: new Date() } })
})
