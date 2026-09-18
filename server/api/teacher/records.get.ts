export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointments = await prisma.supervisionAppointment.findMany({
    where: { teachers: { some: { teacherUserId: user.id } }, status: { not: 'DRAFT' } },
    include: {
      company: true,
      supervisionGroup: { select: { name: true } },
      supervisionRound: { select: { roundNo: true, cooperativeCycle: { select: { term: true, academicYear: true } } } },
      students: { include: { studentUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true, phone: true, cohortYear: true, classGroup: true } }, cooperativeRequest: { include: { companyApplication: { select: { applicationPosition: true, appliedAt: true, status: true } } } } } }
    }
  })
  const students = appointments.flatMap(appointment => appointment.students.map(item => ({
    appointmentId: appointment.id, studentId: item.studentUser.loginId, name: [item.studentUser.prefix, item.studentUser.firstName, item.studentUser.lastName].filter(Boolean).join(' '), phone: item.studentUser.phone, cohortYear: item.studentUser.cohortYear, classGroup: item.studentUser.classGroup,
    companyName: appointment.companyName, position: item.cooperativeRequest?.companyApplication.applicationPosition ?? item.cooperativeRequest?.position ?? null, applicationStatus: item.cooperativeRequest?.companyApplication.status ?? null, appliedAt: item.cooperativeRequest?.companyApplication.appliedAt ?? null, groupName: appointment.supervisionGroup.name
  })))
  const companies = Array.from(new Map(appointments.map(appointment => [appointment.companyId, { id: appointment.companyId, name: appointment.companyName, address: appointment.companyAddress, province: appointment.province, contactPerson: appointment.company.contactPerson, phone: appointment.company.phone, email: appointment.company.email, groupName: appointment.supervisionGroup.name, appointments: [appointment.id] }])).values())
  return { students, companies }
})
