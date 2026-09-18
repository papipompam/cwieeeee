export default defineEventHandler(async () => {
  const users = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    orderBy: { loginId: 'asc' }
  })

  return users.map(u => ({
    id: u.id,
    teacherId: u.loginId,
    prefix: u.prefix ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    gender: u.gender ?? '',
    phone: u.phone ?? '',
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }))
})
