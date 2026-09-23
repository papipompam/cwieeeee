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
    throw createError({ statusCode: 404, message: 'ไม่พบรอบสหกิจที่ต้องการลบ' })
  }

  if (current.status === CooperativeCycleStatus.CLOSED) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถลบรอบสหกิจที่ปิดรอบแล้วได้'
    })
  }

  const [applicationsCount, roundsCount, visitsCount] = await Promise.all([
    prisma.companyApplication.count({ where: { cooperativeCycleId: id } }),
    prisma.supervisionRound.count({ where: { cooperativeCycleId: id } }),
    prisma.supervisionVisit.count({ where: { cooperativeCycleId: id } })
  ])
  if (applicationsCount || roundsCount || visitsCount) {
    throw createError({
      statusCode: 409,
      message: 'ไม่สามารถลบรอบที่มีข้อมูลดำเนินงานแล้ว กรุณาปิดรอบแทน'
    })
  }

  return await prisma.cooperativeCycle.delete({
    where: { id }
  })
})
