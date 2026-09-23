export default defineEventHandler(async (event) => {
  const staff = readStaffInput(await readBody(event))

  try {
    const user = await prisma.user.create({
      data: {
        loginId: staff.staffId,
        passwordHash: await hashPassword(staff.staffId),
        role: 'STAFF',
        prefix: staff.prefix,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        isActive: staff.isActive
      }
    })

    return {
      id: user.id,
      staffId: user.loginId,
      prefix: user.prefix ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสเจ้าหน้าที่ ${staff.staffId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
