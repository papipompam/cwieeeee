export default defineEventHandler(async (event) => {
  await getStaffCycle(event, { mustNotBeClosed: true })
  const now = new Date()
  const buddhistYear = now.getUTCFullYear() + 543
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
  const [requestLetters, sendingLetters, sequence, reservations] = await Promise.all([
    prisma.requestLetterVersion.findMany({ where: { issueDate: { gte: yearStart, lt: nextYearStart } }, select: { letterNumber: true } }),
    prisma.sendingLetterVersion.findMany({ where: { issueDate: { gte: yearStart, lt: nextYearStart } }, select: { letterNumber: true } }),
    prisma.officialLetterSequence.findUnique({ where: { year: buddhistYear }, select: { lastNumber: true } }),
    prisma.officialLetterNumber.findMany({ where: { year: buddhistYear }, select: { letterNumber: true } })
  ])
  const highest = Math.max(sequence?.lastNumber ?? 0, maxIssuedLetterNumber([...requestLetters, ...sendingLetters, ...reservations].map(item => item.letterNumber), buddhistYear))
  return { letterNumber: `${highest + 1}/${buddhistYear}`, issueDate: now.toISOString().slice(0, 10) }
})
