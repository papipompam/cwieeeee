export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')
  const request = await getStaffCycleRequest(event, cycleId, requestId)
  const input = validateLetterGenerationInput(await readBody(event))

  const reference = await prisma.requestLetterVersion.findFirst({
    where: { isActive: true, OR: [{ cooperativeRequestId: request.id }, { participants: { some: { cooperativeRequestId: request.id } } }] },
    orderBy: { version: 'desc' },
    include: { participants: { include: { cooperativeRequest: { include: { companyApplication: { include: { studentUser: true } } } } } } }
  })
  if (!reference?.letterNumber || !reference.issueDate) throw createError({ statusCode: 400, message: 'ไม่พบหนังสือขอความอนุเคราะห์ฉบับที่ใช้อ้างอิง' })
  const participants = reference.participants.length ? reference.participants.map(item => item.cooperativeRequest) : [request]
  if (!participants.every(item => item.status === 'PLACEMENT_CONFIRMED')) throw createError({ statusCode: 400, message: 'รอการยืนยันสถานที่ฝึกของนักศึกษาในเอกสารฉบับนี้ให้ครบก่อน' })

  const signer = await loadRequestLetterSigner(await getDocumentSignerOverrides()).catch((error) => {
    if (error instanceof RequestLetterSignerError) throw createError({ statusCode: 500, message: error.message })
    throw error
  })
  const data = buildSendingLetterData(cycle, request, input, reference, signer)
  data.students = participants.map(item => ({
    name: `${item.companyApplication.studentUser.prefix ?? ''}${item.companyApplication.studentUser.firstName} ${item.companyApplication.studentUser.lastName}`.trim(),
    studentId: item.companyApplication.studentUser.loginId ?? undefined
  }))
  let pdf: Uint8Array
  try {
    pdf = await generateSendingLetter(data, await loadSendingLetterAssets('v1'))
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 400, message: error?.message || 'ไม่สามารถสร้างตัวอย่างหนังสือส่งตัวได้' })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="preview-sending-letter-${request.id}.pdf"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(pdf)
})
