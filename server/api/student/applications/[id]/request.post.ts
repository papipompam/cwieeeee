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
      cooperativeRequest: true
    }
  })

  if (!application) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  if (application.status !== 'ACCEPTED') {
    throw createError({ statusCode: 400, message: 'สามารถส่งคำร้องได้เฉพาะรายการที่ได้รับการตอบรับจากสถานประกอบการแล้วเท่านั้น' })
  }

  if (application.cooperativeRequest) {
    throw createError({ statusCode: 400, message: 'รายการนี้ส่งคำร้องไปแล้ว' })
  }

  if (application.cooperativeCycle.status !== 'OPEN_FOR_APPLICATION') {
    throw createError({ statusCode: 400, message: 'รอบสหกิจนี้ปิดรับคำร้องแล้ว ไม่สามารถส่งคำร้องได้' })
  }

  // Check if student already submitted a request in this cycle
  const existingRequestInCycle = await prisma.cooperativeRequest.findFirst({
    where: {
      companyApplication: {
        studentUserId: user.id,
        cooperativeCycleId: application.cooperativeCycleId
      }
    }
  })

  if (existingRequestInCycle) {
    throw createError({ statusCode: 400, message: 'ท่านได้ส่งคำร้องในรอบสหกิจนี้ไปแล้ว ไม่สามารถส่งคำร้องซ้ำได้' })
  }

  // Include company for snapshot
  const appWithCompany = await prisma.companyApplication.findFirst({
    where: { id, studentUserId: user.id },
    include: {
      company: true,
      cooperativeCycle: true,
      cooperativeRequest: true
    }
  })

  if (!appWithCompany) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
  }

  const company = appWithCompany.company
  const companyAddress = [
    company.addressNo,
    company.moo ? `หมู่ ${company.moo}` : null,
    company.soi,
    company.street,
    company.subdistrict,
    company.district
  ].filter(Boolean).join(' ')

  const fullAddress = [
    companyAddress,
    company.province,
    company.postalCode
  ].filter(Boolean).join(' ')

  const body = await readBody(event).catch(() => ({}))
  const recipientName = typeof body?.recipientName === 'string' && body.recipientName.trim()
    ? body.recipientName.trim()
    : (appWithCompany.recipientName || company.contactPerson || '')
  const recipientPosition = typeof body?.recipientPosition === 'string' ? body.recipientPosition.trim() : null
  const studentNote = typeof body?.studentNote === 'string' ? body.studentNote.trim() : null

  return await prisma.$transaction(async (tx) => {
    // 1. Lock & update application to CONFIRMED
    await tx.companyApplication.update({
      where: { id: appWithCompany.id },
      data: {
        status: 'CONFIRMED'
      }
    })

    // 2. Create CooperativeRequest with full snapshot
    const request = await tx.cooperativeRequest.create({
      data: {
        companyApplicationId: appWithCompany.id,
        status: 'SUBMITTED',
        companyName: company.name,
        internshipLocationName: appWithCompany.internshipLocationName || company.name,
        position: appWithCompany.applicationPosition || 'นักศึกษาฝึกงาน',
        address: companyAddress,
        province: company.province,
        latitude: appWithCompany.internshipLatitude ?? company.latitude,
        longitude: appWithCompany.internshipLongitude ?? company.longitude,
        recipientName,
        recipientPosition,
        letterAddress: appWithCompany.letterAddress || fullAddress,
        appliedAt: appWithCompany.appliedAt,
        confirmedAt: new Date(),
        studentNote
      }
    })

    // 3. Create notification for student
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'ส่งคำร้องสถานที่ฝึกงานเรียบร้อย',
        message: `คำร้องสำหรับ ${company.name} ถูกส่งต่อให้เจ้าหน้าที่แล้ว`,
        link: `/student/requests/${request.id}`
      }
    })

    // 4. Create notification for staff
    const staffs = await tx.user.findMany({
      where: { role: 'STAFF', isActive: true },
      select: { id: true }
    })
    if (staffs.length > 0) {
      await tx.notification.createMany({
        data: staffs.map(s => ({
          userId: s.id,
          title: 'มีคำร้องสถานที่ฝึกงานใหม่',
          message: `${user.prefix}${user.firstName} ${user.lastName} ส่งคำร้องสำหรับ ${company.name}`,
          link: `/staff/cooperative-cycles/${appWithCompany.cooperativeCycleId}/applications`
        }))
      })
    }

    return request
  })
})
