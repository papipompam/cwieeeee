export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const body = await readBody(event)

  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null

  // Determine next roundNo
  const lastRound = await prisma.supervisionRound.findFirst({
    where: { cooperativeCycleId: cycleId },
    orderBy: { roundNo: 'desc' }
  })
  const nextRoundNo = (lastRound?.roundNo ?? 0) + 1

  const round = await prisma.supervisionRound.create({
    data: {
      cooperativeCycleId: cycleId,
      roundNo: nextRoundNo,
      name: name || `การนิเทศครั้งที่ ${nextRoundNo}`,
      status: 'PUBLISHED'
    }
  })

  const result = {
    id: round.id,
    roundNo: round.roundNo,
    title: round.name,
    name: round.name,
    status: round.status,
    createdAt: round.createdAt
  }
  return {
    ...result,
    round: result
  }
})
