import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = validatePositiveId(getRouterParam(event, 'id'), 'รหัสการสมัคร')
  const application = await prisma.companyApplication.findFirst({
    where: { id, studentUserId: user.id },
    include: { cooperativeRequest: true }
  })

  if (!application?.cooperativeRequest?.letterFilePath) {
    throw createError({ statusCode: 404, message: 'ยังไม่มีหนังสือจากเจ้าหน้าที่' })
  }
  if (!fs.existsSync(application.cooperativeRequest.letterFilePath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ' })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(application.cooperativeRequest.letterOriginalName || 'official-letter.pdf')}"`)
  return sendStream(event, fs.createReadStream(application.cooperativeRequest.letterFilePath))
})
