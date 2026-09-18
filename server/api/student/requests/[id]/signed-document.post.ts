import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'รหัสคำร้องไม่ถูกต้อง' })
  }

  const request = await prisma.cooperativeRequest.findFirst({
    where: {
      id,
      companyApplication: {
        studentUserId: user.id
      }
    },
    include: {
      companyApplication: {
        include: {
          cooperativeCycle: true
        }
      },
      documents: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  })

  if (!request) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลคำร้อง' })
  }

  // Allowed to upload when LETTER_READY or RETURNED_FOR_REVISION
  if (!['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(request.status)) {
    throw createError({
      statusCode: 400,
      message: 'สามารถส่งเอกสารได้เฉพาะเมื่อสถานะเป็น LETTER_READY หรือ RETURNED_FOR_REVISION เท่านั้น'
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

  // Validate size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (fileItem.data.length > maxSize) {
    throw createError({ statusCode: 400, message: 'ขนาดไฟล์ต้องไม่เกิน 10MB' })
  }

  // Validate the client-declared type, filename, and actual file signature.
  const mimeType = fileItem.type || 'application/octet-stream'
  const ext = path.extname(fileItem.filename).toLowerCase()
  const validFiles = {
    '.pdf': { mime: 'application/pdf', signature: fileItem.data.subarray(0, 5).toString('ascii') === '%PDF-' },
    '.jpg': { mime: 'image/jpeg', signature: fileItem.data[0] === 0xff && fileItem.data[1] === 0xd8 && fileItem.data[2] === 0xff },
    '.jpeg': { mime: 'image/jpeg', signature: fileItem.data[0] === 0xff && fileItem.data[1] === 0xd8 && fileItem.data[2] === 0xff },
    '.png': { mime: 'image/png', signature: fileItem.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }
  } as const
  const fileType = validFiles[ext as keyof typeof validFiles]
  if (!fileType || fileType.mime !== mimeType || !fileType.signature) {
    throw createError({ statusCode: 400, message: 'อนุญาตเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น' })
  }

  const uploadDir = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'documents')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const filename = `signed_${request.id}_${Date.now()}${ext || '.pdf'}`
  const filePath = path.join(uploadDir, filename)
  fs.writeFileSync(filePath, fileItem.data)

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${request.id}, 1)`
      const requestUpdate = await tx.cooperativeRequest.updateMany({
        where: { id: request.id, status: { in: ['LETTER_READY', 'RETURNED_FOR_REVISION'] } },
        data: {
          status: 'DOCUMENT_UNDER_REVIEW',
          signedDocumentPath: filePath,
          signedDocumentOriginalName: fileItem.filename || filename,
          signedDocumentSubmittedAt: new Date()
        }
      })
      if (!requestUpdate.count) {
        throw createError({ statusCode: 409, message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ' })
      }
      const latestDocument = await tx.requestDocument.findFirst({
        where: { cooperativeRequestId: request.id },
        orderBy: { version: 'desc' },
        select: { version: true }
      })
      const newVersion = (latestDocument?.version ?? 0) + 1

      // If superseding previous documents
      await tx.requestDocument.updateMany({
        where: {
          cooperativeRequestId: request.id,
          status: { in: ['WAITING_UPLOAD', 'UPLOADED', 'RETURNED_FOR_REVISION'] }
        },
        data: { status: 'SUPERSEDED' }
      })

      // Create new document version
      const newDoc = await tx.requestDocument.create({
        data: {
          cooperativeRequestId: request.id,
          documentType: 'ACCEPTANCE_LETTER',
          fileName: fileItem.filename || filename,
          filePath,
          fileSize: fileItem.data.length,
          mimeType,
          status: 'UPLOADED',
          version: newVersion
        }
      })

      const updatedRequest = await tx.cooperativeRequest.findUniqueOrThrow({ where: { id: request.id } })

      // Notify student
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'อัปโหลดหนังสือตอบรับสำเร็จ',
          message: `หนังสือตอบรับฉบับที่ ${newVersion} สำหรับ ${request.companyName} ได้รับการบันทึกแล้ว รอเจ้าหน้าที่ตรวจสอบ`,
          link: `/student/requests/${request.id}`
        }
      })

      // Notify staff
      const staffs = await tx.user.findMany({
        where: { role: 'STAFF', isActive: true },
        select: { id: true }
      })
      if (staffs.length > 0) {
        await tx.notification.createMany({
          data: staffs.map(s => ({
            userId: s.id,
            title: 'มีเอกสารส่งมาใหม่รอตรวจสอบ',
            message: `${user.prefix}${user.firstName} ${user.lastName} อัปโหลดหนังสือตอบรับ (${request.companyName})`,
            link: `/staff/cooperative-cycles/${request.companyApplication.cooperativeCycleId}/applications/${request.id}`
          }))
        })
      }

      return {
        request: updatedRequest,
        document: newDoc
      }
    })
  } catch (error) {
    fs.rmSync(filePath, { force: true })
    throw error
  }
})
