export default defineEventHandler(async (event) => {
  const { user, cycle, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const request = await getStaffCycleRequest(event, cycleId, requestId)
  const input = validateLetterGenerationInput(await readBody(event))

  const reference = await prisma.requestLetterVersion.findFirst({
    where: { isActive: true, OR: [{ cooperativeRequestId: request.id }, { participants: { some: { cooperativeRequestId: request.id } } }] },
    orderBy: { version: 'desc' },
    include: { participants: { orderBy: { id: 'asc' }, include: { cooperativeRequest: { include: { companyApplication: { include: { studentUser: true } } } } } } }
  })
  if (!reference?.letterNumber || !reference.issueDate) {
    throw createError({ statusCode: 400, message: 'ไม่พบเลขที่หรือวันที่ของหนังสือขอความอนุเคราะห์ฉบับที่ใช้อ้างอิง' })
  }
  const participants = reference.participants.length ? reference.participants.map(item => item.cooperativeRequest) : [request]
  if (!participants.every(item => item.status === 'PLACEMENT_CONFIRMED')) throw createError({ statusCode: 400, message: 'รอการยืนยันสถานที่ฝึกของนักศึกษาในเอกสารฉบับนี้ให้ครบก่อน' })

  const signer = await loadRequestLetterSigner(await getDocumentSignerOverrides()).catch((error) => {
    if (error instanceof RequestLetterSignerError) throw createError({ statusCode: 500, message: error.message })
    throw error
  })
  let pdf: Uint8Array
  try {
    pdf = await generateSendingLetter(
      (() => { const data = buildSendingLetterData(cycle, request, input, reference, signer); data.students = participants.map(item => ({ name: `${item.companyApplication.studentUser.prefix ?? ''}${item.companyApplication.studentUser.firstName} ${item.companyApplication.studentUser.lastName}`.trim(), studentId: item.companyApplication.studentUser.loginId ?? undefined })); return data })(),
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
    userId: user.id,
    participants: participants.map(item => ({ id: item.id, studentUserId: item.companyApplication.studentUserId }))
  })

  return { success: true, version }
})
