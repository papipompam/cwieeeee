export default defineEventHandler(async (event) => {
  const { user, cycle, cycleId } = await getStaffCycle(event, { mustNotBeClosed: true })
  const body = await readBody<{ requestIds?: number[], issueDate?: string, letterNumber?: string }>(event)
  const requestIds = [...new Set((body?.requestIds ?? []).map(Number).filter(Number.isInteger))]
  if (!requestIds.length || requestIds.length > 6) throw createError({ statusCode: 400, message: 'เลือกนักศึกษาได้ 1–6 คนต่อฉบับ' })
  const issueDate = parseStrictDate(body?.issueDate, 'วันที่ออกหนังสือ')
  const requests = await prisma.cooperativeRequest.findMany({
    where: {
      id: { in: requestIds },
      status: { in: ['SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'RETURNED_FOR_REVISION'] },
      requestLetterParticipations: { none: { requestLetterVersion: { isActive: true } } },
      companyApplication: { cooperativeCycleId: cycleId }
    },
    include: { companyApplication: { include: { studentUser: true } } }
  })
  if (requests.length !== requestIds.length) throw createError({ statusCode: 409, message: 'มีคำร้องที่ไม่พร้อมจัดทำเอกสาร กรุณารีเฟรชข้อมูล' })
  const first = requests[0]!
  if (!requests.every(request => request.companyApplication.companyId === first.companyApplication.companyId && request.recipientName === first.recipientName && request.letterAddress === first.letterAddress)) throw createError({ statusCode: 400, message: 'ต้องเลือกคำร้องของบริษัทและผู้รับหนังสือเดียวกัน' })
  const signer = await loadRequestLetterSigner(await getDocumentSignerOverrides()).catch(error => { if (error instanceof RequestLetterSignerError) throw createError({ statusCode: 500, message: error.message }); throw error })
  const gregorianYear = issueDate.getUTCFullYear()
  const buddhistYear = gregorianYear + 543
  const data = buildRequestLetterData(cycle, first, { letterNumber: `1/${buddhistYear}`, issueDate }, signer)
  data.studentNames = requests.map(request => `${request.companyApplication.studentUser.prefix ?? ''}${request.companyApplication.studentUser.firstName} ${request.companyApplication.studentUser.lastName}`.trim())
  data.studentName = data.studentNames[0]!
  data.studentCount = requests.length
  const assets = await loadRequestLetterAssets('v1')
  const yearStart = new Date(Date.UTC(gregorianYear, 0, 1))
  const nextYearStart = new Date(Date.UTC(gregorianYear + 1, 0, 1))
  const requestedNumber = body?.letterNumber?.trim()
  const input = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${buddhistYear}, 3)`
    const [requestLetters, sendingLetters] = await Promise.all([
      tx.requestLetterVersion.findMany({ where: { issueDate: { gte: yearStart, lt: nextYearStart } }, select: { letterNumber: true } }),
      tx.sendingLetterVersion.findMany({ where: { issueDate: { gte: yearStart, lt: nextYearStart } }, select: { letterNumber: true } })
    ])
    const issued = [...requestLetters, ...sendingLetters].map(letter => letter.letterNumber).filter((value): value is string => Boolean(value))
    const historicMax = maxIssuedLetterNumber(issued, buddhistYear)
    if (requestedNumber && issued.includes(requestedNumber)) throw createError({ statusCode: 409, message: 'เลขที่หนังสือนี้ถูกใช้งานแล้ว' })
    const sequence = await tx.officialLetterSequence.upsert({
      where: { year: buddhistYear },
      create: { year: buddhistYear, lastNumber: historicMax },
      update: { lastNumber: { set: Math.max(historicMax, (await tx.officialLetterSequence.findUnique({ where: { year: buddhistYear }, select: { lastNumber: true } }))?.lastNumber ?? 0) } }
    })
    if (requestedNumber) {
      const matched = requestedNumber.match(new RegExp(`^(\\d+)\\s*/\\s*${buddhistYear}$`))
      if (matched) await tx.officialLetterSequence.update({ where: { year: buddhistYear }, data: { lastNumber: { set: Math.max(sequence.lastNumber, Number(matched[1])) } } })
      try { await tx.officialLetterNumber.create({ data: { year: buddhistYear, letterNumber: requestedNumber } }) } catch (error: any) { if (error?.code === 'P2002') throw createError({ statusCode: 409, message: 'เลขที่หนังสือนี้ถูกใช้งานแล้ว' }); throw error }
      return { letterNumber: requestedNumber, issueDate }
    }
    const next = await tx.officialLetterSequence.update({ where: { year: buddhistYear }, data: { lastNumber: { increment: 1 } } })
    const letterNumber = `${next.lastNumber}/${buddhistYear}`
    await tx.officialLetterNumber.create({ data: { year: buddhistYear, letterNumber } })
    return { letterNumber, issueDate }
  })
  data.letterNumber = input.letterNumber
  const pdfBytes = await generateRequestLetter(data, assets)
  const version = await saveRequestLetterVersion({ request: first, source: 'GENERATED', pdfBytes, letterNumber: input.letterNumber, issueDate: input.issueDate, templateVersion: 'v1', signerName: signer.signerName, signerTitle: signer.signerTitleLines.join('\n'), userId: user.id, participants: requests.map(request => ({ id: request.id, studentUserId: request.companyApplication.studentUserId, studentName: `${request.companyApplication.studentUser.prefix ?? ''}${request.companyApplication.studentUser.firstName} ${request.companyApplication.studentUser.lastName}`.trim() })) })
  return { success: true, version }
})
