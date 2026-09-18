import { CooperativeCycleStatus } from '~~/prisma/generated/client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const term = Number(body.term)
  const academicYear = Number(body.academicYear)
  const cohortYear = Number(body.cohortYear)

  if (!term || term <= 0 || !Number.isInteger(term)) {
    throw createError({ statusCode: 400, message: 'ภาคเรียนต้องเป็นจำนวนเต็มบวก' })
  }

  if (!academicYear || academicYear <= 0 || !Number.isInteger(academicYear)) {
    throw createError({ statusCode: 400, message: 'ปีการศึกษาต้องเป็นจำนวนเต็มบวก (พ.ศ.)' })
  }

  if (!cohortYear || cohortYear <= 0 || !Number.isInteger(cohortYear)) {
    throw createError({ statusCode: 400, message: 'รุ่นนักศึกษาต้องเป็นจำนวนเต็มบวก (พ.ศ.)' })
  }

  if (!body.applicationStartDate || !body.applicationEndDate) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุวันเปิดรับและปิดรับคำร้อง' })
  }

  if (!body.internshipStartDate || !body.internshipEndDate) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุวันเริ่มและวันสิ้นสุดการฝึกงาน' })
  }

  const appStart = new Date(body.applicationStartDate)
  const appEnd = new Date(body.applicationEndDate)
  const internStart = new Date(body.internshipStartDate)
  const internEnd = new Date(body.internshipEndDate)

  if (isNaN(appStart.getTime()) || isNaN(appEnd.getTime())) {
    throw createError({ statusCode: 400, message: 'รูปแบบวันเปิดรับ/ปิดรับคำร้องไม่ถูกต้อง' })
  }

  if (isNaN(internStart.getTime()) || isNaN(internEnd.getTime())) {
    throw createError({ statusCode: 400, message: 'รูปแบบวันเริ่ม/วันสิ้นสุดการฝึกงานไม่ถูกต้อง' })
  }

  if (appStart > appEnd) {
    throw createError({ statusCode: 400, message: 'วันเปิดรับคำร้องต้องไม่เกินวันปิดรับคำร้อง' })
  }

  if (internStart > internEnd) {
    throw createError({ statusCode: 400, message: 'วันเริ่มฝึกงานต้องไม่เกินวันสิ้นสุดฝึกงาน' })
  }

  // Check unique constraint (term, academicYear)
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
})
