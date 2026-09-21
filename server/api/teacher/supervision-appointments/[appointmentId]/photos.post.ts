import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const teacher = await requireRole(event, 'TEACHER')
  const appointmentId = validatePositiveId(getRouterParam(event, 'appointmentId'), 'รหัสรายการนิเทศ')
  const appointment = await prisma.supervisionAppointment.findFirst({ where: { id: appointmentId, teachers: { some: { teacherUserId: teacher.id } } } })
  if (!appointment) throw createError({ statusCode: 404, message: 'ไม่พบรายการนิเทศที่คุณรับผิดชอบ' })
  const item = (await readMultipartFormData(event))?.find(value => value.name === 'file' || value.filename)
  if (!item?.filename || !item.data) throw createError({ statusCode: 400, message: 'กรุณาเลือกรูปภาพ' })
  if (item.data.length > 10 * 1024 * 1024) throw createError({ statusCode: 400, message: 'ขนาดรูปต้องไม่เกิน 10MB' })
  const ext = path.extname(item.filename).toLowerCase()
  const mimeType = item.type || 'application/octet-stream'
  const valid = (ext === '.jpg' || ext === '.jpeg') && mimeType === 'image/jpeg' && item.data[0] === 0xff && item.data[1] === 0xd8 && item.data[2] === 0xff
    || ext === '.png' && mimeType === 'image/png' && item.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!valid) throw createError({ statusCode: 400, message: 'อนุญาตเฉพาะไฟล์ JPG หรือ PNG เท่านั้น' })
  const dir = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'supervision-photos')
  fs.mkdirSync(dir, { recursive: true })
  const storageName = `appointment_${appointmentId}_${crypto.randomUUID()}${ext}`
  const filePath = path.join(dir, storageName)
  fs.writeFileSync(filePath, item.data)
  try {
    return await prisma.supervisionAppointmentPhoto.create({ data: { appointmentId, originalName: item.filename, storageName, mimeType, fileSize: item.data.length } })
  } catch (error) {
    fs.rmSync(filePath, { force: true })
    throw error
  }
})
