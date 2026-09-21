import ExcelJS from 'exceljs'

const studentQuestions = [
  ['responsibilityScore', 'ความรับผิดชอบและตรงต่อเวลา'],
  ['disciplineScore', 'วินัยและจรรยาบรรณในการทำงาน'],
  ['communicationScore', 'การสื่อสารและทำงานร่วมกับผู้อื่น'],
  ['knowledgeScore', 'การประยุกต์ใช้ความรู้กับงาน'],
  ['workQualityScore', 'คุณภาพและความก้าวหน้าของงาน'],
  ['problemSolvingScore', 'การเรียนรู้และแก้ไขปัญหา']
] as const

const companyQuestions = [
  ['workAlignmentScore', 'ความสอดคล้องของงานกับสาขา'],
  ['workScopeScore', 'ขอบเขตและความท้าทายของงาน'],
  ['learningOpportunityScore', 'โอกาสเรียนรู้และพัฒนาทักษะ'],
  ['supervisorReadinessScore', 'ความพร้อมของผู้ควบคุมงาน'],
  ['studentSupportScore', 'การดูแลและช่วยเหลือนักศึกษา'],
  ['environmentScore', 'สภาพแวดล้อมในการทำงาน'],
  ['safetyScore', 'ความปลอดภัยและสุขอนามัย'],
  ['resourcesScore', 'อุปกรณ์และทรัพยากร'],
  ['welfareScore', 'สวัสดิการ/ค่าตอบแทน'],
  ['travelScore', 'ความสะดวกและปลอดภัยในการเดินทาง'],
  ['transportScore', 'การเข้าถึงขนส่งสาธารณะ'],
  ['accommodationScore', 'ความเหมาะสมของที่พัก'],
  ['coordinationScore', 'การประสานงานกับมหาวิทยาลัย']
] as const

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const type = getQuery(event).type === 'company' ? 'company' : 'student'
  const questions = type === 'company' ? companyQuestions : studentQuestions
  const appointments = await prisma.supervisionAppointment.findMany({
    where: { supervisionRound: { cooperativeCycleId: cycleId } },
    orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
    include: {
      students: { include: { studentUser: { select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } } } },
      studentEvaluations: { orderBy: { updatedAt: 'desc' } },
      companyEvaluations: { orderBy: { updatedAt: 'desc' } }
    }
  })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(type === 'company' ? 'ประเมินสถานประกอบการ' : 'ประเมินนักศึกษา')
  worksheet.columns = type === 'company'
    ? [{ header: 'ชื่อสถานประกอบการ', key: 'companyName', width: 30 }, { header: 'คะแนนรวม', key: 'total', width: 12 }, ...questions.map(([, label], index) => ({ header: `ข้อคำถาม${index + 1}: ${label}`, key: questions[index]![0], width: 28 }))]
    : [{ header: 'รหัสนักศึกษา', key: 'studentId', width: 18 }, { header: 'คำนำหน้า', key: 'prefix', width: 12 }, { header: 'ชื่อ-นามสกุล', key: 'name', width: 28 }, { header: 'คะแนนรวม', key: 'total', width: 12 }, ...questions.map(([, label], index) => ({ header: `ข้อคำถาม${index + 1}: ${label}`, key: questions[index]![0], width: 28 }))]
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).alignment = { wrapText: true, vertical: 'middle' }
  worksheet.getRow(1).height = 36

  if (type === 'company') {
    for (const appointment of appointments) {
      const evaluation = appointment.companyEvaluations[0]
      const values = questions.map(([key]) => (evaluation as Record<string, unknown> | undefined)?.[key] ?? null)
      worksheet.addRow({ companyName: appointment.companyName, total: values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0), ...Object.fromEntries(questions.map(([key], index) => [key, values[index]])) })
    }
  } else {
    for (const appointment of appointments) {
      for (const student of appointment.students) {
        const evaluation = appointment.studentEvaluations.find(item => item.studentUserId === student.studentUser.id)
        const values = questions.map(([key]) => (evaluation as Record<string, unknown> | undefined)?.[key] ?? null)
        worksheet.addRow({ studentId: student.studentUser.loginId, prefix: student.studentUser.prefix, name: [student.studentUser.firstName, student.studentUser.lastName].filter(Boolean).join(' '), total: values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0), ...Object.fromEntries(questions.map(([key], index) => [key, values[index]])) })
      }
    }
  }

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="evaluation-${type}-${cycleId}.xlsx"`)
  return Buffer.from(await workbook.xlsx.writeBuffer())
})
