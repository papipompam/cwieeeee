export default defineEventHandler(async (event) => {
  const student = readStudentInput(await readBody(event))

  try {
    return await prisma.student.create({ data: student })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสนักศึกษา ${student.studentId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
