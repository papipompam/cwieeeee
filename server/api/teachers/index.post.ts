export default defineEventHandler(async (event) => {
  const teacher = readTeacherInput(await readBody(event))

  try {
    const user = await prisma.user.create({
      data: {
        loginId: teacher.teacherId,
        passwordHash: await hashPassword(teacher.teacherId),
        role: 'TEACHER',
        prefix: teacher.prefix,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        gender: teacher.gender,
        phone: teacher.phone,
        isActive: teacher.isActive
      }
    })

    return {
      id: user.id,
      teacherId: user.loginId,
      prefix: user.prefix ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      gender: user.gender ?? '',
      phone: user.phone ?? '',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสอาจารย์ ${teacher.teacherId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
