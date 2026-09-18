export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  const body = await readBody(event)
  const teacherUserId = validatePositiveId(body?.teacherUserId, 'รหัสอาจารย์')

  // Verify teacher user
  const teacher = await prisma.user.findFirst({
    where: { id: teacherUserId, role: 'TEACHER', isActive: true }
  })
  if (!teacher) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลอาจารย์ที่พร้อมปฏิบัติงาน' })
  }

  // Enforce teacher 1 group per round
  const existingInRound = await prisma.supervisionGroupTeacher.findFirst({
    where: {
      supervisionRoundId: roundId,
      teacherUserId
    },
    include: { supervisionGroup: true }
  })
  if (existingInRound) {
    throw createError({
      statusCode: 409,
      message: `อาจารย์ ${teacher.prefix || ''}${teacher.firstName} ${teacher.lastName} ได้รับมอบหมายในกลุ่ม "${existingInRound.supervisionGroup.name}" แล้วในครั้งนี้`
    })
  }

  const assignment = await prisma.supervisionGroupTeacher.create({
    data: {
      supervisionRoundId: roundId,
      supervisionGroupId: groupId,
      teacherUserId
    },
    include: {
      teacherUser: {
        select: {
          id: true,
          loginId: true,
          prefix: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true
        }
      }
    }
  })

  return {
    success: true,
    id: assignment.id,
    supervisionGroupId: groupId,
    teacher: assignment.teacherUser,
    createdAt: assignment.createdAt
  }
})
