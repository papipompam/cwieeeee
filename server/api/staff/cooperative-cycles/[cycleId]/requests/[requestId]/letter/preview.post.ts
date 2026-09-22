export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  if (['PLACEMENT_CONFIRMED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
    throw createError({
      statusCode: 400,
      message: 'ไม่สามารถจัดทำหนังสือสำหรับคำร้องที่สิ้นสุดกระบวนการแล้ว'
    })
  }

  const body = await readBody(event)
  const input = validateLetterGenerationInput(body)

  const cycle = await prisma.cooperativeCycle.findUniqueOrThrow({
    where: { id: cycleId }
  })

  let signer: RequestLetterSigner
  try {
    signer = await loadRequestLetterSigner(await getDocumentSignerOverrides())
  } catch (err: any) {
    if (err instanceof RequestLetterSignerError) {
      throw createError({ statusCode: 500, message: err.message })
    }
    throw err
  }

  const letterData = buildRequestLetterData(cycle, request, input, signer)
  const assets = await loadRequestLetterAssets('v1')

  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generateRequestLetter(letterData, assets)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: err?.message || 'ไม่สามารถสร้างเอกสารหนังสือขอความอนุเคราะห์ได้'
    })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(
    event,
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(`preview-letter-${request.id}.pdf`)}"`
  )
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return Buffer.from(pdfBytes)
})
