import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const type = getRouterParam(event, 'type')
  const settings = await prisma.documentSettings.findUnique({ where: { id: 1 } })
  const filePath = type === 'request-letter' ? settings?.requestLetterSamplePath : type === 'sending-letter' ? settings?.sendingLetterSamplePath : null
  const fileName = type === 'request-letter' ? settings?.requestLetterSampleName : type === 'sending-letter' ? settings?.sendingLetterSampleName : null
  if (!filePath || !fileName) throw createError({ statusCode: 404, message: 'ไม่พบไฟล์ตัวอย่าง' })
  if (!fs.existsSync(filePath)) throw createError({ statusCode: 404, message: 'ไม่พบไฟล์ตัวอย่างในระบบจัดเก็บ' })
  setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
  setHeader(event, 'Content-Type', fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  return sendStream(event, fs.createReadStream(filePath))
})
