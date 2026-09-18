export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  const body = await readBody(event)
  const data: any = {}

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name) {
      throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อกลุ่มนิเทศ' })
    }
    // Check duplicate name
    const existing = await prisma.supervisionGroup.findFirst({
      where: {
        supervisionRoundId: roundId,
        name,
        id: { not: groupId }
      }
    })
    if (existing) {
      throw createError({ statusCode: 409, message: `มีกลุ่มนิเทศชื่อ "${name}" ในครั้งนี้แล้ว` })
    }
    data.name = name
  }

  if (body?.note !== undefined) {
    data.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }

  const updated = await prisma.supervisionGroup.update({
    where: { id: groupId },
    data
  })

  return {
    id: updated.id,
    name: updated.name,
    note: updated.note,
    updatedAt: updated.updatedAt
  }
})
