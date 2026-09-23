import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const cohortYear = query.cohortYear ? Number(query.cohortYear) : undefined
  const classGroup = query.classGroup ? Number(query.classGroup) : undefined
  const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined

  const where: any = {
    role: 'STUDENT',
    ...(cohortYear && Number.isInteger(cohortYear) ? { cohortYear } : {}),
    ...(classGroup && Number.isInteger(classGroup) ? { classGroup } : {}),
    ...(isActive === undefined ? {} : { isActive })
  }

  if (search) {
    where.OR = [
      { loginId: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ]
  }

  const students = await prisma.user.findMany({
    where,
    orderBy: [{ cohortYear: 'desc' }, { classGroup: 'asc' }, { loginId: 'asc' }]
  })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('รายชื่อนักศึกษา')
  worksheet.columns = [
    { header: 'รหัสนักศึกษา', key: 'studentId', width: 18 },
    { header: 'คำนำหน้า', key: 'prefix', width: 14 },
    { header: 'ชื่อ', key: 'firstName', width: 20 },
    { header: 'นามสกุล', key: 'lastName', width: 22 },
    { header: 'รุ่น', key: 'cohortYear', width: 12 },
    { header: 'หมู่เรียน', key: 'classGroup', width: 12 },
    { header: 'สถานะใช้งาน', key: 'isActive', width: 16 }
  ]
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = 'A1:G1'
  worksheet.getRow(1).font = { bold: true }

  students.forEach(student => worksheet.addRow({
    studentId: student.loginId,
    prefix: student.prefix,
    firstName: student.firstName,
    lastName: student.lastName,
    cohortYear: student.cohortYear,
    classGroup: student.classGroup,
    isActive: student.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'
  }))

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', 'attachment; filename="students.xlsx"')
  return Buffer.from(await workbook.xlsx.writeBuffer())
})
