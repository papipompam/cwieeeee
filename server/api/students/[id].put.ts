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

  const student = readStudentInput({ ...current, ...await readBody(event) })

  try {
    return await prisma.student.update({ where: { id }, data: student })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสนักศึกษา ${student.studentId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
