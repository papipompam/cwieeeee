export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const body = await readBody<{ signerName?: string, signerTitle?: string }>(event)
  const signerName = String(body?.signerName ?? '').trim()
  const signerTitle = String(body?.signerTitle ?? '').trim()

  if (!signerName || !signerTitle) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อและตำแหน่งผู้ลงนาม' })
  }
  const titleLines = signerTitle.replace(/\\n/g, '\n').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (titleLines.length > 3) {
    throw createError({ statusCode: 400, message: 'ตำแหน่งผู้ลงนามระบุได้ไม่เกิน 3 บรรทัด' })
  }

  const current = await prisma.documentSettings.findUnique({ where: { id: 1 } })
  const settings = await prisma.documentSettings.upsert({
    where: { id: 1 },
    create: { id: 1, signerName, signerTitle: titleLines.join('\n'), signaturePath: current?.signaturePath ?? null },
    update: { signerName, signerTitle: titleLines.join('\n') }
  })

  return { signerName: settings.signerName, signerTitle: settings.signerTitle, updatedAt: settings.updatedAt }
})
