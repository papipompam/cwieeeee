export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสเจ้าหน้าที่ในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.user.findFirst({
    where: { id, role: 'STAFF' }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลเจ้าหน้าที่ที่ระบุ' })
  }

  const staff = readStaffInput({
    staffId: current.loginId,
    prefix: current.prefix,
    firstName: current.firstName,
    lastName: current.lastName,
    phone: current.phone,
    isActive: current.isActive,
    ...await readBody(event)
  })

  if (current.loginId === 'admin') {
    if (staff.staffId !== 'admin') {
      throw createError({ statusCode: 400, message: 'ไม่สามารถเปลี่ยนรหัสของบัญชีผู้ดูแลระบบหลัก (admin) ได้' })
    }
    if (!staff.isActive) {
      throw createError({ statusCode: 400, message: 'ไม่สามารถปิดใช้งานบัญชีผู้ดูแลระบบหลัก (admin) ได้' })
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        loginId: staff.staffId,
        prefix: staff.prefix,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        isActive: staff.isActive
      }
    })

    return {
      id: updated.id,
      staffId: updated.loginId,
      prefix: updated.prefix ?? '',
      firstName: updated.firstName ?? '',
      lastName: updated.lastName ?? '',
      phone: updated.phone ?? '',
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสเจ้าหน้าที่ ${staff.staffId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
