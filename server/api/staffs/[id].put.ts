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

  const staff = readStaffInput({ ...current, ...await readBody(event) })

  try {
    return await prisma.staff.update({ where: { id }, data: staff })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสเจ้าหน้าที่ ${staff.staffId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
