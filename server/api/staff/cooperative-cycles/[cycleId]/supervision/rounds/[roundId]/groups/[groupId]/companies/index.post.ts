export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffSupervisionContext(event, { mustNotBeClosed: true })
  const roundId = validatePositiveId(getRouterParam(event, 'roundId'), 'รหัสครั้งที่นิเทศ')
  const groupId = validatePositiveId(getRouterParam(event, 'groupId'), 'รหัสกลุ่มนิเทศ')

  await getSupervisionRound(cycleId, roundId)
  await getSupervisionGroup(roundId, groupId)

  const body = await readBody(event)
  const companyId = validatePositiveId(body?.companyId, 'รหัสสถานประกอบการ')

  // Verify company exists and has confirmed placement in this cycle
  const hasConfirmedPlacement = await prisma.cooperativeRequest.findFirst({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: {
        cooperativeCycleId: cycleId,
        companyId
      }
    }
  })
  if (!hasConfirmedPlacement) {
    throw createError({
      statusCode: 400,
      message: 'สถานประกอบการนี้ไม่มีนักศึกษาที่ได้รับการยืนยันฝึกงานในรอบสหกิจนี้'
    })
  }

  // Verify company is not already in any group in this round
  const existingInRound = await prisma.supervisionGroupCompany.findFirst({
    where: {
      supervisionRoundId: roundId,
      companyId
    },
    include: { supervisionGroup: true }
  })
  if (existingInRound) {
    throw createError({
      statusCode: 409,
      message: `สถานประกอบการนี้ถูกจัดอยู่ในกลุ่ม "${existingInRound.supervisionGroup.name}" ในครั้งนี้แล้ว`
    })
  }

  const membership = await prisma.supervisionGroupCompany.create({
    data: {
      supervisionRoundId: roundId,
      supervisionGroupId: groupId,
      companyId
    },
    include: {
      company: true
    }
  })

  return {
    success: true,
    id: membership.id,
    supervisionGroupId: groupId,
    company: membership.company,
    createdAt: membership.createdAt
  }
})
