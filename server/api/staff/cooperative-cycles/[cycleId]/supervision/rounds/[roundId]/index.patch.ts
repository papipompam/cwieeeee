export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const data: any = {}

  if (typeof body?.name === 'string') {
    data.name = body.name.trim() || null
  }

  if (body?.status && ['PLANNING', 'PUBLISHED', 'COMPLETED'].includes(body.status)) {
    data.status = body.status
  }

  const updated = await prisma.supervisionRound.update({
    where: { id: roundId },
    data
  })

  return {
    id: updated.id,
    roundNo: updated.roundNo,
    name: updated.name,
    status: updated.status,
    updatedAt: updated.updatedAt
  }
})
