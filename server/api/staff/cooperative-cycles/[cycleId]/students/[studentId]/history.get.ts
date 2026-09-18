export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const studentId = validatePositiveId(getRouterParam(event, 'studentId'), 'รหัสนักศึกษา')

  const student = await prisma.user.findFirst({
    where: { id: studentId, role: 'STUDENT' },
    select: {
      id: true,
      loginId: true,
      prefix: true,
      firstName: true,
      lastName: true,
      gender: true,
      phone: true,
      cohortYear: true,
      classGroup: true,
      isActive: true,
      companyApplications: {
        orderBy: [
          { cooperativeCycle: { academicYear: 'desc' } },
          { cooperativeCycle: { term: 'desc' } },
          { updatedAt: 'desc' }
        ],
        include: {
          cooperativeCycle: {
            select: {
              id: true,
              term: true,
              academicYear: true,
              cohortYear: true,
              status: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              province: true
            }
          },
          cooperativeRequest: {
            select: {
              id: true,
              status: true,
              companyName: true,
              position: true,
              confirmedAt: true,
              returnedReason: true,
              rejectedReason: true
            }
          }
        }
      }
    }
  })

  if (!student) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลนักศึกษา' })
  }

  // Current cycle applications and derived status
  const currentCycleApps = student.companyApplications.filter(a => a.cooperativeCycleId === cycleId)
  const currentCycleStatus = deriveStudentCycleStatus(currentCycleApps)

  return {
    student: {
      id: student.id,
      studentId: student.loginId,
      prefix: student.prefix,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      phone: student.phone,
      cohortYear: student.cohortYear,
      classGroup: student.classGroup,
      isActive: student.isActive
    },
    currentCycleStatus,
    currentCycleApplicationsCount: currentCycleApps.length,
    applications: student.companyApplications.map(app => ({
      id: app.id,
      cycleId: app.cooperativeCycleId,
      cycleLabel: `ภาคเรียนที่ ${app.cooperativeCycle.term}/${app.cooperativeCycle.academicYear}`,
      isCurrentCycle: app.cooperativeCycleId === cycleId,
      companyName: app.cooperativeRequest?.companyName || app.company.name,
      position: app.applicationPosition || app.cooperativeRequest?.position || '—',
      appliedAt: app.appliedAt,
      status: app.status,
      request: app.cooperativeRequest ? {
        id: app.cooperativeRequest.id,
        status: app.cooperativeRequest.status,
        confirmedAt: app.cooperativeRequest.confirmedAt,
        returnedReason: app.cooperativeRequest.returnedReason,
        rejectedReason: app.cooperativeRequest.rejectedReason
      } : null
    }))
  }
})
