import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requests = await prisma.cooperativeRequest.findMany({
    where: { status: 'PLACEMENT_CONFIRMED', companyApplication: { cooperativeCycleId: cycleId } },
    orderBy: [{ companyApplication: { studentUser: { loginId: 'asc' } } }, { id: 'asc' }],
    include: { companyApplication: { include: { studentUser: true } } }
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('นักศึกษาและสถานที่ฝึก')
  sheet.columns = [
    { header: 'รหัสนักศึกษา', key: 'studentId', width: 18 },
    { header: 'คำนำหน้า', key: 'prefix', width: 14 },
    { header: 'ชื่อ', key: 'firstName', width: 20 },
    { header: 'นามสกุล', key: 'lastName', width: 22 },
    { header: 'รุ่น', key: 'cohortYear', width: 12 },
    { header: 'หมู่เรียน', key: 'classGroup', width: 12 },
    { header: 'สถานประกอบการ', key: 'companyName', width: 36 },
    { header: 'สถานที่ฝึก', key: 'location', width: 30 },
    { header: 'ตำแหน่งงาน', key: 'position', width: 25 },
    { header: 'จังหวัด', key: 'province', width: 18 },
    { header: 'วันที่ยืนยัน', key: 'confirmedAt', width: 18 }
  ]
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = 'A1:K1'
  sheet.getRow(1).font = { bold: true }

  for (const request of requests) {
    const student = request.companyApplication.studentUser
    sheet.addRow({
      studentId: student.loginId,
      prefix: student.prefix,
      firstName: student.firstName,
      lastName: student.lastName,
      cohortYear: student.cohortYear,
      classGroup: student.classGroup,
      companyName: request.companyName,
      location: request.internshipLocationName,
      position: request.position,
      province: request.province,
      confirmedAt: request.confirmedAt ? request.confirmedAt.toISOString().slice(0, 10) : null
    })
  }

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="placements-${cycleId}.xlsx"`)
  return Buffer.from(await workbook.xlsx.writeBuffer())
})
