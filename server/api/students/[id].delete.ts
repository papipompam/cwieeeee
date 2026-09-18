export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสนักศึกษาในระบบไม่ถูกต้อง' })
  }

  const current = await prisma.user.findFirst({
    where: { id, role: 'STUDENT' },
    include: {
      sessions: { select: { id: true }, take: 1 }
    }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลนักศึกษาที่ระบุ' })
  }

  if (current.sessions.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถลบบัญชีที่มีประวัติการเข้าสู่ระบบได้ กรุณาเปลี่ยนสถานะเป็น "ไม่ใช้งาน" แทน'
    })
  }

  await prisma.user.delete({
    where: { id }
  })

  return {
    success: true,
    id
  }
})
