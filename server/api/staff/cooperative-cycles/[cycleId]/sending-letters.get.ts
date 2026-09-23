export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const letters = await prisma.requestLetterVersion.findMany({
    where: {
      isActive: true,
      participants: { some: { cooperativeRequest: { companyApplication: { cooperativeCycleId: cycleId } } } }
    },
    include: {
      participants: {
        orderBy: { id: 'asc' },
        include: {
          cooperativeRequest: {
            include: {
              companyApplication: {
                include: {
                  company: { select: { id: true, name: true } },
                  studentUser: { select: { loginId: true, prefix: true, firstName: true, lastName: true } }
                }
              },
              sendingLetterParticipations: {
                where: { sendingLetterVersion: { isActive: true } },
                include: { sendingLetterVersion: { select: { letterNumber: true, issueDate: true } } },
                take: 1
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return letters.map((letter) => {
    const requests = letter.participants.map(participant => participant.cooperativeRequest)
    const sendingLetter = requests.flatMap(request => request.sendingLetterParticipations)[0]?.sendingLetterVersion || null
    const confirmedCount = requests.filter(request => request.status === 'PLACEMENT_CONFIRMED').length
    const first = requests[0]!
    return {
      id: letter.id,
      requestId: letter.cooperativeRequestId,
      requestLetterNumber: letter.letterNumber,
      requestIssueDate: letter.issueDate,
      companyId: first.companyApplication.companyId,
      companyName: first.companyApplication.company.name,
      students: requests.map(request => ({
        studentId: request.companyApplication.studentUser.loginId,
        name: `${request.companyApplication.studentUser.prefix}${request.companyApplication.studentUser.firstName} ${request.companyApplication.studentUser.lastName}`
      })),
      confirmedCount,
      status: sendingLetter ? 'ISSUED' : confirmedCount === requests.length ? 'READY' : 'WAITING_CONFIRMATION',
      sendingLetter
    }
  })
})
