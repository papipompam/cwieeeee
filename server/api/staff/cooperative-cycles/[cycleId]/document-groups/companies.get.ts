const documentStatus = (status: string | undefined) => ({
  UPLOADED: { key: 'response_under_review', label: 'ได้รับหนังสือตอบรับ รอตรวจสอบ', color: 'warning' },
  UNDER_REVIEW: { key: 'response_under_review', label: 'ได้รับหนังสือตอบรับ รอตรวจสอบ', color: 'warning' },
  RETURNED_FOR_REVISION: { key: 'returned_for_revision', label: 'ส่งกลับแก้ไขหนังสือตอบรับ', color: 'error' },
  APPROVED: { key: 'placement_confirmed', label: 'ยืนยันสถานที่ฝึกแล้ว', color: 'success' }
}[status || ''])

export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const applications = await prisma.companyApplication.findMany({
    where: {
      cooperativeCycleId: cycleId,
      status: { notIn: ['REJECTED', 'WITHDRAWN'] }
    },
    include: {
      company: { select: { id: true, name: true } },
      studentUser: { select: { prefix: true, firstName: true, lastName: true } },
      cooperativeRequest: {
        include: {
          requestLetterParticipations: { where: { requestLetterVersion: { isActive: true } }, include: { requestLetterVersion: { include: { responseDocuments: { orderBy: { version: 'desc' }, take: 1 } } } } },
          sendingLetterParticipations: { where: { sendingLetterVersion: { isActive: true } }, select: { id: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })
  const groups = new Map<number, typeof applications>()
  for (const application of applications) groups.set(application.companyId, [...(groups.get(application.companyId) || []), application])
  return Array.from(groups.values()).map(group => {
    const requests = group.flatMap(application => application.cooperativeRequest ? [application.cooperativeRequest] : [])
    const versions = requests.flatMap(request => request.requestLetterParticipations.map(item => item.requestLetterVersion))
    const response = versions.flatMap(version => version.responseDocuments).sort((a, b) => b.version - a.version)[0]
    const submittedCount = requests.length
    const waitingStudentCount = group.length - submittedCount
    const versionCount = new Set(versions.map(version => version.id)).size
    const latestStatus = documentStatus(response?.status)
    const hasSendingLetter = requests.some(request => request.sendingLetterParticipations.length)
    const workflow = latestStatus
      || (versionCount ? { key: hasSendingLetter ? 'sending_letter_ready' : 'waiting_response', label: hasSendingLetter ? 'หนังสือส่งตัวพร้อมแล้ว' : 'ส่งหนังสือให้นักศึกษาแล้ว · รอหนังสือตอบรับ', color: hasSendingLetter ? 'success' : 'warning' } : waitingStudentCount ? { key: 'waiting_confirmation', label: 'รอนักศึกษายืนยันสถานประกอบการ', color: 'warning' } : { key: submittedCount ? 'ready_to_issue' : 'no_request', label: submittedCount ? 'พร้อมจัดทำหนังสือขอความอนุเคราะห์' : 'ยังไม่มีคำร้อง', color: 'neutral' })
    return {
      companyId: group[0]!.companyId,
      companyName: group[0]!.company.name,
      applicantCount: group.length,
      submittedCount,
      waitingStudentCount,
      versionCount,
      workflow,
      documentRequestId: requests.find(request => request.requestLetterParticipations.length)?.id || null,
      responseDocument: response ? { id: response.id, fileName: response.fileName, version: response.version, status: response.status } : null,
      students: group.map(application => `${application.studentUser.prefix}${application.studentUser.firstName} ${application.studentUser.lastName}`)
    }
  })
})
