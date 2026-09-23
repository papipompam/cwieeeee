export default defineEventHandler(async (event) => {
  const student = readStudentInput(await readBody(event))

  try {
    const user = await prisma.user.create({
      data: {
        loginId: student.studentId,
        passwordHash: await hashPassword(student.studentId),
        role: 'STUDENT',
        prefix: student.prefix,
        firstName: student.firstName,
        lastName: student.lastName,
        cohortYear: student.cohortYear,
        classGroup: student.classGroup,
        isActive: student.isActive,
        mustChangePassword: true
      }
    })

    return {
      id: user.id,
      studentId: user.loginId,
      prefix: user.prefix ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      cohortYear: user.cohortYear ?? 0,
      classGroup: user.classGroup ?? 0,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสนักศึกษา ${student.studentId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
