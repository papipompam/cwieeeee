import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = validatePositiveId(getRouterParam(event, 'id'), 'รหัสการสมัคร')
  const application = await prisma.companyApplication.findFirst({
    where: { id, studentUserId: user.id },
    include: {
      cooperativeRequest: { include: { documents: { orderBy: { version: 'desc' }, take: 1 } } },
      cooperativeCycle: true
    }
  })
  const request = application?.cooperativeRequest

  if (!application || !request) throw createError({ statusCode: 404, message: 'ไม่พบคำร้องของรายการสมัครนี้' })
  if (!['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(request.status)) {
    throw createError({ statusCode: 400, message: 'ขณะนี้ยังไม่สามารถส่งหนังสือตอบรับได้' })
  }

  const formData = await readMultipartFormData(event)
  const fileItem = formData?.find(item => item.name === 'file' || item.filename)
  if (!fileItem?.filename || !fileItem.data) throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์หนังสือตอบรับ' })
  const originalName = fileItem.filename
  if (fileItem.data.length > 10 * 1024 * 1024) throw createError({ statusCode: 400, message: 'ขนาดไฟล์ต้องไม่เกิน 10MB' })

  const ext = path.extname(originalName).toLowerCase()
  const mimeType = fileItem.type || 'application/octet-stream'
  const isValidFile = (
    (ext === '.pdf' && mimeType === 'application/pdf' && fileItem.data.subarray(0, 5).toString('ascii') === '%PDF-') ||
    (['.jpg', '.jpeg'].includes(ext) && mimeType === 'image/jpeg' && fileItem.data[0] === 0xff && fileItem.data[1] === 0xd8 && fileItem.data[2] === 0xff) ||
    (ext === '.png' && mimeType === 'image/png' && fileItem.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
  )
  if (!isValidFile) throw createError({ statusCode: 400, message: 'อนุญาตเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น' })

  const uploadDir = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'documents')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const filename = `signed_${request.id}_${Date.now()}${ext}`
  const filePath = path.join(uploadDir, filename)
  fs.writeFileSync(filePath, fileItem.data)

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${request.id}, 1)`
      const updated = await tx.cooperativeRequest.updateMany({
        where: { id: request.id, status: { in: ['LETTER_READY', 'RETURNED_FOR_REVISION'] } },
        data: {
          status: 'DOCUMENT_UNDER_REVIEW',
          signedDocumentPath: filePath,
          signedDocumentOriginalName: originalName,
          signedDocumentSubmittedAt: new Date()
        }
      })
      if (!updated.count) throw createError({ statusCode: 409, message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ' })

      const latest = await tx.requestDocument.findFirst({
        where: { cooperativeRequestId: request.id },
        orderBy: { version: 'desc' },
        select: { version: true }
      })
      await tx.requestDocument.updateMany({
        where: { cooperativeRequestId: request.id, status: { in: ['WAITING_UPLOAD', 'UPLOADED', 'RETURNED_FOR_REVISION'] } },
        data: { status: 'SUPERSEDED' }
      })
      const document = await tx.requestDocument.create({
        data: {
          cooperativeRequestId: request.id,
          documentType: 'ACCEPTANCE_LETTER',
          fileName: originalName,
          filePath,
          fileSize: fileItem.data.length,
          mimeType,
          status: 'UPLOADED',
          version: (latest?.version ?? 0) + 1
        }
      })

      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'อัปโหลดหนังสือตอบรับสำเร็จ',
          message: `หนังสือตอบรับฉบับที่ ${document.version} สำหรับ ${request.companyName} ได้รับการบันทึกแล้ว รอเจ้าหน้าที่ตรวจสอบ`,
          link: '/student/applications'
        }
      })
      const staffs = await tx.user.findMany({ where: { role: 'STAFF', isActive: true }, select: { id: true } })
      if (staffs.length) {
        await tx.notification.createMany({
          data: staffs.map(staff => ({
            userId: staff.id,
            title: 'มีเอกสารส่งมาใหม่รอตรวจสอบ',
            message: `${user.prefix}${user.firstName} ${user.lastName} อัปโหลดหนังสือตอบรับ (${request.companyName})`,
            link: `/staff/cooperative-cycles/${application.cooperativeCycleId}/applications/${request.id}`
          }))
        })
      }

      return document
    })
  } catch (error) {
    fs.rmSync(filePath, { force: true })
    throw error
  }
})
