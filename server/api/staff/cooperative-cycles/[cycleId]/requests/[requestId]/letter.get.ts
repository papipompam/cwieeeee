import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  if (!request.letterFilePath) {
    throw createError({ statusCode: 404, message: 'ยังไม่มีการแนบหนังสือขอความอนุเคราะห์' })
  }

  const storageBase = path.resolve(process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads'))
  const resolvedPath = path.resolve(request.letterFilePath)

  if (!resolvedPath.startsWith(storageBase) || !fs.existsSync(resolvedPath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ' })
  }

  const stream = fs.createReadStream(resolvedPath)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(request.letterOriginalName || 'official-letter.pdf')}"`)
  return sendStream(event, stream)
})
