import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const classGroup = query.classGroup && query.classGroup !== 'all' ? Number(query.classGroup) : undefined
  const status = typeof query.status === 'string' ? query.status : 'all'
  const cycleStatusFilter = typeof query.cycleStatus === 'string' ? query.cycleStatus : 'all'
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      cycleEnrollments: { some: { cooperativeCycleId: cycleId } },
      ...(classGroup ? { classGroup } : {}),
      ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
      ...(search ? { OR: [
        { loginId: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ] } : {})
    },
    orderBy: [{ classGroup: 'asc' }, { loginId: 'asc' }],
    select: {
      loginId: true, prefix: true, firstName: true, lastName: true,
      companyApplications: {
        where: { cooperativeCycleId: cycleId },
        orderBy: { updatedAt: 'desc' },
        select: {
          status: true,
          applicationPosition: true,
          company: { select: { name: true, contactPerson: true, addressNo: true, moo: true, soi: true, street: true, subdistrict: true, district: true, province: true, postalCode: true } },
          cooperativeRequest: { select: { status: true, position: true, companyName: true, address: true } }
        }
      }
    }
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('นักศึกษาในรอบ')
  sheet.columns = [
    { header: 'รหัสนักศึกษา', key: 'studentId', width: 18 },
    { header: 'คำนำหน้า', key: 'prefix', width: 14 },
    { header: 'ชื่อ-นามสกุล', key: 'name', width: 30 },
    { header: 'ตำแหน่งงาน', key: 'position', width: 28 },
    { header: 'สถานประกอบการ', key: 'company', width: 36 },
    { header: 'ผู้ติดต่อหลัก', key: 'contact', width: 28 },
    { header: 'ที่อยู่', key: 'address', width: 60 }
  ]
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = 'A1:G1'
  sheet.getRow(1).font = { bold: true }

  for (const student of students.filter(item => matchesStudentCycleStatusFilter(deriveStudentCycleStatus(item.companyApplications).key, cycleStatusFilter))) {
    const application = student.companyApplications.find(item => item.cooperativeRequest?.status === 'PLACEMENT_CONFIRMED')
      || student.companyApplications.find(item => item.cooperativeRequest)
      || student.companyApplications[0]
    const company = application?.company
    const address = company ? [company.addressNo, company.moo ? `หมู่ ${company.moo}` : '', company.soi ? `ซอย ${company.soi}` : '', company.street ? `ถนน ${company.street}` : '', company.subdistrict, company.district, company.province, company.postalCode].filter(Boolean).join(' ') : ''
    sheet.addRow({
      studentId: student.loginId,
      prefix: student.prefix,
      name: [student.firstName, student.lastName].filter(Boolean).join(' '),
      position: application?.cooperativeRequest?.position || application?.applicationPosition || '',
      company: application?.cooperativeRequest?.companyName || company?.name || '',
      contact: company?.contactPerson || '',
      address: application?.cooperativeRequest?.address || address
    })
  }

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="cycle-students-${cycleId}.xlsx"`)
  return Buffer.from(await workbook.xlsx.writeBuffer())
})
