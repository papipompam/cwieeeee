export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event)
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  await getSupervisionRound(cycleId, roundId)

  // Find all companies already assigned to any group in this round
  const assigned = await prisma.supervisionGroupCompany.findMany({
    where: { supervisionRoundId: roundId },
    select: { companyId: true }
  })
  const assignedCompanyIds = assigned.map((a: { companyId: number }) => a.companyId)

  // Find confirmed placements in this cycle
  const confirmedRequests = await prisma.cooperativeRequest.findMany({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: {
        cooperativeCycleId: cycleId
      }
    },
    include: {
      companyApplication: {
        include: {
          company: true,
          studentUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              cohortYear: true,
              classGroup: true,
              phone: true
            }
          }
        }
      }
    }
  })

  // Group by companyId
  const companyMap = new Map<number, {
    company: any
    students: any[]
  }>()

  for (const req of confirmedRequests) {
    const comp = req.companyApplication.company
    if (!comp || assignedCompanyIds.includes(comp.id)) continue

    if (!companyMap.has(comp.id)) {
      companyMap.set(comp.id, {
        company: {
          id: comp.id,
          name: comp.name,
          province: comp.province,
          district: comp.district,
          subdistrict: comp.subdistrict,
          addressNo: comp.addressNo,
          latitude: comp.latitude,
          longitude: comp.longitude,
          contactPerson: comp.contactPerson,
          phone: comp.phone
        },
        students: []
      })
    }

    companyMap.get(comp.id)!.students.push({
      requestId: req.id,
      ...req.companyApplication.studentUser
    })
  }

  const companies = Array.from(companyMap.values()).map(item => ({
    companyId: item.company.id,
    companyName: item.company.name,
    province: item.company.province,
    district: item.company.district,
    subdistrict: item.company.subdistrict,
    addressNo: item.company.addressNo,
    address: `${item.company.addressNo || ''} ${item.company.subdistrict || ''} ${item.company.district || ''} ${item.company.province || ''}`.trim(),
    contactPerson: item.company.contactPerson,
    phone: item.company.phone,
    studentCount: item.students.length,
    students: item.students.map(s => ({
      id: s.id,
      studentId: s.loginId,
      prefix: s.prefix,
      firstName: s.firstName,
      lastName: s.lastName,
      major: `หมู่ ${s.classGroup || 1}`,
      position: 'นักศึกษาสหกิจ'
    }))
  }))

  return { companies }
})
