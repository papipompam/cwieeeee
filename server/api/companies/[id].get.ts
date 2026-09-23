export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสสถานประกอบการไม่ถูกต้อง' })
  }

  const company = await prisma.company.findUnique({
    where: { id }
  })

  if (!company) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลสถานประกอบการที่ระบุ' })
  }

  return company
})
