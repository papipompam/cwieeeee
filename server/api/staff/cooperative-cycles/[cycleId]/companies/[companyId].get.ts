export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event)
  const companyId = validatePositiveId(getRouterParam(event, 'companyId'), 'รหัสสถานประกอบการ')
  const company = await prisma.company.findFirst({
    where: { id: companyId, companyApplications: { some: { cooperativeCycleId: cycleId } } },
    include: {
      companyApplications: {
        where: { cooperativeCycleId: cycleId, cooperativeRequest: { isNot: null } },
        include: { studentUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true, phone: true } }, cooperativeRequest: true },
        orderBy: { updatedAt: 'desc' }
      }
    }
  })
  if (!company) throw createError({ statusCode: 404, message: 'ไม่พบสถานประกอบการในรอบสหกิจนี้' })
  const letters = await prisma.requestLetterVersion.findMany({
    where: { participants: { some: { cooperativeRequest: { companyApplication: { cooperativeCycleId: cycleId, companyId } } } } },
    include: { participants: { include: { cooperativeRequest: { include: { companyApplication: { include: { studentUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true } } } } } } } }, responseDocuments: { orderBy: { version: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' }
  })
  return { company, cycle: { term: cycle.term, academicYear: cycle.academicYear, internshipStartDate: cycle.internshipStartDate, internshipEndDate: cycle.internshipEndDate, internshipHours: cycle.internshipHours }, letters, latestDocumentRequestId: letters.find(letter => letter.isActive)?.cooperativeRequestId || letters[0]?.cooperativeRequestId || null }
})
