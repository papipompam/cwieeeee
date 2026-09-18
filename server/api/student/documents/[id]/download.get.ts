import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสเอกสารไม่ถูกต้อง' })
  }

  const doc = await prisma.requestDocument.findFirst({
    where: {
      id,
      cooperativeRequest: {
        companyApplication: {
          studentUserId: user.id
        }
      }
    }
  })

  if (!doc) {
    throw createError({ statusCode: 404, message: 'ไม่พบเอกสาร' })
  }

  if (!fs.existsSync(doc.filePath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์ในระบบจัดเก็บ' })
  }

  const stream = fs.createReadStream(doc.filePath)
  setHeader(event, 'Content-Type', doc.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
  return sendStream(event, stream)
})
