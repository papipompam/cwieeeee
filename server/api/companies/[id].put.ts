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

  const company = readCompanyInput({ ...current, ...await readBody(event) })
  return await prisma.company.update({
    where: { id },
    data: company
  })
})
