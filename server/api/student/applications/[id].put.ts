export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสการสมัครไม่ถูกต้อง' })
  }

  const application = await prisma.companyApplication.findFirst({
    where: {
      id,
      studentUserId: user.id
    },
    include: {
      cooperativeCycle: true,
      company: true
    }
  })

  if (!application) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  if (!['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(application.status)) {
    throw createError({ statusCode: 400, message: 'สามารถแก้ไขได้เฉพาะรายการที่ยังไม่ได้รับการตอบรับหรือยืนยันข้อมูลเท่านั้น' })
  }

  if (application.cooperativeCycle.status !== 'OPEN_FOR_APPLICATION') {
    throw createError({ statusCode: 400, message: 'รอบสหกิจนี้ปิดรับคำร้องแล้ว ไม่สามารถแก้ไขข้อมูลได้' })
  }

  const body = await readBody(event)

  const allowedMethods = ['EMAIL', 'IN_PERSON', 'WEBSITE', 'OTHER']
  const applicationMethod = typeof body.applicationMethod === 'string' && allowedMethods.includes(body.applicationMethod)
    ? body.applicationMethod
    : application.applicationMethod

  let appliedAt = application.appliedAt
  if (body.appliedAt) {
    const parsed = new Date(body.appliedAt)
    if (!isNaN(parsed.getTime())) {
      appliedAt = parsed
    }
  }

  const note = body.note !== undefined ? (typeof body.note === 'string' ? body.note.trim() || null : null) : application.note
  const applicationPosition = body.applicationPosition !== undefined ? (typeof body.applicationPosition === 'string' ? body.applicationPosition.trim() || null : null) : application.applicationPosition
  const recipientName = body.recipientName !== undefined ? (typeof body.recipientName === 'string' ? body.recipientName.trim() || null : null) : application.recipientName
  const letterAddress = body.letterAddress !== undefined ? (typeof body.letterAddress === 'string' ? body.letterAddress.trim() || null : null) : application.letterAddress
  const internshipLocationName = body.internshipLocationName !== undefined ? (typeof body.internshipLocationName === 'string' ? body.internshipLocationName.trim() || null : null) : application.internshipLocationName

  let internshipLatitude = application.internshipLatitude
  if (body.internshipLatitude !== undefined) {
    if (body.internshipLatitude === null || body.internshipLatitude === '') {
      internshipLatitude = null
    } else {
      const lat = Number(body.internshipLatitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw createError({ statusCode: 400, message: 'ค่าละติจูดต้องอยู่ระหว่าง -90 ถึง 90' })
      }
      internshipLatitude = lat
    }
  }

  let internshipLongitude = application.internshipLongitude
  if (body.internshipLongitude !== undefined) {
    if (body.internshipLongitude === null || body.internshipLongitude === '') {
      internshipLongitude = null
    } else {
      const lng = Number(body.internshipLongitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw createError({ statusCode: 400, message: 'ค่าลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180' })
      }
      internshipLongitude = lng
    }
  }

  return await prisma.$transaction(async (tx) => {
    // If updating company details
    if (body.company && typeof body.company === 'object') {
      const companyInput = readCompanyInput({
        ...application.company,
        ...body.company,
        isActive: application.company.isActive
      })
      await tx.company.update({
        where: { id: application.companyId },
        data: companyInput
      })
    }

    const updated = await tx.companyApplication.update({
      where: { id },
      data: {
        applicationMethod,
        appliedAt,
        note,
        applicationPosition,
        recipientName,
        letterAddress,
        internshipLocationName,
        internshipLatitude,
        internshipLongitude
      },
      include: {
        company: true,
        cooperativeRequest: true,
        cooperativeCycle: true
      }
    })

    return updated
  })
})
