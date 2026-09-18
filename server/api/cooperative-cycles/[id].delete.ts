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

  // ponytail: in future iterations with StudentApplications, check referencing relations before delete
  return await prisma.cooperativeCycle.delete({
    where: { id }
  })
})
