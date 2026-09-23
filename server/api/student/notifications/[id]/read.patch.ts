export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสการแจ้งเตือนไม่ถูกต้อง' })
  }

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id }
  })

  if (!notification) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการแจ้งเตือน' })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  })

  return updated
})
