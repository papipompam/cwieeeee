export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const round = await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const data: any = {}

  if (body?.name !== undefined) {
    throw createError({ statusCode: 400, message: 'ชื่อรอบนิเทศกำหนดไว้แล้วเป็นนิเทศครั้งที่ 1 และ 2' })
  }

  if (body?.status !== undefined) {
    if (body.status !== 'COMPLETED' || round.status !== 'PUBLISHED') {
      throw createError({ statusCode: 400, message: 'การเผยแพร่ต้องใช้ปุ่มเผยแพร่ตารางนิเทศ' })
    }
    data.status = 'COMPLETED'
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
