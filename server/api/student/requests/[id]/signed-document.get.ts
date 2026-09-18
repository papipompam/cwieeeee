import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสคำร้องไม่ถูกต้อง' })
  }

  const request = await prisma.cooperativeRequest.findFirst({
    where: {
      id,
      companyApplication: {
        studentUserId: user.id
      }
    }
  })

  if (!request) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลคำร้อง' })
  }

  if (!request.signedDocumentPath) {
    throw createError({ statusCode: 404, message: 'ยังไม่มีการส่งเอกสารลงนาม' })
  }

  if (!fs.existsSync(request.signedDocumentPath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์เอกสารในระบบจัดเก็บ' })
  }

  const stream = fs.createReadStream(request.signedDocumentPath)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(request.signedDocumentOriginalName || 'signed-document')}"`)
  return sendStream(event, stream)
})
