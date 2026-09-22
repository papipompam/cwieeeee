export default defineEventHandler(async (event) => {
  const { cycle, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const body = await readBody<{ requestIds?: number[], issueDate?: string, letterNumber?: string }>(event)
  const requestIds = [...new Set((body?.requestIds ?? []).map(Number).filter(Number.isInteger))]
  if (!requestIds.length || requestIds.length > 6) throw createError({ statusCode: 400, message: 'เลือกนักศึกษาได้ 1–6 คนต่อฉบับ' })
  const input = validateLetterGenerationInput({ letterNumber: body?.letterNumber, issueDate: body?.issueDate })
  const requests = await prisma.cooperativeRequest.findMany({
    where: { id: { in: requestIds }, status: { in: ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'RETURNED_FOR_REVISION'] }, requestLetterParticipations: { none: { requestLetterVersion: { isActive: true } } }, companyApplication: { cooperativeCycleId: cycleId } },
    include: { companyApplication: { include: { studentUser: true } } }
  })
  if (requests.length !== requestIds.length) throw createError({ statusCode: 409, message: 'มีคำร้องที่ไม่พร้อมจัดทำเอกสาร กรุณารีเฟรชข้อมูล' })
  const first = requests[0]!
  if (!requests.every(request => request.companyApplication.companyId === first.companyApplication.companyId && request.recipientName === first.recipientName && request.letterAddress === first.letterAddress)) throw createError({ statusCode: 400, message: 'ต้องเลือกคำร้องของบริษัทและผู้รับหนังสือเดียวกัน' })
  const signer = await loadRequestLetterSigner(await getDocumentSignerOverrides()).catch(error => { if (error instanceof RequestLetterSignerError) throw createError({ statusCode: 500, message: error.message }); throw error })
  const data = buildRequestLetterData(cycle, first, input, signer)
  data.studentNames = requests.map(request => `${request.companyApplication.studentUser.prefix ?? ''}${request.companyApplication.studentUser.firstName} ${request.companyApplication.studentUser.lastName}`.trim())
  data.studentName = data.studentNames[0]!
  data.studentCount = requests.length
  const pdf = await generateRequestLetter(data, await loadRequestLetterAssets('v1'))
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', 'inline; filename="preview-request-letter.pdf"')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return Buffer.from(pdf)
})
