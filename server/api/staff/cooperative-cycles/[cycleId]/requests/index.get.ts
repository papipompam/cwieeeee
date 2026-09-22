import type { CooperativeRequestStatus } from '~~/prisma/generated/client'

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const status = typeof query.status === 'string' && query.status ? query.status as CooperativeRequestStatus : undefined
  const classGroup = query.classGroup && query.classGroup !== 'all' ? Number(query.classGroup) : undefined

  const where: any = {
    companyApplication: {
      cooperativeCycleId: cycleId,
      ...(classGroup ? { studentUser: { classGroup } } : {})
    },
    ...(status ? { status } : {})
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
      { companyApplication: { studentUser: { loginId: { contains: search, mode: 'insensitive' } } } },
      { companyApplication: { studentUser: { firstName: { contains: search, mode: 'insensitive' } } } },
      { companyApplication: { studentUser: { lastName: { contains: search, mode: 'insensitive' } } } }
    ]
  }

  const [total, requests] = await prisma.$transaction([
    prisma.cooperativeRequest.count({ where }),
    prisma.cooperativeRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { confirmedAt: 'desc' },
      include: {
        companyApplication: {
          include: {
            studentUser: {
              select: {
                id: true,
                loginId: true,
                prefix: true,
                firstName: true,
                lastName: true,
                classGroup: true,
                cohortYear: true
              }
            }
          }
        },
        documents: {
          orderBy: { version: 'desc' },
          take: 1
        },
        requestLetterParticipations: {
          where: { requestLetterVersion: { isActive: true } },
          include: { requestLetterVersion: { include: { responseDocuments: { orderBy: { version: 'desc' }, take: 1 } } } },
          take: 1
        },
        sendingLetterParticipations: {
          where: { sendingLetterVersion: { isActive: true } },
          take: 1,
          select: { id: true }
        }
      }
    })
  ])

  return {
    requests: requests.map(r => ({
      id: r.id,
      status: r.status,
      companyName: r.companyName,
      position: r.position,
      province: r.province,
      confirmedAt: r.confirmedAt,
      letterFilePath: r.letterFilePath,
      sendingLetterAvailable: r.sendingLetterParticipations.length > 0,
      student: r.companyApplication.studentUser,
      latestDocument: r.requestLetterParticipations[0]?.requestLetterVersion.responseDocuments[0] || r.documents[0] || null
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
})
