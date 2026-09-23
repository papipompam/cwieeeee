export default defineEventHandler(async (event) => {
  const { user, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
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

  const createdVersion = await saveRequestLetterVersion({
    request,
    source: 'GENERATED',
    pdfBytes,
    letterNumber: input.letterNumber,
    issueDate: input.issueDate,
    templateVersion: 'v1',
    signerName: signer.signerName,
    signerTitle: signer.signerTitleLines.join('\n'),
    userId: user.id
  })

  return {
    success: true,
    version: {
      id: createdVersion.id,
      version: createdVersion.version,
      source: createdVersion.source,
      fileName: createdVersion.fileName,
      fileSize: createdVersion.fileSize,
      sha256: createdVersion.sha256,
      letterNumber: createdVersion.letterNumber,
      issueDate: createdVersion.issueDate,
      templateVersion: createdVersion.templateVersion,
      signerName: createdVersion.signerName,
      signerTitle: createdVersion.signerTitle,
      isActive: createdVersion.isActive,
      createdAt: createdVersion.createdAt
    }
  }
})
