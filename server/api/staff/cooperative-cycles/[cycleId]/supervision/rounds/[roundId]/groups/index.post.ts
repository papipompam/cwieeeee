export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อกลุ่มนิเทศ' })
  }

  const existing = await prisma.supervisionGroup.findFirst({
    where: { supervisionRoundId: roundId, name }
  })
  if (existing) {
    throw createError({ statusCode: 409, message: `มีกลุ่มนิเทศชื่อ "${name}" ในครั้งนี้แล้ว` })
  }

  const group = await prisma.supervisionGroup.create({
    data: {
      supervisionRoundId: roundId,
      name,
      note: typeof body?.note === 'string' ? body.note.trim() : null
    }
  })

  const result = {
    id: group.id,
    name: group.name,
    notes: group.note,
    note: group.note,
    supervisionRoundId: group.supervisionRoundId,
    createdAt: group.createdAt
  }
  return {
    ...result,
    group: result
  }
})
