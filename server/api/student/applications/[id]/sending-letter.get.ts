import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const applicationId = validatePositiveId(getRouterParam(event, 'id'), 'รหัสการสมัคร')
  const application = await prisma.companyApplication.findFirst({
    where: { id: applicationId, studentUserId: user.id },
    select: { cooperativeRequest: { select: { id: true } } }
  })
  const requestId = application?.cooperativeRequest?.id
  if (!requestId) throw createError({ statusCode: 404, message: 'ยังไม่มีหนังสือส่งตัว' })

  const version = await prisma.sendingLetterVersion.findFirst({
    where: { isActive: true, participants: { some: { cooperativeRequestId: requestId } } },
    orderBy: { version: 'desc' }
  })
  if (!version) throw createError({ statusCode: 404, message: 'ยังไม่มีหนังสือส่งตัว' })

  const resolved = await resolveStoredLetterFile(version.filePath).catch(() => null)
  if (!resolved) throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือส่งตัวในระบบจัดเก็บ' })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(version.fileName)}"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return sendStream(event, fs.createReadStream(resolved.canonicalPath))
})
