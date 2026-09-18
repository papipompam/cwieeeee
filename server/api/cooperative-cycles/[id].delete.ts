export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'รหัสรอบสหกิจไม่ถูกต้อง' })
  }

  const current = await prisma.cooperativeCycle.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบรอบสหกิจที่ต้องการลบ' })
  }

  // ponytail: in future iterations with StudentApplications, check referencing relations before delete
  return await prisma.cooperativeCycle.delete({
    where: { id }
  })
})
