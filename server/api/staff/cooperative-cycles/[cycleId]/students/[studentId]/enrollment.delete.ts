export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const studentId = validatePositiveId(getRouterParam(event, 'studentId'), 'รหัสนักศึกษา')

  const enrollment = await prisma.cooperativeCycleEnrollment.findUnique({
    where: { cycle_student: { cooperativeCycleId: cycleId, studentUserId: studentId } }
  })
  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'ไม่พบรายชื่อนักศึกษาในรอบนี้' })
  }

  const applicationsCount = await prisma.companyApplication.count({
    where: { cooperativeCycleId: cycleId, studentUserId: studentId }
  })
  if (applicationsCount > 0) {
    throw createError({ statusCode: 409, message: 'ไม่สามารถนำออกจากรอบได้ เนื่องจากนักศึกษามีรายการยื่นสถานประกอบการแล้ว' })
  }

  await prisma.cooperativeCycleEnrollment.delete({ where: { id: enrollment.id } })
  return { success: true }
})
