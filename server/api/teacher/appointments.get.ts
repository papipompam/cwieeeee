export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')

  const appointments = await prisma.supervisionAppointment.findMany({
    where: {
      status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'] },
      supervisionGroup: { teachers: { some: { teacherUserId: user.id } } }
    },
    include: {
      supervisionGroup: { select: { id: true, name: true } },
      supervisionRound: {
        select: {
          id: true,
          roundNo: true,
          cooperativeCycle: { select: { id: true, term: true, academicYear: true } }
        }
      },
      company: { select: { contactPerson: true, phone: true, email: true } },
      students: {
        include: {
          studentUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true } },
          cooperativeRequest: { select: { position: true } }
        }
      },
      teachers: {
        include: {
          teacherUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true, phone: true } }
        }
      },
      travelStops: {
        select: {
          travelPlan: { select: { travelDate: true, startLocation: true } }
        }
      }
    },
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }]
  })

  return appointments.map(appointment => ({
    id: appointment.id,
    companyName: appointment.companyName,
    companyAddress: appointment.companyAddress,
    province: appointment.province,
    scheduledDate: appointment.scheduledDate,
    period: appointment.period,
    timeNote: appointment.timeNote,
    status: appointment.status,
    changeReason: appointment.changeReason,
    cancelReason: appointment.cancelReason,
    group: appointment.supervisionGroup,
    round: appointment.supervisionRound,
    companyContact: appointment.company,
    students: appointment.students.map(student => ({
      studentId: student.studentUser.loginId,
      name: [student.studentUser.prefix, student.studentUser.firstName, student.studentUser.lastName].filter(Boolean).join(' '),
      position: student.cooperativeRequest?.position ?? null
    })),
    teachers: appointment.teachers.map(teacher => ({
      teacherId: teacher.teacherUser.loginId,
      name: [teacher.teacherUser.prefix, teacher.teacherUser.firstName, teacher.teacherUser.lastName].filter(Boolean).join(' '),
      phone: teacher.teacherUser.phone
    })),
    travelPlans: appointment.travelStops.map(stop => stop.travelPlan)
  }))
})
