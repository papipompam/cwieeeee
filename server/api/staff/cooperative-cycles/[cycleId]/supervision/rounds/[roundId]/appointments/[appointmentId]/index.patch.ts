export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสนัดหมาย')

  await getSupervisionRound(cycleId, roundId)
  const app = await getSupervisionAppointment(roundId, appointmentId)

  if (app.status === 'COMPLETED' || app.status === 'CANCELLED') {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถแก้ไขนัดหมายที่เสร็จสิ้นหรือยกเลิกแล้วได้'
    })
  }

  const body = await readBody(event)
  const data: any = {}

  let scheduledDate = app.scheduledDate
  if (body?.scheduledDate) {
    scheduledDate = parseStrictDate(body.scheduledDate, 'วันนัดหมายนิเทศ')
    data.scheduledDate = scheduledDate
  }

  let period = app.period
  if (body?.period && ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(body.period)) {
    period = body.period
    data.period = period
  }

  if (body?.timeNote !== undefined) {
    data.timeNote = typeof body.timeNote === 'string' && body.timeNote.trim() ? body.timeNote.trim() : null
  }

  // Student IDs
  let studentMap: Map<number, number> | null = null
  let studentIds: number[] | null = null
  if (Array.isArray(body?.studentUserIds)) {
    studentIds = body.studentUserIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    studentMap = await validateAppointmentStudents(cycleId, app.companyId, studentIds!)
  }

  // Teacher IDs
  let teacherIds: number[] | null = null
  if (Array.isArray(body?.teacherUserIds)) {
    teacherIds = body.teacherUserIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    await validateAppointmentTeachers(app.supervisionGroupId, teacherIds!)
  }

  // If already published/rescheduled, check conflicts with teachers across cycle
  if (app.status === 'PUBLISHED' || app.status === 'RESCHEDULED') {
    const activeTeacherIds = teacherIds ?? app.teachers.map((t: any) => t.teacherUserId)
    await checkTeacherScheduleConflict(cycleId, scheduledDate, period, activeTeacherIds, appointmentId)
  }

  // Update in transaction
  const updated = await prisma.$transaction(async (tx: any) => {
    const updatedApp = await tx.supervisionAppointment.update({
      where: { id: appointmentId },
      data
    })

    if (studentIds !== null && studentMap !== null) {
      await tx.supervisionAppointmentStudent.deleteMany({
        where: { appointmentId }
      })

      await tx.supervisionAppointmentStudent.createMany({
        data: studentIds.map((sId: number) => ({
          appointmentId,
          studentUserId: sId,
          cooperativeRequestId: studentMap!.get(sId)!
        }))
      })
    }

    if (teacherIds !== null) {
      await tx.supervisionAppointmentTeacher.deleteMany({
        where: { appointmentId }
      })

      await tx.supervisionAppointmentTeacher.createMany({
        data: teacherIds.map((tId: number) => ({
          appointmentId,
          teacherUserId: tId
        }))
      })
    }

    return updatedApp
  })

  return {
    id: updated.id,
    scheduledDate: updated.scheduledDate,
    period: updated.period,
    status: updated.status,
    updatedAt: updated.updatedAt
  }
})
