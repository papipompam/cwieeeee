import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const docIdParam = getRouterParam(event, 'documentId')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  const groupDocumentWhere = {
    OR: [
      { cooperativeRequestId: request.id },
      { requestLetterVersion: { participants: { some: { cooperativeRequestId: request.id } } } }
    ]
  }
  const doc = docIdParam === 'latest'
    ? await prisma.requestDocument.findFirst({ where: groupDocumentWhere, orderBy: { version: 'desc' } })
    : await prisma.requestDocument.findFirst({ where: { id: validatePositiveId(docIdParam, 'รหัสเอกสาร'), ...groupDocumentWhere } })

  if (!doc) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์เอกสาร' })
  }

  const storageBase = path.resolve(process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads'))
  const resolvedPath = path.resolve(doc.filePath)

  if (!resolvedPath.startsWith(storageBase) || !fs.existsSync(resolvedPath)) {
    throw createError({ statusCode: 404, message: 'ไม่พบไฟล์ในระบบจัดเก็บ' })
  }

  const stream = fs.createReadStream(resolvedPath)
  setHeader(event, 'Content-Type', doc.mimeType || 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
  return sendStream(event, stream)
})
