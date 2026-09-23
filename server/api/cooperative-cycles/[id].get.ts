export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'รหัสรอบสหกิจไม่ถูกต้อง' })

  const cycle = await prisma.cooperativeCycle.findUnique({ where: { id } })
  if (!cycle) throw createError({ statusCode: 404, message: 'ไม่พบรอบสหกิจ' })
  return cycle
})
