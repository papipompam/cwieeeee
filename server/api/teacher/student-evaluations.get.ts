export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'TEACHER')
  const appointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionGroup: { teachers: { some: { teacherUserId: user.id } } }, status: { in: ['PUBLISHED', 'RESCHEDULED', 'COMPLETED'] } },
    include: {
      supervisionGroup: { select: { name: true } },
      supervisionRound: { select: { roundNo: true, cooperativeCycle: { select: { id: true, term: true, academicYear: true, evaluationQuestions: { where: { evaluationType: 'student', isActive: true }, orderBy: { sortOrder: 'asc' } } } } } },
      students: { include: { studentUser: { select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } }, cooperativeRequest: { select: { position: true } } } },
      studentEvaluations: { where: { teacherUserId: user.id } }
    },
    orderBy: { scheduledDate: 'asc' }
  })

  return appointments.flatMap(appointment => appointment.students.map(({ studentUser, cooperativeRequest }) => {
    const evaluation = appointment.studentEvaluations.find(item => item.studentUserId === studentUser.id)
    return {
      appointmentId: appointment.id,
      appointmentStatus: appointment.status,
      companyName: appointment.companyName,
      groupName: appointment.supervisionGroup.name,
      roundNo: appointment.supervisionRound.roundNo,
      cycle: appointment.supervisionRound.cooperativeCycle,
      student: { id: studentUser.id, studentId: studentUser.loginId, name: [studentUser.prefix, studentUser.firstName, studentUser.lastName].filter(Boolean).join(' '), position: cooperativeRequest?.position ?? null },
      evaluation: evaluation ? {
        responsibilityScore: evaluation.responsibilityScore,
        disciplineScore: evaluation.disciplineScore,
        communicationScore: evaluation.communicationScore,
        knowledgeScore: evaluation.knowledgeScore,
        workQualityScore: evaluation.workQualityScore,
        problemSolvingScore: evaluation.problemSolvingScore,
        strengths: evaluation.strengths,
        problems: evaluation.problems,
        recommendations: evaluation.recommendations,
        followUp: evaluation.followUp
      } : null
    }
  }))
})
