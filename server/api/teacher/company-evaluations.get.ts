export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionGroup: { teachers: { some: { teacherUserId: user.id } } }, status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED'] } },
    include: {
      supervisionGroup: { select: { name: true } },
      supervisionRound: { select: { roundNo: true, cooperativeCycle: { select: { term: true, academicYear: true } } } },
      companyEvaluations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: { teacherUser: { select: { prefix: true, firstName: true, lastName: true } } }
      }
    },
    orderBy: { scheduledDate: 'asc' }
  })
  return appointments.map(appointment => ({
    appointmentId: appointment.id, appointmentStatus: appointment.status, companyName: appointment.companyName, groupName: appointment.supervisionGroup.name, roundNo: appointment.supervisionRound.roundNo, cycle: appointment.supervisionRound.cooperativeCycle,
    evaluation: appointment.companyEvaluations[0] ?? null
  }))
})
