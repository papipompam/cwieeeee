import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const docIdParam = getRouterParam(event, 'documentId')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  let doc = null
  if (docIdParam === 'latest') {
    doc = request.documents[0]
  } else {
    const docId = validatePositiveId(docIdParam, 'รหัสเอกสาร')
    doc = request.documents.find(d => d.id === docId)
  }

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
