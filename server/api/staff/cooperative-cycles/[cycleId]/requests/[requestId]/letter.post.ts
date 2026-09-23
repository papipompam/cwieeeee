import path from 'node:path'

export default defineEventHandler(async (event) => {
  const { user, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  // Disallow uploading to terminal states
  if (['PLACEMENT_CONFIRMED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถแนบหนังสือสำหรับคำร้องที่สิ้นสุดกระบวนการแล้ว'
    })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'ไม่พบไฟล์ที่อัปโหลด' })
  }

  const fileItem = formData.find(item => item.name === 'file' || item.filename)
  if (!fileItem || !fileItem.filename || !fileItem.data) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์เอกสาร' })
  }

  // Max 10MB
  const maxSize = 10 * 1024 * 1024
  if (fileItem.data.length > maxSize) {
    throw createError({ statusCode: 400, message: 'ขนาดไฟล์ต้องไม่เกิน 10MB' })
  }

  const ext = path.extname(fileItem.filename).toLowerCase()
  const mimeType = fileItem.type || ''
  const isPdfMagic = fileItem.data.subarray(0, 5).toString('ascii') === '%PDF-'

  if (ext !== '.pdf' || mimeType !== 'application/pdf' || !isPdfMagic) {
    throw createError({ statusCode: 400, message: 'อนุญาตเฉพาะไฟล์ PDF เท่านั้น' })
  }

  const createdVersion = await saveRequestLetterVersion({
    request,
    source: 'UPLOADED',
    pdfBytes: new Uint8Array(fileItem.data),
    fileName: fileItem.filename,
    userId: user.id
  })

  const updatedRequest = await prisma.cooperativeRequest.findUniqueOrThrow({
    where: { id: request.id }
  })

  return {
    success: true,
    request: updatedRequest,
    version: {
      id: createdVersion.id,
      version: createdVersion.version,
      source: createdVersion.source,
      fileName: createdVersion.fileName,
      fileSize: createdVersion.fileSize,
      sha256: createdVersion.sha256,
      isActive: createdVersion.isActive,
      createdAt: createdVersion.createdAt
    }
  }
})
