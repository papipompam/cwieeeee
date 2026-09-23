import { CooperativeCycleStatus } from '~~/prisma/generated/client'

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสรอบสหกิจไม่ถูกต้อง' })
  }

  const current = await prisma.cooperativeCycle.findUnique({
    where: { id }
  })

  if (!current) {
    throw createError({ statusCode: 404, message: 'ไม่พบรอบสหกิจที่ระบุ' })
  }

  // CLOSED is a terminal state: no mutations allowed
  if (current.status === CooperativeCycleStatus.CLOSED) {
    throw createError({
      statusCode: 400,
      message: 'รอบสหกิจนี้ถูกปิดรอบแล้ว ไม่สามารถแก้ไขข้อมูลได้'
    })
  }

  const body = await readBody(event)

  const term = body.term !== undefined ? validateCycleTerm(body.term) : current.term
  const academicYear = body.academicYear !== undefined ? validatePositiveYear(body.academicYear, 'ปีการศึกษา') : current.academicYear
  const cohortYear = body.cohortYear !== undefined ? validatePositiveYear(body.cohortYear, 'รุ่นนักศึกษา') : current.cohortYear

  const appStart = body.applicationStartDate !== undefined
    ? parseStrictDate(body.applicationStartDate, 'วันเปิดรับคำร้อง')
    : current.applicationStartDate
  const appEnd = body.applicationEndDate !== undefined
    ? parseStrictDate(body.applicationEndDate, 'วันปิดรับคำร้อง')
    : current.applicationEndDate
  const internStart = body.internshipStartDate !== undefined
    ? parseStrictDate(body.internshipStartDate, 'วันเริ่มฝึกงาน')
    : current.internshipStartDate
  const internEnd = body.internshipEndDate !== undefined
    ? parseStrictDate(body.internshipEndDate, 'วันสิ้นสุดฝึกงาน')
    : current.internshipEndDate

  validateCycleDatesOrder(appStart, appEnd, internStart, internEnd)

  // If changing term or academicYear, check unique constraint
  if (term !== current.term || academicYear !== current.academicYear) {
    const existing = await prisma.cooperativeCycle.findUnique({
      where: {
        term_academicYear: {
          term,
          academicYear
        }
      }
    })

    if (existing && existing.id !== id) {
      throw createError({ statusCode: 409, message: `มีรอบสหกิจภาคเรียนที่ ${term}/${academicYear} อยู่แล้วในระบบ` })
    }
  }

  // Validate status enum value if provided
  let newStatus: CooperativeCycleStatus = current.status
  const targetStatus = body.status as CooperativeCycleStatus | undefined
  if (targetStatus) {
    if (!Object.values(CooperativeCycleStatus).includes(targetStatus)) {
      throw createError({ statusCode: 400, message: 'สถานะรอบสหกิจไม่ถูกต้อง' })
    }
    newStatus = targetStatus
  }

  try {
    return await prisma.cooperativeCycle.update({
      where: { id },
      data: {
        term,
        academicYear,
        cohortYear,
        applicationStartDate: appStart,
        applicationEndDate: appEnd,
        internshipStartDate: internStart,
        internshipEndDate: internEnd,
        status: newStatus,
        note: body.note !== undefined ? (body.note ? String(body.note).trim() : null) : current.note
      }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรอบสหกิจภาคเรียนที่ ${term}/${academicYear} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
