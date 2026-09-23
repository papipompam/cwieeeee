import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const id = validatePositiveId(getRouterParam(event, 'id'), 'รหัสการสมัคร')
  const application = await prisma.companyApplication.findFirst({ where: { id, studentUserId: user.id }, include: { cooperativeRequest: true } })
  const request = application?.cooperativeRequest
  if (!application || !request) throw createError({ statusCode: 404, message: 'ไม่พบคำร้องของรายการสมัครนี้' })
  const formData = await readMultipartFormData(event)
  const fileItem = formData?.find(item => item.name === 'file' || item.filename)
  if (!fileItem?.filename || !fileItem.data) throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์หนังสือตอบรับ' })
  if (fileItem.data.length > 10 * 1024 * 1024) throw createError({ statusCode: 400, message: 'ขนาดไฟล์ต้องไม่เกิน 10MB' })
  const originalName = fileItem.filename
  const ext = path.extname(originalName).toLowerCase()
  const mimeType = fileItem.type || 'application/octet-stream'
  const valid = (ext === '.pdf' && mimeType === 'application/pdf' && fileItem.data.subarray(0, 5).toString('ascii') === '%PDF-')
    || (['.jpg', '.jpeg'].includes(ext) && mimeType === 'image/jpeg' && fileItem.data[0] === 0xff && fileItem.data[1] === 0xd8 && fileItem.data[2] === 0xff)
    || (ext === '.png' && mimeType === 'image/png' && fileItem.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
  if (!valid) throw createError({ statusCode: 400, message: 'อนุญาตเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น' })

  const group = await prisma.requestLetterVersion.findFirst({
    where: { isActive: true, participants: { some: { cooperativeRequestId: request.id } } },
    include: { participants: { include: { cooperativeRequest: { include: { companyApplication: { select: { studentUserId: true } } } } } } }
  })
  const memberRequests = group?.participants.map(item => item.cooperativeRequest) || [request]
  if (!memberRequests.every(item => ['LETTER_READY', 'RETURNED_FOR_REVISION'].includes(item.status))) throw createError({ statusCode: 400, message: 'ขณะนี้ยังไม่สามารถส่งหนังสือตอบรับได้' })

  const uploadDir = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'documents')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, `signed_${group ? `group_${group.id}` : request.id}_${Date.now()}${ext}`)
  fs.writeFileSync(filePath, fileItem.data)
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${group?.id ?? request.id}, 2)`
      const latest = await tx.requestDocument.findFirst({ where: group ? { requestLetterVersionId: group.id } : { cooperativeRequestId: request.id, requestLetterVersionId: null }, orderBy: { version: 'desc' } })
      if (latest && ['UPLOADED', 'UNDER_REVIEW', 'APPROVED'].includes(latest.status)) throw createError({ statusCode: 409, message: 'สมาชิกในชุดเอกสารได้ส่งหนังสือตอบรับแล้ว' })
      if (latest) await tx.requestDocument.update({ where: { id: latest.id }, data: { status: 'SUPERSEDED' } })
      const requestIds = memberRequests.map(item => item.id)
      const updated = await tx.cooperativeRequest.updateMany({ where: { id: { in: requestIds }, status: { in: ['LETTER_READY', 'RETURNED_FOR_REVISION'] } }, data: { status: 'DOCUMENT_UNDER_REVIEW', signedDocumentPath: filePath, signedDocumentOriginalName: originalName, signedDocumentSubmittedAt: new Date(), returnedReason: null } })
      if (updated.count !== requestIds.length) throw createError({ statusCode: 409, message: 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ' })
      const document = await tx.requestDocument.create({ data: { cooperativeRequestId: request.id, requestLetterVersionId: group?.id, uploadedByUserId: user.id, documentType: 'ACCEPTANCE_LETTER', fileName: originalName, filePath, fileSize: fileItem.data.length, mimeType, status: 'UPLOADED', version: (latest?.version ?? 0) + 1 } })
      const memberUserIds = group?.participants.map(item => item.cooperativeRequest.companyApplication.studentUserId) || [user.id]
      await tx.notification.createMany({ data: memberUserIds.map(userId => ({ userId, title: 'แนบหนังสือตอบรับเรียบร้อย', message: `มีการส่งหนังสือตอบรับสำหรับ ${request.companyName} แล้ว รอเจ้าหน้าที่ตรวจสอบ`, link: '/student/applications' })) })
      const staffs = await tx.user.findMany({ where: { role: 'STAFF', isActive: true }, select: { id: true } })
      if (staffs.length) await tx.notification.createMany({ data: staffs.map(staff => ({ userId: staff.id, title: 'มีเอกสารส่งมาใหม่รอตรวจสอบ', message: `${user.prefix}${user.firstName} ${user.lastName} อัปโหลดหนังสือตอบรับ (${request.companyName})`, link: `/staff/cooperative-cycles/${application.cooperativeCycleId}/applications/${request.id}` })) })
      return document
    })
  } catch (error) {
    fs.rmSync(filePath, { force: true })
    throw error
  }
})
