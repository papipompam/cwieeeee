export default defineEventHandler(async (event) => {
  const { user, cycle, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const request = await getStaffCycleRequest(event, cycleId, requestId)
  const input = validateLetterGenerationInput(await readBody(event))

  const reference = await prisma.requestLetterVersion.findFirst({
    where: { cooperativeRequestId: request.id, isActive: true },
    orderBy: { version: 'desc' },
    select: { letterNumber: true, issueDate: true }
  })
  if (!reference?.letterNumber || !reference.issueDate) {
    throw createError({ statusCode: 400, message: 'ไม่พบเลขที่หรือวันที่ของหนังสือขอความอนุเคราะห์ฉบับที่ใช้อ้างอิง' })
  }

  const signer = await loadRequestLetterSigner(await getDocumentSignerOverrides()).catch((error) => {
    if (error instanceof RequestLetterSignerError) throw createError({ statusCode: 500, message: error.message })
    throw error
  })
  let pdf: Uint8Array
  try {
    pdf = await generateSendingLetter(
      buildSendingLetterData(cycle, request, input, reference, signer),
      await loadSendingLetterAssets('v1')
    )
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 400, message: error?.message || 'ไม่สามารถสร้างหนังสือส่งตัวได้' })
  }
  const version = await saveSendingLetterVersion({
    request,
    pdfBytes: pdf,
    input,
    reference: { letterNumber: reference.letterNumber, issueDate: reference.issueDate },
    signer,
    userId: user.id
  })

  return { success: true, version }
})
