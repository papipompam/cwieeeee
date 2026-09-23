import fs from 'node:fs'
import path from 'node:path'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const file = (await readMultipartFormData(event))?.find(item => item.name === 'file' || item.filename)
  if (!file?.data || !file.filename) throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์ลายเซ็น' })
  if (file.data.length > 2 * 1024 * 1024) throw createError({ statusCode: 400, message: 'ไฟล์ลายเซ็นต้องมีขนาดไม่เกิน 2MB' })
  if (!file.data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw createError({ statusCode: 400, message: 'รองรับเฉพาะไฟล์ PNG สำหรับลายเซ็น' })
  }

  const storageRoot = process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads')
  const directory = path.join(storageRoot, 'document-settings')
  fs.mkdirSync(directory, { recursive: true })
  const signaturePath = path.join(directory, `signature-${Date.now()}.png`)
  fs.writeFileSync(signaturePath, file.data)

  try {
    const settings = await prisma.documentSettings.upsert({
      where: { id: 1 },
      create: { id: 1, signaturePath },
      update: { signaturePath }
    })
    return { hasSignature: true, updatedAt: settings.updatedAt }
  } catch (error) {
    fs.rmSync(signaturePath, { force: true })
    throw error
  }
})
