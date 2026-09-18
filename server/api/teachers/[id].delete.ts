export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสอาจารย์ในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.teacher.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลอาจารย์ที่ระบุ' })
  }

  // Future check: if referenced in supervision assignments, reject with 400

  await prisma.teacher.delete({
    where: { id }
  })

  return {
    success: true,
    id
  }
})
