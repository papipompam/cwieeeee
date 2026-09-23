export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const body = await readBody(event)

  let where: Record<string, unknown> = {
    role: 'STUDENT',
    isActive: true
  }

  if (Array.isArray(body.studentIds)) {
    const studentIds = [...new Set(body.studentIds.map((id: unknown) => validatePositiveId(id, 'รหัสนักศึกษา')))]
    if (studentIds.length === 0) {
      throw createError({ statusCode: 400, message: 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน' })
    }
    where = { ...where, id: { in: studentIds } }
  } else if (body.cohortYear !== undefined) {
    where = { ...where, cohortYear: validatePositiveYear(body.cohortYear, 'รุ่นนักศึกษา') }
  } else {
    throw createError({ statusCode: 400, message: 'กรุณาระบุรายชื่อนักศึกษาหรือรุ่นนักศึกษา' })
  }

  const students = await prisma.user.findMany({ where, select: { id: true } })
  if (students.length === 0) {
    throw createError({ statusCode: 400, message: 'ไม่พบนักศึกษาที่ใช้งานได้ตามเงื่อนไขที่เลือก' })
  }

  const result = await prisma.$transaction(async (tx) => {
    await ensureStudentsCanJoinOpenCycle(tx, cycleId, students.map(student => student.id))
    return tx.cooperativeCycleEnrollment.createMany({
      data: students.map(student => ({ cooperativeCycleId: cycleId, studentUserId: student.id })),
      skipDuplicates: true
    })
  })

  return { addedCount: result.count, matchedCount: students.length }
})
