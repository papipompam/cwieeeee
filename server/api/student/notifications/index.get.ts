export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false }
    })
  ])

  return {
    items: notifications,
    unreadCount
  }
})
