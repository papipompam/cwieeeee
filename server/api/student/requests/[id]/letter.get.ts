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

  if (!request.letterFilePath) {
    throw createError({ statusCode: 404, message: 'ยังไม่มีหนังสือจากเจ้าหน้าที่' })
  }

  if (!fs.existsSync(request.letterFilePath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ' })
  }

  const stream = fs.createReadStream(request.letterFilePath)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(request.letterOriginalName || 'official-letter.pdf')}"`)
  return sendStream(event, stream)
})
