import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  await getStaffCycleRequest(event, cycleId, requestId)

  const version = await prisma.sendingLetterVersion.findFirst({
    where: {
      isActive: true,
      participants: { some: { cooperativeRequestId: requestId } }
    },
    orderBy: { version: 'desc' }
  })
  if (!version) throw createError({ statusCode: 404, message: 'ยังไม่มีหนังสือส่งตัว' })

  const resolved = await resolveStoredLetterFile(version.filePath).catch(() => null)
  if (!resolved) throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือส่งตัวในระบบจัดเก็บ' })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(version.fileName)}"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return sendStream(event, fs.createReadStream(resolved.canonicalPath))
})
