export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')
  const companyId = validatePositiveId(getRouterParam(event, 'companyId'), 'รหัสสถานประกอบการ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  // Check if company has active appointment in this group/round
  const appointmentCount = await prisma.supervisionAppointment.count({
    where: {
      supervisionRoundId: roundId,
      companyId,
      status: { notIn: ['CANCELLED'] }
    }
  })
  if (appointmentCount > 0) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถนำสถานประกอบการออกได้เนื่องจากมีนัดหมายในตารางนิเทศ กรุณายกเลิกหรือลบนัดหมายก่อน'
    })
  }

  const membership = await prisma.supervisionGroupCompany.findFirst({
    where: {
      supervisionRoundId: roundId,
      companyId
    }
  })

  if (!membership || membership.supervisionGroupId !== groupId) {
    throw createError({ statusCode: 404, message: 'ไม่พบสถานประกอบการนี้ในกลุ่มนิเทศที่ระบุ' })
  }

  await prisma.supervisionGroupCompany.delete({
    where: { id: membership.id }
  })

  return { success: true, message: 'นำสถานประกอบการออกจากกลุ่มเรียบร้อยแล้ว' }
})
