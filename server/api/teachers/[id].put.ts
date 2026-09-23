export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสอาจารย์ในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.user.findFirst({
    where: { id, role: 'TEACHER' }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลอาจารย์ที่ระบุ' })
  }

  const body = await readBody(event)
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword && newPassword.length < 8) {
    throw createError({ statusCode: 400, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  }

  const teacher = readTeacherInput({
    teacherId: current.loginId,
    prefix: current.prefix,
    firstName: current.firstName,
    lastName: current.lastName,
    gender: current.gender,
    phone: current.phone,
    isActive: current.isActive,
    ...body
  })

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        loginId: teacher.teacherId,
        prefix: teacher.prefix,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        gender: teacher.gender,
        phone: teacher.phone,
        isActive: teacher.isActive,
        ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {})
      }
    })
    if (newPassword) await destroyOtherSessions(event, id)

    return {
      id: updated.id,
      teacherId: updated.loginId,
      prefix: updated.prefix ?? '',
      firstName: updated.firstName ?? '',
      lastName: updated.lastName ?? '',
      gender: updated.gender ?? '',
      phone: updated.phone ?? '',
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสอาจารย์ ${teacher.teacherId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
