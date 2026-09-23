export const parseStrictDate = (value: unknown, label: string): Date => {
  if (!value || typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `กรุณาระบุ${label}` })
  }
  const str = value.trim()
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง` })
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง` })
  }

  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง (วันที่ไม่มีอยู่จริง)` })
  }

  return d
}

export const validateCycleDatesOrder = (appStart: Date, appEnd: Date, internStart: Date, internEnd: Date) => {
  if (appStart > appEnd) {
    throw createError({ statusCode: 400, message: 'วันเปิดรับคำร้องต้องไม่เกินวันปิดรับคำร้อง' })
  }
  if (appEnd > internStart) {
    throw createError({ statusCode: 400, message: 'วันปิดรับคำร้องต้องไม่เกินวันเริ่มฝึกงาน' })
  }
  if (internStart > internEnd) {
    throw createError({ statusCode: 400, message: 'วันเริ่มฝึกงานต้องไม่เกินวันสิ้นสุดฝึกงาน' })
  }
}

export const validateCycleTerm = (term: unknown): number => {
  const t = Number(term)
  if (!t || !Number.isInteger(t) || t < 1 || t > 3) {
    throw createError({ statusCode: 400, message: 'ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3' })
  }
  return t
}

export const validatePositiveYear = (year: unknown, label: string): number => {
  const y = Number(year)
  if (!y || !Number.isInteger(y) || y <= 0) {
    throw createError({ statusCode: 400, message: `${label}ต้องเป็นจำนวนเต็มบวก (พ.ศ.)` })
  }
  return y
}

export const validatePositiveId = (id: unknown, label = 'รหัส'): number => {
  const num = Number(id)
  if (!Number.isInteger(num) || num <= 0) {
    throw createError({ statusCode: 400, message: `${label}ไม่ถูกต้อง` })
  }
  return num
}

export const ensureStudentsCanJoinOpenCycle = async (tx: any, cycleId: number, studentIds: number[]) => {
  // ponytail: One global enrollment lock keeps bulk inserts bounded; use per-student locks in one SQL call if concurrency becomes a bottleneck.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260, 1)`

  const existing = await tx.cooperativeCycleEnrollment.findFirst({
    where: {
      studentUserId: { in: studentIds },
      cooperativeCycleId: { not: cycleId },
      cooperativeCycle: { status: 'OPEN_FOR_APPLICATION' }
    },
    include: {
      studentUser: { select: { loginId: true } },
      cooperativeCycle: { select: { term: true, academicYear: true } }
    }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `นักศึกษารหัส ${existing.studentUser.loginId} อยู่ในรอบที่เปิดรับคำร้อง ภาคเรียนที่ ${existing.cooperativeCycle.term}/${existing.cooperativeCycle.academicYear} แล้ว`
    })
  }
}

export const getStaffCycle = async (event: any, options?: { mustNotBeClosed?: boolean }) => {
  const user = await requireRole(event, 'STAFF')
  const cycleIdParam = getRouterParam(event, 'cycleId') || getRouterParam(event, 'id')
  const cycleId = validatePositiveId(cycleIdParam, 'รหัสรอบสหกิจ')

  const cycle = await prisma.cooperativeCycle.findUnique({
    where: { id: cycleId }
  })

  if (!cycle) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลรอบสหกิจ' })
  }

  if (options?.mustNotBeClosed && cycle.status === 'CLOSED') {
    throw createError({ statusCode: 400, message: 'รอบสหกิจนี้ปิดรอบแล้ว ไม่สามารถดำเนินการได้' })
  }

  return { user, cycle, cycleId }
}

export const getStaffCycleRequest = async (event: any, cycleId: number, requestId: number) => {
  const request = await prisma.cooperativeRequest.findFirst({
    where: {
      id: requestId,
      companyApplication: {
        cooperativeCycleId: cycleId
      }
    },
    include: {
      companyApplication: {
        include: {
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
      },
      documents: {
        orderBy: { version: 'desc' }
      }
    }
  })

  if (!request) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลคำร้องในรอบสหกิจนี้' })
  }

  return request
}

export type StudentCycleStatusKey =
  | 'NOT_APPLIED'
  | 'APPLYING'
  | 'AWAITING_RESPONSE'
  | 'INTERVIEW'
  | 'ACCEPTED'
  | 'REQUEST_SUBMITTED'
  | 'WAITING_DOCUMENT'
  | 'DOCUMENT_UNDER_REVIEW'
  | 'PLACEMENT_CONFIRMED'
  | 'TERMINATED'

const studentCycleStatusOrder: StudentCycleStatusKey[] = [
  'NOT_APPLIED', 'APPLYING', 'AWAITING_RESPONSE', 'INTERVIEW', 'ACCEPTED',
  'REQUEST_SUBMITTED', 'WAITING_DOCUMENT', 'DOCUMENT_UNDER_REVIEW',
  'TERMINATED', 'PLACEMENT_CONFIRMED'
]

export const compareStudentCycleStatuses = (a: StudentCycleStatusKey, b: StudentCycleStatusKey, direction: 'asc' | 'desc'): number =>
  (studentCycleStatusOrder.indexOf(a) - studentCycleStatusOrder.indexOf(b)) * (direction === 'asc' ? 1 : -1)

export const matchesStudentCycleStatusFilter = (status: StudentCycleStatusKey, filter: string): boolean =>
  filter === 'all'
  || (filter === 'IN_PROGRESS' && !['NOT_APPLIED', 'TERMINATED', 'PLACEMENT_CONFIRMED'].includes(status))
  || (filter === 'PLACEMENT_CONFIRMED' && status === 'PLACEMENT_CONFIRMED')

export interface StudentCycleStatusInfo {
  key: StudentCycleStatusKey
  label: string
  color: 'neutral' | 'info' | 'warning' | 'success' | 'error'
}

export const deriveStudentCycleStatus = (
  applications: Array<{
    status: string
    cooperativeRequest?: { status: string } | null
  }>
): StudentCycleStatusInfo => {
  if (!applications || applications.length === 0) {
    return { key: 'NOT_APPLIED', label: 'ยังไม่ยื่น', color: 'neutral' }
  }

  // Requests take precedence over application status
  const appsWithRequest = applications.filter(a => a.cooperativeRequest)
  if (appsWithRequest.length > 0) {
    // Pick the most relevant request status
    const reqStatus = appsWithRequest[0]?.cooperativeRequest?.status
    if (reqStatus === 'PLACEMENT_CONFIRMED') {
      return { key: 'PLACEMENT_CONFIRMED', label: 'ยืนยันสถานที่แล้ว', color: 'success' }
    }
    if (reqStatus === 'DOCUMENT_UNDER_REVIEW') {
      return { key: 'DOCUMENT_UNDER_REVIEW', label: 'รอตรวจเอกสาร', color: 'warning' }
    }
    if (reqStatus === 'LETTER_READY' || reqStatus === 'RETURNED_FOR_REVISION') {
      return { key: 'WAITING_DOCUMENT', label: 'รอเอกสาร', color: 'warning' }
    }
    if (reqStatus === 'SUBMITTED' || reqStatus === 'STAFF_PROCESSING') {
      return { key: 'REQUEST_SUBMITTED', label: 'ส่งคำร้องแล้ว', color: 'info' }
    }
    // If request was REJECTED or CANCELLED, fall through to check other applications
  }

  // Check active applications
  const hasAccepted = applications.some(a => a.status === 'ACCEPTED')
  if (hasAccepted) {
    return { key: 'ACCEPTED', label: 'รอยืนยันสถานประกอบการ', color: 'info' }
  }

  const hasInterview = applications.some(a => a.status === 'INTERVIEW')
  if (hasInterview) {
    return { key: 'INTERVIEW', label: 'รอสัมภาษณ์', color: 'info' }
  }

  const hasAwaiting = applications.some(a => a.status === 'AWAITING_RESPONSE')
  if (hasAwaiting) {
    return { key: 'AWAITING_RESPONSE', label: 'รอผลตอบกลับ', color: 'warning' }
  }

  const hasActive = applications.some(a => a.status === 'SUBMITTED')
  if (hasActive) {
    return { key: 'APPLYING', label: 'กำลังสมัคร', color: 'info' }
  }

  const allTerminated = applications.every(a => ['REJECTED', 'WITHDRAWN'].includes(a.status))
  if (allTerminated) {
    return { key: 'TERMINATED', label: 'ไม่ดำเนินการต่อ', color: 'neutral' }
  }

  return { key: 'NOT_APPLIED', label: 'ยังไม่ยื่น', color: 'neutral' }
}

export type StudentPlacementOverviewStatus = 'notApplied' | 'inProgress' | 'needsAction' | 'confirmed'

export const deriveStudentPlacementOverviewStatus = (
  applications: Array<{
    status: string
    cooperativeRequest?: { status: string } | null
  }>
): StudentPlacementOverviewStatus => {
  if (applications.length === 0) return 'notApplied'
  if (applications.some(application => application.cooperativeRequest?.status === 'PLACEMENT_CONFIRMED')) return 'confirmed'

  const hasInProgress = applications.some((application) => {
    const requestStatus = application.cooperativeRequest?.status
    if (requestStatus) return !['RETURNED_FOR_REVISION', 'REJECTED'].includes(requestStatus)
    return !['REJECTED', 'WITHDRAWN'].includes(application.status)
  })

  return hasInProgress ? 'inProgress' : 'needsAction'
}
