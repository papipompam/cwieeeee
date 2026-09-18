export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const request = await prisma.cooperativeRequest.findFirst({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: {
        studentUserId: user.id
      }
    },
    include: {
      companyApplication: {
        include: {
          cooperativeCycle: true
        }
      },
      documents: {
        where: { status: 'APPROVED' }
      }
    },
    orderBy: { confirmedAt: 'desc' }
  })

  if (!request) {
    // Also find latest active request to point student to in empty state
    const currentRequest = await prisma.cooperativeRequest.findFirst({
      where: {
        companyApplication: {
          studentUserId: user.id
        }
      },
      orderBy: { confirmedAt: 'desc' }
    })

    return {
      placement: null,
      currentRequest
    }
  }

  return {
    placement: {
      id: request.id,
      companyName: request.companyName,
      internshipLocationName: request.internshipLocationName,
      position: request.position,
      address: request.address,
      province: request.province,
      latitude: request.latitude,
      longitude: request.longitude,
      recipientName: request.recipientName,
      recipientPosition: request.recipientPosition,
      letterAddress: request.letterAddress,
      appliedAt: request.appliedAt,
      confirmedAt: request.confirmedAt,
      cycle: request.companyApplication.cooperativeCycle,
      documents: request.documents
    },
    currentRequest: request
  }
})
