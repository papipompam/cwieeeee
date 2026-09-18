export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = validatePositiveId(getRouterParam(event, 'id'), 'รหัสการสมัคร')
  const body = await readBody(event).catch(() => ({}))

  return prisma.$transaction(async (tx) => {
    const application = await tx.companyApplication.findFirst({
      where: { id, studentUserId: user.id },
      include: { company: true, cooperativeCycle: true, cooperativeRequest: true }
    })
    if (!application) throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${user.id}, ${application.cooperativeCycleId})`
    const current = await tx.companyApplication.findFirst({
      where: { id, studentUserId: user.id },
      include: { company: true, cooperativeCycle: true, cooperativeRequest: true }
    })
    if (!current) throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลการสมัคร' })
    if (current.status !== 'ACCEPTED') throw createError({ statusCode: 400, message: 'สามารถส่งคำร้องได้เฉพาะรายการที่ได้รับการตอบรับจากสถานประกอบการแล้วเท่านั้น' })
    if (current.cooperativeRequest) throw createError({ statusCode: 409, message: 'รายการนี้ส่งคำร้องไปแล้ว' })
    if (current.cooperativeCycle.status !== 'OPEN_FOR_APPLICATION') throw createError({ statusCode: 400, message: 'รอบสหกิจนี้ปิดรับคำร้องแล้ว ไม่สามารถส่งคำร้องได้' })

    const existingRequest = await tx.cooperativeRequest.findFirst({
      where: { companyApplication: { studentUserId: user.id, cooperativeCycleId: current.cooperativeCycleId } }
    })
    if (existingRequest) throw createError({ statusCode: 409, message: 'ท่านได้ส่งคำร้องในรอบสหกิจนี้ไปแล้ว ไม่สามารถส่งคำร้องซ้ำได้' })

    const companyAddress = [current.company.addressNo, current.company.moo ? `หมู่ ${current.company.moo}` : null, current.company.soi, current.company.street, current.company.subdistrict, current.company.district].filter(Boolean).join(' ')
    const recipientName = typeof body?.recipientName === 'string' && body.recipientName.trim()
      ? body.recipientName.trim()
      : (current.recipientName || current.company.contactPerson || '')
    const recipientPosition = typeof body?.recipientPosition === 'string' ? body.recipientPosition.trim() : null
    const studentNote = typeof body?.studentNote === 'string' ? body.studentNote.trim() : null

    const updated = await tx.companyApplication.updateMany({
      where: { id: current.id, status: 'ACCEPTED' },
      data: { status: 'CONFIRMED' }
    })
    if (!updated.count) throw createError({ statusCode: 409, message: 'สถานะการสมัครเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ' })

    const request = await tx.cooperativeRequest.create({
      data: {
        companyApplicationId: current.id,
        status: 'SUBMITTED',
        companyName: current.company.name,
        internshipLocationName: current.internshipLocationName || current.company.name,
        position: current.applicationPosition || 'นักศึกษาฝึกงาน',
        address: companyAddress,
        province: current.company.province,
        latitude: current.internshipLatitude ?? current.company.latitude,
        longitude: current.internshipLongitude ?? current.company.longitude,
        recipientName,
        recipientPosition,
        letterAddress: current.letterAddress || [companyAddress, current.company.province, current.company.postalCode].filter(Boolean).join(' '),
        appliedAt: current.appliedAt,
        confirmedAt: new Date(),
        studentNote
      }
    })

    await tx.notification.create({
      data: { userId: user.id, title: 'ส่งคำร้องสถานที่ฝึกงานเรียบร้อย', message: `คำร้องสำหรับ ${current.company.name} ถูกส่งต่อให้เจ้าหน้าที่แล้ว`, link: `/student/requests/${request.id}` }
    })
    const staffs = await tx.user.findMany({ where: { role: 'STAFF', isActive: true }, select: { id: true } })
    if (staffs.length) {
      await tx.notification.createMany({
        data: staffs.map(staff => ({
          userId: staff.id,
          title: 'มีคำร้องสถานที่ฝึกงานใหม่',
          message: `${user.prefix}${user.firstName} ${user.lastName} ส่งคำร้องสำหรับ ${current.company.name}`,
          link: `/staff/cooperative-cycles/${current.cooperativeCycleId}/applications`
        }))
      })
    }

    return request
  })
})
