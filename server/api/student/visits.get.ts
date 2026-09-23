export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const visits = await prisma.supervisionAppointment.findMany({
    where: {
      students: { some: { studentUserId: user.id } },
      status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'] },
      supervisionRound: { status: { in: ['PUBLISHED', 'COMPLETED'] } }
    },
    select: {
      id: true, scheduledDate: true, period: true, companyName: true, companyAddress: true,
      status: true, evaluationNote: true, timeNote: true,
      supervisionRound: { select: { roundNo: true } },
      teachers: { select: { teacherUser: { select: { prefix: true, firstName: true, lastName: true } } } }
    },
    orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }]
  })

  return visits.map(visit => ({
    id: visit.id,
    visitNo: visit.supervisionRound.roundNo,
    visitDate: visit.scheduledDate,
    period: visit.period,
    companyName: visit.companyName,
    companyAddress: visit.companyAddress,
    supervisorName: visit.teachers.map(({ teacherUser }) => [teacherUser.prefix, teacherUser.firstName, teacherUser.lastName].filter(Boolean).join(' ')).join(', ') || null,
    status: visit.status,
    notes: visit.evaluationNote || visit.timeNote
  }))
})
