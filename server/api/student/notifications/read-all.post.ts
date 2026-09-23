export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true }
  })

  return { success: true }
})
