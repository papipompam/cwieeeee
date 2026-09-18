export default defineEventHandler(async (event) => {
  const teacher = readTeacherInput(await readBody(event))

  try {
    return await prisma.teacher.create({ data: teacher })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสอาจารย์ ${teacher.teacherId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
