import { CooperativeCycleStatus } from '~~/prisma/generated/client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const term = validateCycleTerm(body.term)
  const academicYear = validatePositiveYear(body.academicYear, 'ปีการศึกษา')
  const cohortYear = validatePositiveYear(body.cohortYear, 'รุ่นนักศึกษา')

  const appStart = parseStrictDate(body.applicationStartDate, 'วันเปิดรับคำร้อง')
  const appEnd = parseStrictDate(body.applicationEndDate, 'วันปิดรับคำร้อง')
  const internStart = parseStrictDate(body.internshipStartDate, 'วันเริ่มฝึกงาน')
  const internEnd = parseStrictDate(body.internshipEndDate, 'วันสิ้นสุดฝึกงาน')

  validateCycleDatesOrder(appStart, appEnd, internStart, internEnd)

  // Pre-check unique constraint (term, academicYear)
  const existing = await prisma.cooperativeCycle.findUnique({
    where: {
      term_academicYear: {
        term,
        academicYear
      }
    }
  })

  if (existing) {
    throw createError({ statusCode: 409, message: `มีรอบสหกิจภาคเรียนที่ ${term}/${academicYear} อยู่แล้วในระบบ` })
  }

  try {
    return await prisma.cooperativeCycle.create({
      data: {
        term,
        academicYear,
        cohortYear,
        applicationStartDate: appStart,
        applicationEndDate: appEnd,
        internshipStartDate: internStart,
        internshipEndDate: internEnd,
        status: CooperativeCycleStatus.OPEN_FOR_APPLICATION,
        note: body.note ? String(body.note).trim() : null
      }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรอบสหกิจภาคเรียนที่ ${term}/${academicYear} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
