export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสสถานประกอบการไม่ถูกต้อง' })
  }

  const current = await prisma.company.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลสถานประกอบการที่ระบุ' })
  }

  // Future check: reject if referenced in applications or internships

  await prisma.company.delete({
    where: { id }
  })

  return {
    success: true,
    id
  }
})
