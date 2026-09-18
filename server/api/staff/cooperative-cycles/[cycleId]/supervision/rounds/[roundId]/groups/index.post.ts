export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อกลุ่มนิเทศ' })
  }

  const readIds = (value: unknown, label: string) => {
    if (value === undefined) return []
    if (!Array.isArray(value)) {
      throw createError({ statusCode: 400, message: `${label}ต้องเป็นรายการ` })
    }
    return [...new Set(value.map(id => validatePositiveId(id, label)))]
  }

  const teacherUserIds = readIds(body?.teacherUserIds, 'รหัสอาจารย์')
  const companyIds = readIds(body?.companyIds, 'รหัสสถานประกอบการ')

  const group = await prisma.$transaction(async (tx) => {
    const existing = await tx.supervisionGroup.findFirst({
      where: { supervisionRoundId: roundId, name }
    })
    if (existing) {
      throw createError({ statusCode: 409, message: `มีกลุ่มนิเทศชื่อ "${name}" ในครั้งนี้แล้ว` })
    }

    if (teacherUserIds.length > 0) {
      const teachers = await tx.user.findMany({
        where: { id: { in: teacherUserIds }, role: 'TEACHER', isActive: true },
        select: { id: true }
      })
      if (teachers.length !== teacherUserIds.length) {
        throw createError({ statusCode: 400, message: 'มีอาจารย์ที่เลือกไม่พร้อมปฏิบัติงาน' })
      }

      const assignedTeachers = await tx.supervisionGroupTeacher.findMany({
        where: { supervisionRoundId: roundId, teacherUserId: { in: teacherUserIds } },
        include: { supervisionGroup: { select: { name: true } } }
      })
      if (assignedTeachers.length > 0) {
        throw createError({
          statusCode: 409,
          message: `อาจารย์ที่เลือกอยู่ในกลุ่ม "${assignedTeachers[0]!.supervisionGroup.name}" แล้วในครั้งนี้`
        })
      }
    }

    if (companyIds.length > 0) {
      const confirmedCompanies = await tx.company.findMany({
        where: {
          id: { in: companyIds },
          companyApplications: {
            some: {
              cooperativeCycleId: cycleId,
              cooperativeRequest: { is: { status: 'PLACEMENT_CONFIRMED' } }
            }
          }
        },
        select: { id: true }
      })
      if (confirmedCompanies.length !== companyIds.length) {
        throw createError({ statusCode: 400, message: 'มีสถานประกอบการที่ไม่มีนักศึกษายืนยันฝึกงานในรอบสหกิจนี้' })
      }

      const assignedCompanies = await tx.supervisionGroupCompany.findMany({
        where: { supervisionRoundId: roundId, companyId: { in: companyIds } },
        include: { supervisionGroup: { select: { name: true } } }
      })
      if (assignedCompanies.length > 0) {
        throw createError({
          statusCode: 409,
          message: `สถานประกอบการที่เลือกอยู่ในกลุ่ม "${assignedCompanies[0]!.supervisionGroup.name}" แล้วในครั้งนี้`
        })
      }
    }

    return tx.supervisionGroup.create({
      data: {
        supervisionRoundId: roundId,
        name,
        note: typeof body?.note === 'string' ? body.note.trim() : null,
        teachers: { create: teacherUserIds.map(teacherUserId => ({ supervisionRoundId: roundId, teacherUserId })) },
        companies: { create: companyIds.map(companyId => ({ supervisionRoundId: roundId, companyId })) }
      }
    })
  })

  const result = {
    id: group.id,
    name: group.name,
    notes: group.note,
    note: group.note,
    supervisionRoundId: group.supervisionRoundId,
    createdAt: group.createdAt
  }
  return {
    ...result,
    group: result
  }
})
