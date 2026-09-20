import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
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

  const storageBase = path.resolve(process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads'))
  const uploadDir = path.join(storageBase, 'letters')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const filename = `letter_${request.id}_${Date.now()}.pdf`
  const filePath = path.join(uploadDir, filename)
  const oldFilePath = request.letterFilePath

  fs.writeFileSync(filePath, fileItem.data)

  try {
    const targetStatus = ['SUBMITTED', 'STAFF_PROCESSING'].includes(request.status)
      ? 'LETTER_READY'
      : request.status

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Concurrency guard: Ensure request status hasn't changed since initial read
      const updated = await tx.cooperativeRequest.updateMany({
        where: {
          id: request.id,
          status: request.status
        },
        data: {
          status: targetStatus,
          letterFilePath: filePath,
          letterOriginalName: fileItem.filename,
          letterIssuedAt: new Date()
        }
      })

      if (updated.count === 0) {
        throw createError({
          statusCode: 409,
          message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ'
        })
      }

      const notifTitle = ['SUBMITTED', 'STAFF_PROCESSING'].includes(request.status)
        ? 'หนังสือขอความอนุเคราะห์พร้อมดาวน์โหลด'
        : 'มีการอัปเดตไฟล์หนังสือขอความอนุเคราะห์'

      const notifMessage = ['SUBMITTED', 'STAFF_PROCESSING'].includes(request.status)
        ? `เจ้าหน้าที่ได้แนบหนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} แล้ว`
        : `เจ้าหน้าที่ได้อัปเดตไฟล์หนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} ฉบับใหม่`

      // Notify student
      await tx.notification.create({
        data: {
          userId: request.companyApplication.studentUserId,
          title: notifTitle,
          message: notifMessage,
          link: '/student/applications'
        }
      })

      return tx.cooperativeRequest.findUniqueOrThrow({
        where: { id: request.id }
      })
    })

    // Clean up old file if replaced
    if (oldFilePath && oldFilePath !== filePath && fs.existsSync(oldFilePath)) {
      try {
        fs.rmSync(oldFilePath, { force: true })
      } catch {
        // Non-fatal if old file cleanup fails
      }
    }

    return {
      success: true,
      request: updatedRequest
    }
  } catch (error) {
    fs.rmSync(filePath, { force: true })
    throw error
  }
})
