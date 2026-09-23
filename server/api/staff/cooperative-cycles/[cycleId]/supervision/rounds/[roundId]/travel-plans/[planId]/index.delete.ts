export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const planId = validatePositiveId(getRouterParam(event, 'planId'), 'รหัสแผนเดินทาง')

  await getSupervisionRound(cycleId, roundId)

  const existing = await prisma.supervisionTravelPlan.findFirst({
    where: { id: planId, supervisionRoundId: roundId }
  })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลแผนเดินทาง' })
  }

  await prisma.supervisionTravelPlan.delete({
    where: { id: planId }
  })

  return { success: true, message: 'ลบแผนเดินทางเรียบร้อยแล้ว' }
})
