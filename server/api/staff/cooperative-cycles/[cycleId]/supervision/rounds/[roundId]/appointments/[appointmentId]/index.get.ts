export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสนัดหมาย')

  await getSupervisionRound(cycleId, roundId)
  const a = await getSupervisionAppointment(roundId, appointmentId)

  return {
    id: a.id,
    supervisionRoundId: a.supervisionRoundId,
    supervisionGroupId: a.supervisionGroupId,
    group: a.supervisionGroup,
    companyId: a.companyId,
    companyName: a.companyName,
    companyAddress: a.companyAddress,
    province: a.province,
    latitude: a.latitude,
    longitude: a.longitude,
    scheduledDate: a.scheduledDate,
    period: a.period,
    timeNote: a.timeNote,
    status: a.status,
    changeReason: a.changeReason,
    cancelReason: a.cancelReason,
    publishedAt: a.publishedAt,
    studentsCount: a.students.length,
    students: a.students.map((s: any) => ({
      id: s.studentUser.id,
      loginId: s.studentUser.loginId,
      prefix: s.studentUser.prefix,
      firstName: s.studentUser.firstName,
      lastName: s.studentUser.lastName,
      phone: s.studentUser.phone
    })),
    teachersCount: a.teachers.length,
    teachers: a.teachers.map((t: any) => ({
      id: t.teacherUser.id,
      teacherId: t.teacherUser.loginId,
      prefix: t.teacherUser.prefix,
      firstName: t.teacherUser.firstName,
      lastName: t.teacherUser.lastName,
      phone: t.teacherUser.phone
    })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  }
})
