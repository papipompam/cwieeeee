export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสนักศึกษาในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.user.findFirst({
    where: { id, role: 'STUDENT' }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลนักศึกษาที่ระบุ' })
  }

  const student = readStudentInput({
    studentId: current.loginId,
    prefix: current.prefix,
    firstName: current.firstName,
    lastName: current.lastName,
    cohortYear: current.cohortYear,
    classGroup: current.classGroup,
    isActive: current.isActive,
    ...await readBody(event)
  })

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        loginId: student.studentId,
        prefix: student.prefix,
        firstName: student.firstName,
        lastName: student.lastName,
        cohortYear: student.cohortYear,
        classGroup: student.classGroup,
        isActive: student.isActive
      }
    })

    return {
      id: updated.id,
      studentId: updated.loginId,
      prefix: updated.prefix ?? '',
      firstName: updated.firstName ?? '',
      lastName: updated.lastName ?? '',
      cohortYear: updated.cohortYear ?? 0,
      classGroup: updated.classGroup ?? 0,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสนักศึกษา ${student.studentId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
