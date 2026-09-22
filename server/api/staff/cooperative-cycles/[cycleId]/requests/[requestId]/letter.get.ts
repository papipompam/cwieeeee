import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  const activeVersion = await prisma.requestLetterVersion.findFirst({
    where: { isActive: true, OR: [{ cooperativeRequestId: request.id }, { participants: { some: { cooperativeRequestId: request.id } } }] },
    orderBy: { version: 'desc' }
  })

  const filePathToRead = activeVersion?.filePath || request.letterFilePath
  const fileNameToUse = activeVersion?.fileName || request.letterOriginalName || 'official-letter.pdf'

  if (!filePathToRead) {
    throw createError({ statusCode: 404, message: 'ยังไม่มีการแนบหนังสือขอความอนุเคราะห์' })
  }

  let canonicalPath: string
  try {
    const resolved = await resolveStoredLetterFile(filePathToRead)
    canonicalPath = resolved.canonicalPath
  } catch {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ' })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(fileNameToUse)}"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return sendStream(event, fs.createReadStream(canonicalPath))
})
