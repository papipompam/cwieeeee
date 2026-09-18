export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  // Guard: Check if group has appointments
  const appointmentCount = await prisma.supervisionAppointment.count({
    where: { supervisionGroupId: groupId }
  })
  if (appointmentCount > 0) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถลบกลุ่มที่มีนัดหมายในตารางนิเทศได้ กรุณาลบนัดหมายออกก่อน'
    })
  }

  // Guard: Check if travel plans exist
  const travelPlanCount = await prisma.supervisionTravelPlan.count({
    where: { supervisionGroupId: groupId }
  })
  if (travelPlanCount > 0) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถลบกลุ่มที่มีแผนเดินทางได้ กรุณาลบแผนเดินทางออกก่อน'
    })
  }

  await prisma.supervisionGroup.delete({
    where: { id: groupId }
  })

  return { success: true, message: 'ลบกลุ่มนิเทศเรียบร้อยแล้ว' }
})
