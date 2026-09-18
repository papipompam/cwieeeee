export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสนักศึกษาในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.student.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลนักศึกษาที่ระบุ' })
  }

  // Future check: if referenced in applications or cycles, reject with 400
  // In Phase B, there are no references yet.

  await prisma.student.delete({
    where: { id }
  })

  return {
    success: true,
    id
  }
})
