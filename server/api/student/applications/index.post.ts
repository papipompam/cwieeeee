export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  if (!user.cohortYear) {
    throw createError({ statusCode: 400, message: 'ไม่พบข้อมูลรุ่นนักศึกษาของท่านในระบบ' })
  }

  // Find active open cycle for student cohort
  const cycle = await prisma.cooperativeCycle.findFirst({
    where: {
      status: 'OPEN_FOR_APPLICATION',
      cohortYear: user.cohortYear
    }
  })

  if (!cycle) {
    throw createError({ statusCode: 400, message: `ไม่มีรอบสหกิจศึกษาที่เปิดรับคำร้องสำหรับรุ่น ${user.cohortYear} ในขณะนี้` })
  }

  const body = await readBody(event)

  // Validate application method
  const allowedMethods = ['EMAIL', 'IN_PERSON', 'WEBSITE', 'OTHER']
  const applicationMethod = typeof body.applicationMethod === 'string' && allowedMethods.includes(body.applicationMethod)
    ? body.applicationMethod
    : 'EMAIL'

  // Validate appliedAt
  let appliedAt = new Date()
  if (body.appliedAt) {
    const parsed = new Date(body.appliedAt)
    if (!isNaN(parsed.getTime())) {
      appliedAt = parsed
    }
  }

  const note = typeof body.note === 'string' ? body.note.trim() : null
  const applicationPosition = typeof body.applicationPosition === 'string' ? body.applicationPosition.trim() || null : null
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() || null : null
  const letterAddress = typeof body.letterAddress === 'string' ? body.letterAddress.trim() || null : null
  const internshipLocationName = typeof body.internshipLocationName === 'string' ? body.internshipLocationName.trim() || null : null

  let internshipLatitude: number | null = null
  if (body.internshipLatitude !== null && body.internshipLatitude !== undefined && body.internshipLatitude !== '') {
    const lat = Number(body.internshipLatitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw createError({ statusCode: 400, message: 'ค่าละติจูดต้องอยู่ระหว่าง -90 ถึง 90' })
    }
    internshipLatitude = lat
  }

  let internshipLongitude: number | null = null
  if (body.internshipLongitude !== null && body.internshipLongitude !== undefined && body.internshipLongitude !== '') {
    const lng = Number(body.internshipLongitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw createError({ statusCode: 400, message: 'ค่าลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180' })
    }
    internshipLongitude = lng
  }

  // Execute in an atomic transaction
  return await prisma.$transaction(async (tx) => {
    // Serialize submissions for this student and cycle so two clicks cannot create two applications.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${user.id}, ${cycle.id})`

    // 1. Check for existing active or confirmed application in this cycle
    const activeApp = await tx.companyApplication.findFirst({
      where: {
        studentUserId: user.id,
        cooperativeCycleId: cycle.id,
        status: { in: [...ACTIVE_APPLICATION_STATUSES, 'CONFIRMED'] }
      }
    })

    if (activeApp) {
      if (activeApp.status === 'CONFIRMED') {
        throw createError({ statusCode: 400, message: 'ท่านยืนยันสถานที่ฝึกงานและส่งคำร้องเรียบร้อยแล้ว' })
      }
      throw createError({ statusCode: 400, message: 'ท่านมีรายการสมัครที่อยู่ระหว่างดำเนินการแล้ว 1 รายการ ไม่สามารถสมัครเพิ่มได้' })
    }

    let companyId: number

    // 2. Either select existing company or create a new one
    if (body.companyId) {
      const existingCompany = await tx.company.findUnique({
        where: { id: Number(body.companyId) }
      })
      if (!existingCompany || !existingCompany.isActive) {
        throw createError({ statusCode: 400, message: 'ไม่พบสถานประกอบการที่เลือก หรือสถานประกอบการถูกปิดใช้งาน' })
      }
      companyId = existingCompany.id
    } else if (body.newCompany && typeof body.newCompany === 'object') {
      const companyInput = readCompanyInput({ ...body.newCompany, isActive: true })
      const [k1, k2] = hashIdentityKeyToLockKeys(companyInput.companyIdentityKey)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k1}, ${k2})`

      let company = await tx.company.findUnique({
        where: { companyIdentityKey: companyInput.companyIdentityKey }
      })

      if (!company) {
        company = await tx.company.create({
          data: companyInput
        })
      }

      if (!company.isActive) {
        throw createError({ statusCode: 400, message: 'สถานประกอบการนี้ถูกปิดใช้งาน' })
      }

      companyId = company.id
    } else {
      throw createError({ statusCode: 400, message: 'กรุณาเลือกสถานประกอบการ หรือระบุข้อมูลสถานประกอบการใหม่' })
    }

    // 3. Create the CompanyApplication with initial state SUBMITTED
    const newApplication = await tx.companyApplication.create({
      data: {
        studentUserId: user.id,
        cooperativeCycleId: cycle.id,
        companyId,
        status: 'SUBMITTED',
        applicationPosition,
        applicationMethod,
        appliedAt,
        note,
        recipientName,
        letterAddress,
        internshipLocationName,
        internshipLatitude,
        internshipLongitude
      },
      include: {
        company: true,
        cooperativeCycle: true
      }
    })

    return newApplication
  })
})
