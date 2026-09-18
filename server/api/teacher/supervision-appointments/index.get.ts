export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const appointments = await prisma.supervisionAppointment.findMany({
    where: {
      status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED'] },
      teachers: { some: { teacherUserId: teacher.id } }
    },
    orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
    include: {
      supervisionGroup: { select: { name: true } },
      students: { include: { studentUser: { select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } } } }
    }
  })
  return { appointments }
})
