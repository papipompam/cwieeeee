export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')
  const group = await prisma.supervisionGroup.findFirst({
    where: { id: groupId, teachers: { some: { teacherUserId: teacher.id } }, supervisionRound: { status: 'PUBLISHED' } },
    include: {
      supervisionRound: { select: { id: true, cooperativeCycleId: true, cooperativeCycle: { select: { status: true } } } },
      teachers: { select: { teacherUserId: true } },
      companies: { select: { companyId: true } },
      appointments: { orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }], select: { companyId: true, scheduledDate: true, period: true, timeNote: true, status: true, _count: { select: { studentEvaluations: true, companyEvaluations: true, photos: true, travelStops: true } } } },
      travelPlans: { select: { id: true } }
    }
  })
  if (!group) throw createError({ statusCode: 404, message: 'ไม่พบกลุ่มนิเทศที่คุณรับผิดชอบ' })

  const [assignedTeachers, assignedCompanies, teachers, requests] = await Promise.all([
    prisma.supervisionGroupTeacher.findMany({ where: { supervisionRoundId: group.supervisionRoundId, supervisionGroupId: { not: groupId } }, select: { teacherUserId: true } }),
    prisma.supervisionGroupCompany.findMany({ where: { supervisionRoundId: group.supervisionRoundId, supervisionGroupId: { not: groupId } }, select: { companyId: true } }),
    prisma.user.findMany({ where: { role: 'TEACHER', isActive: true }, orderBy: { loginId: 'asc' }, select: { id: true, loginId: true, prefix: true, firstName: true, lastName: true } }),
    prisma.cooperativeRequest.findMany({ where: { status: 'PLACEMENT_CONFIRMED', companyApplication: { cooperativeCycleId: group.supervisionRound.cooperativeCycleId } }, select: { companyApplication: { select: { company: { select: { id: true, name: true, province: true } } } } } })
  ])
  const busyTeacherIds = new Set(assignedTeachers.map(item => item.teacherUserId))
  const busyCompanyIds = new Set(assignedCompanies.map(item => item.companyId))
  const companies = new Map(requests.map(item => [item.companyApplication.company.id, item.companyApplication.company]))

  return {
    id: group.id,
    name: group.name,
    editable: group.supervisionRound.cooperativeCycle.status !== 'CLOSED' && group.travelPlans.length === 0 && group.appointments.every(item => ['PUBLISHED', 'RESCHEDULED'].includes(item.status) && !item._count.studentEvaluations && !item._count.companyEvaluations && !item._count.photos && !item._count.travelStops),
    teacherUserIds: group.teachers.map(item => item.teacherUserId),
    appointments: group.appointments.map(item => ({ companyId: item.companyId, scheduledDate: item.scheduledDate.toISOString().slice(0, 10), period: item.period, timeNote: item.timeNote })),
    teachers: teachers.filter(item => !busyTeacherIds.has(item.id)).map(item => ({ id: item.id, name: `${item.prefix || ''}${item.firstName || ''} ${item.lastName || ''}`.trim(), loginId: item.loginId })),
    companies: [...companies.values()].filter(item => !busyCompanyIds.has(item.id)).map(item => ({ id: item.id, name: item.name, province: item.province }))
  }
})
