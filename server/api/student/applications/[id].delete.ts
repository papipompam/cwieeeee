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
    }
  })

  if (!application) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  // Only REJECTED status can be deleted
  if (application.status !== 'REJECTED') {
    throw createError({ statusCode: 400, message: 'สามารถลบได้เฉพาะรายการที่สถานประกอบการปฏิเสธ (REJECTED) แล้วเท่านั้น' })
  }

  await prisma.companyApplication.delete({
    where: { id }
  })

  return { success: true, message: 'ลบรายการสมัครเรียบร้อยแล้ว' }
})
