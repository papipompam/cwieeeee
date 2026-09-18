export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสคำร้องไม่ถูกต้อง' })
  }

  const request = await prisma.cooperativeRequest.findFirst({
    where: {
      id,
      companyApplication: {
        studentUserId: user.id
      }
    },
    include: {
      companyApplication: {
        include: {
          company: true,
          cooperativeCycle: true
        }
      },
      documents: {
        orderBy: { version: 'desc' }
      }
    }
  })

  if (!request) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลคำร้อง' })
  }

  return request
})
