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

  const body = await readBody(event)

  // Status check: if cycle is already CLOSED, prevent data mutation unless changing status out of CLOSED
  const targetStatus = body.status as CooperativeCycleStatus | undefined
  if (current.status === CooperativeCycleStatus.CLOSED && targetStatus === CooperativeCycleStatus.CLOSED) {
    throw createError({
      statusCode: 400,
      message: 'รอบสหกิจนี้ถูกปิดรอบแล้ว ไม่สามารถแก้ไขข้อมูลภายในรอบได้'
    })
  }

  const term = Number(body.term ?? current.term)
  const academicYear = Number(body.academicYear ?? current.academicYear)
  const cohortYear = Number(body.cohortYear ?? current.cohortYear)

  if (!term || term <= 0 || !Number.isInteger(term)) {
    throw createError({ statusCode: 400, message: 'ภาคเรียนต้องเป็นจำนวนเต็มบวก' })
  }

  if (!academicYear || academicYear <= 0 || !Number.isInteger(academicYear)) {
    throw createError({ statusCode: 400, message: 'ปีการศึกษาต้องเป็นจำนวนเต็มบวก (พ.ศ.)' })
  }

  if (!cohortYear || cohortYear <= 0 || !Number.isInteger(cohortYear)) {
    throw createError({ statusCode: 400, message: 'รุ่นนักศึกษาต้องเป็นจำนวนเต็มบวก (พ.ศ.)' })
  }

  const appStart = new Date(body.applicationStartDate ?? current.applicationStartDate)
  const appEnd = new Date(body.applicationEndDate ?? current.applicationEndDate)
  const internStart = new Date(body.internshipStartDate ?? current.internshipStartDate)
  const internEnd = new Date(body.internshipEndDate ?? current.internshipEndDate)

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

  // If changing term or academicYear, check unique constraint against other records
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
  let newStatus = current.status
  if (targetStatus) {
    if (!Object.values(CooperativeCycleStatus).includes(targetStatus)) {
      throw createError({ statusCode: 400, message: 'สถานะรอบสหกิจไม่ถูกต้อง' })
    }
    newStatus = targetStatus
  }

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
})
