export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')
  const teacherId = validatePositiveId(getRouterParam(event, 'teacherId'), 'รหัสอาจารย์')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  const assignment = await prisma.supervisionGroupTeacher.findFirst({
    where: {
      supervisionGroupId: groupId,
      teacherUserId: teacherId
    }
  })

  if (!assignment) {
    throw createError({ statusCode: 404, message: 'ไม่พบอาจารย์ท่านนี้ในกลุ่มนิเทศที่ระบุ' })
  }

  // Remove teacher from group
  await prisma.supervisionGroupTeacher.delete({
    where: { id: assignment.id }
  })

  return { success: true, message: 'นำอาจารย์ออกจากกลุ่มเรียบร้อยแล้ว' }
})
