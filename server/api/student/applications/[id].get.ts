export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสการสมัครไม่ถูกต้อง' })
  }

  const application = await prisma.companyApplication.findFirst({
    where: {
      id,
      studentUserId: user.id
    },
    include: {
      company: true,
      cooperativeRequest: true,
      cooperativeCycle: true
    }
  })

  if (!application) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  return application
})
