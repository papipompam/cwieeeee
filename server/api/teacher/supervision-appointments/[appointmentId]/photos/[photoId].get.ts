import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสรายการนิเทศ')
  const photoId = validatePositiveId(getRouterParam(event, 'photoId'), 'รหัสรูปภาพ')
  const photo = await prisma.supervisionAppointmentPhoto.findFirst({ where: { id: photoId, appointmentId, appointment: { status: { not: 'DRAFT' }, teachers: { some: { teacherUserId: teacher.id } } } } })
  if (!photo) throw createError({ statusCode: 404, message: 'ไม่พบรูปภาพ' })
  const filePath = path.join(process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'supervision-photos'), photo.storageName)
  if (!fs.existsSync(filePath)) throw createError({ statusCode: 404, message: 'ไม่พบไฟล์รูปภาพ' })
  setHeader(event, 'Content-Type', photo.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(photo.originalName)}"`)
  return sendStream(event, fs.createReadStream(filePath))
})
