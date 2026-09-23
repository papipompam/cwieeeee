export default defineEventHandler(async () => {
  const users = await prisma.user.findMany({
    where: { role: 'STAFF' },
    orderBy: { loginId: 'asc' }
  })

  return users.map(u => ({
    id: u.id,
    staffId: u.loginId,
    prefix: u.prefix ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    phone: u.phone ?? '',
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }))
})
