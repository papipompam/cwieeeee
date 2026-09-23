export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${19_100}, ${cycleId})`
    const round = await tx.supervisionRound.findFirst({
      where: { id: roundId, cooperativeCycleId: cycleId },
      select: {
        id: true,
        roundNo: true,
        status: true,
        groupCompanies: { select: { companyId: true } },
        appointments: { select: { companyId: true, students: { select: { studentUserId: true } }, teachers: { select: { teacherUserId: true } } } }
      }
    })
    if (!round) throw createError({ statusCode: 404, message: 'ไม่พบรอบนิเทศที่เลือก' })
    if (round.status !== 'DRAFT') throw createError({ statusCode: 409, message: 'รอบนิเทศนี้เผยแพร่แล้ว' })
    if (!round.appointments.length || round.groupCompanies.some(item => !round.appointments.some(appointment => appointment.companyId === item.companyId)) || round.appointments.some(appointment => !appointment.teachers.length)) {
      throw createError({ statusCode: 400, message: 'กรุณากำหนดวันนิเทศและอาจารย์ให้สถานประกอบการทุกแห่งในรอบนี้ก่อนเผยแพร่' })
    }

    const publishedAt = new Date()
    await tx.supervisionAppointment.updateMany({
      where: { supervisionRoundId: roundId, status: 'DRAFT' },
      data: { status: 'PUBLISHED', publishedAt }
    })
    await tx.supervisionRound.update({ where: { id: roundId }, data: { status: 'PUBLISHED' } })
    const studentIds = new Set(round.appointments.flatMap(appointment => appointment.students.map(student => student.studentUserId)))
    const teacherIds = new Set(round.appointments.flatMap(appointment => appointment.teachers.map(teacher => teacher.teacherUserId)))
    await tx.notification.createMany({
      data: [
        ...[...studentIds].map(userId => ({ userId, title: 'เผยแพร่ตารางนิเทศ', message: `ตารางนิเทศครั้งที่ ${round.roundNo} เผยแพร่แล้ว`, link: '/student/visits' })),
        ...[...teacherIds].map(userId => ({ userId, title: 'เผยแพร่ตารางนิเทศ', message: `ตารางนิเทศครั้งที่ ${round.roundNo} เผยแพร่แล้ว`, link: '/teacher/visits' }))
      ]
    })
    return { success: true, publishedAt }
  })
})
