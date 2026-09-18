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

  const teacher = readTeacherInput({ ...current, ...await readBody(event) })

  try {
    return await prisma.teacher.update({ where: { id }, data: teacher })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสอาจารย์ ${teacher.teacherId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
