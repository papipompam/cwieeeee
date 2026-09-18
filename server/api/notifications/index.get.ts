export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false }
    })
  ])

  return { items: notifications, unreadCount }
})
