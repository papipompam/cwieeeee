export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const body = await readBody(event)
  const groupCount = Math.trunc(Number(body?.groupCount))
  if (groupCount < 1 || groupCount > 50) {
    throw createError({ statusCode: 400, message: 'จำนวนกลุ่มต้องอยู่ระหว่าง 1–50 กลุ่ม' })
  }
  const startDate = new Date(cycle.internshipStartDate)
  const budget = {
    startLocation: 'มหาวิทยาลัย', fuelRate: 4, perDiemRate: 240, perDiemDays: 1,
    lodgingRate: 1500, nights: 0, rooms: 0, note: 'สร้างจากการจัดกลุ่มอัตโนมัติ'
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${19_100}, ${cycleId})`

    const requests = await tx.cooperativeRequest.findMany({
      where: {
        status: 'PLACEMENT_CONFIRMED',
        companyApplication: { cooperativeCycleId: cycleId }
      },
      select: {
        id: true,
        companyApplication: {
          select: {
            studentUserId: true,
            company: {
              select: {
                id: true, name: true, addressNo: true, moo: true, soi: true, street: true,
                subdistrict: true, district: true, province: true, postalCode: true,
                latitude: true, longitude: true
              }
            }
          }
        }
      }
    })

    const companyMap = new Map<number, {
      company: typeof requests[number]['companyApplication']['company']
      students: Array<{ studentUserId: number; requestId: number }>
    }>()
    for (const request of requests) {
      const company = request.companyApplication.company
      const entry = companyMap.get(company.id) || { company, students: [] }
      entry.students.push({ studentUserId: request.companyApplication.studentUserId, requestId: request.id })
      companyMap.set(company.id, entry)
    }
    if (companyMap.size === 0) {
      throw createError({ statusCode: 400, message: 'ยังไม่มีสถานประกอบการที่ยืนยันแล้วสำหรับจัดกลุ่ม' })
    }

    if (groupCount > companyMap.size) {
      throw createError({ statusCode: 400, message: `จำนวนกลุ่มต้องไม่เกินสถานประกอบการที่ยืนยันแล้ว ${companyMap.size} แห่ง` })
    }
    const teachers = await tx.user.findMany({
      where: { role: 'TEACHER', isActive: true },
      select: {
        id: true,
        _count: { select: { supervisionGroupTeachers: true } }
      }
    })
    teachers.sort((a, b) => a._count.supervisionGroupTeachers - b._count.supervisionGroupTeachers || a.id - b.id)
    if (teachers.length < groupCount) {
      throw createError({
        statusCode: 400,
        message: `ต้องใช้อาจารย์อย่างน้อย ${groupCount} ท่าน แต่มีอาจารย์ที่พร้อมใช้งาน ${teachers.length} ท่าน`
      })
    }
    const teachersPerGroup = Math.min(2, Math.floor(teachers.length / groupCount))

    const companies = [...companyMap.values()].map(({ company, students }) => ({
      id: company.id,
      name: company.name,
      province: company.province,
      district: company.district,
      subdistrict: company.subdistrict,
      latitude: company.latitude,
      longitude: company.longitude,
      studentCount: students.length
    }))
    const groupedCompanies = groupCompaniesByLocation(companies, groupCount)

    const lastRound = await tx.supervisionRound.findFirst({
      where: { cooperativeCycleId: cycleId },
      orderBy: { roundNo: 'desc' },
      select: { roundNo: true }
    })
    const round = await tx.supervisionRound.create({
      data: {
        cooperativeCycleId: cycleId,
        roundNo: (lastRound?.roundNo ?? 0) + 1,
        name: `การนิเทศครั้งที่ ${(lastRound?.roundNo ?? 0) + 1}`,
        status: 'PUBLISHED'
      }
    })

    for (const [groupIndex, companyGroup] of groupedCompanies.entries()) {
      const teacherIds = teachers
        .slice(groupIndex * teachersPerGroup, (groupIndex + 1) * teachersPerGroup)
        .map(teacher => teacher.id)
      const group = await tx.supervisionGroup.create({
        data: {
          supervisionRoundId: round.id,
          name: `กลุ่มที่ ${groupIndex + 1}`,
          note: `จัดกลุ่มอัตโนมัติตามพื้นที่ใกล้เคียง`,
          teachers: { create: teacherIds.map(teacherUserId => ({ supervisionRoundId: round.id, teacherUserId })) },
          companies: { create: companyGroup.map(company => ({ supervisionRoundId: round.id, companyId: company.id })) }
        }
      })

      const appointments: Array<{ id: number; date: Date; company: typeof companyGroup[number] }> = []
      for (const [companyIndex, companySummary] of companyGroup.entries()) {
        const companyEntry = companyMap.get(companySummary.id)!
        const company = companyEntry.company
        const scheduledDate = new Date(startDate)
        scheduledDate.setUTCDate(scheduledDate.getUTCDate() + Math.floor(companyIndex / 2))
        const period = companyIndex % 2 === 0 ? 'MORNING' : 'AFTERNOON'
        const address = [company.addressNo, company.moo ? `หมู่ ${company.moo}` : '', company.soi ? `ซอย${company.soi}` : '', company.street ? `ถนน${company.street}` : '', company.subdistrict ? `ต.${company.subdistrict}` : '', company.district ? `อ.${company.district}` : '', company.province ? `จ.${company.province}` : '', company.postalCode].filter(Boolean).join(' ')
        const appointment = await tx.supervisionAppointment.create({
          data: {
            supervisionRoundId: round.id,
            supervisionGroupId: group.id,
            companyId: company.id,
            companyName: company.name,
            companyAddress: address,
            province: company.province,
            latitude: company.latitude,
            longitude: company.longitude,
            scheduledDate,
            period,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            teachers: { create: teacherIds.map(teacherUserId => ({ teacherUserId })) },
            students: {
              create: companyEntry.students.map(student => ({
                studentUserId: student.studentUserId,
                cooperativeRequestId: student.requestId
              }))
            }
          }
        })
        appointments.push({ id: appointment.id, date: scheduledDate, company: companySummary })
      }

      const appointmentsByDay = new Map<string, typeof appointments>()
      for (const appointment of appointments) {
        const key = appointment.date.toISOString().slice(0, 10)
        appointmentsByDay.set(key, [...(appointmentsByDay.get(key) || []), appointment])
      }
      for (const dayAppointments of appointmentsByDay.values()) {
        await tx.supervisionTravelPlan.create({
          data: {
            supervisionRoundId: round.id,
            supervisionGroupId: group.id,
            travelDate: dayAppointments[0]!.date,
            startLocation: budget.startLocation,
            fuelRate: budget.fuelRate,
            lodgingRate: budget.lodgingRate,
            lodgingNights: budget.nights,
            lodgingRooms: budget.rooms,
            note: budget.note,
            stops: {
              create: dayAppointments.map((appointment, index) => ({
                appointmentId: appointment.id,
                sequence: index + 1,
                distanceKmFromPrevious: index === 0 ? 0 : distanceKm(dayAppointments[index - 1]!.company, appointment.company)
              }))
            },
            travellers: {
              create: teacherIds.map(teacherUserId => ({
                teacherUserId,
                perDiemRate: budget.perDiemRate,
                perDiemDays: budget.perDiemDays,
                lodgingRate: 0,
                nights: 0,
                personsPerRoom: 1
              }))
            }
          }
        })
      }
    }

    return { roundId: round.id, roundNo: round.roundNo, groupsCount: groupedCompanies.length, companiesCount: companyMap.size }
  })

  return result
})
