import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const type = getQuery(event).type === 'company' ? 'company' : 'student'
  const questions = await prisma.evaluationQuestion.findMany({ where: { cooperativeCycleId: cycleId, evaluationType: type, isActive: true }, orderBy: { sortOrder: 'asc' } })
  const appointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionRound: { cooperativeCycleId: cycleId } },
    orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
    include: {
      students: { include: { studentUser: { select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } } } },
      companyEvaluations: { orderBy: { updatedAt: 'desc' }, include: { answers: true } },
      studentEvaluations: { orderBy: { updatedAt: 'desc' }, include: { answers: true } }
    }
  })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(type === 'company' ? 'ประเมินสถานประกอบการ' : 'ประเมินนักศึกษา')
  worksheet.columns = type === 'company'
    ? [{ header: 'ชื่อสถานประกอบการ', key: 'companyName', width: 30 }, { header: 'คะแนนรวม', key: 'total', width: 12 }, ...questions.map((question, index) => ({ header: `ข้อคำถาม${index + 1}: ${question.label}`, key: `q${question.id}`, width: 28 }))]
    : [{ header: 'รหัสนักศึกษา', key: 'studentId', width: 18 }, { header: 'คำนำหน้า', key: 'prefix', width: 12 }, { header: 'ชื่อ-นามสกุล', key: 'name', width: 28 }, { header: 'คะแนนรวม', key: 'total', width: 12 }, ...questions.map((question, index) => ({ header: `ข้อคำถาม${index + 1}: ${question.label}`, key: `q${question.id}`, width: 28 }))]
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).alignment = { wrapText: true, vertical: 'middle' }
  worksheet.getRow(1).height = 36

  if (type === 'company') {
    for (const appointment of appointments) {
      const evaluation = appointment.companyEvaluations[0]
      const values = questions.map(question => evaluation?.answers.find(answer => answer.questionId === question.id)?.score ?? (evaluation as Record<string, unknown> | undefined)?.[question.scoreKey] ?? null)
      worksheet.addRow({ companyName: appointment.companyName, total: evaluation ? values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0) : null, ...Object.fromEntries(questions.map((question, index) => [`q${question.id}`, values[index]])) })
    }
  } else {
    for (const appointment of appointments) {
      for (const student of appointment.students) {
        const evaluation = appointment.studentEvaluations.find(item => item.studentUserId === student.studentUser.id)
        const values = questions.map(question => evaluation?.answers.find(answer => answer.questionId === question.id)?.score ?? (evaluation as Record<string, unknown> | undefined)?.[question.scoreKey] ?? null)
        worksheet.addRow({ studentId: student.studentUser.loginId, prefix: student.studentUser.prefix, name: [student.studentUser.firstName, student.studentUser.lastName].filter(Boolean).join(' '), total: evaluation ? values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0) : null, ...Object.fromEntries(questions.map((question, index) => [`q${question.id}`, values[index]])) })
      }
    }
  }

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="evaluation-${type}-${cycleId}.xlsx"`)
  return Buffer.from(await workbook.xlsx.writeBuffer())
})
