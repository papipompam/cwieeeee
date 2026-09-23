import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const type = getRouterParam(event, 'type')
  if (type !== 'request-letter' && type !== 'sending-letter') throw createError({ statusCode: 400, message: 'ประเภทรูปแบบเอกสารไม่ถูกต้อง' })
  const file = (await readMultipartFormData(event))?.find(item => item.name === 'file' || item.filename)
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์ตัวอย่าง' })
  if (file.data.length > 10 * 1024 * 1024) throw createError({ statusCode: 400, message: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB' })
  const extension = path.extname(file.filename).toLowerCase()
  if (!['.pdf', '.docx'].includes(extension)) throw createError({ statusCode: 400, message: 'รองรับเฉพาะ PDF หรือ DOCX' })
  const root = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads')
  const directory = path.join(root, 'document-settings', 'templates')
  fs.mkdirSync(directory, { recursive: true })
  const storagePath = path.join(directory, `${type}-${Date.now()}${extension}`)
  fs.writeFileSync(storagePath, file.data)
  const data = type === 'request-letter'
    ? { requestLetterSamplePath: storagePath, requestLetterSampleName: file.filename }
    : { sendingLetterSamplePath: storagePath, sendingLetterSampleName: file.filename }
  await prisma.documentSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })
  return { fileName: file.filename }
})
