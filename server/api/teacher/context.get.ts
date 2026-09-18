export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')

  const appointments = await prisma.supervisionAppointment.findMany({
    where: {
      status: { in: ['PUBLISHED', 'RESCHEDULED'] },
      supervisionGroup: { teachers: { some: { teacherUserId: user.id } } }
    },
    select: {
      id: true,
      companyName: true,
      companyAddress: true,
      province: true,
      scheduledDate: true,
      period: true,
      timeNote: true,
      status: true,
      supervisionGroup: { select: { name: true } },
      supervisionRound: {
        select: {
          roundNo: true,
          cooperativeCycle: { select: { term: true, academicYear: true } }
        }
      },
      _count: { select: { students: true } }
    },
    orderBy: { scheduledDate: 'asc' }
  })

  return {
    teacher: {
      name: [user.prefix, user.firstName, user.lastName].filter(Boolean).join(' '),
      teacherId: user.loginId
    },
    appointments
  }
})
