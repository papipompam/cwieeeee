export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสเจ้าหน้าที่ในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.staff.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลเจ้าหน้าที่ที่ระบุ' })
  }

  await prisma.staff.delete({
    where: { id }
  })

  return {
    success: true,
    id
  }
})
