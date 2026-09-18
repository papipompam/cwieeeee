import { ACTIVE_APPLICATION_STATUSES } from '~~/server/utils/student-workflow'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  const studentProfile = {
    id: user.id,
    studentId: user.loginId,
    prefix: user.prefix,
    firstName: user.firstName,
    lastName: user.lastName,
    name: [user.prefix, user.firstName, user.lastName].filter(Boolean).join(' '),
    cohortYear: user.cohortYear,
    classGroup: user.classGroup,
    phone: user.phone,
    gender: user.gender,
    isActive: user.isActive
  }

  if (!user.cohortYear) {
    return {
      student: studentProfile,
      cycle: null,
      canApply: false,
      reason: 'ไม่พบข้อมูลรุ่นนักศึกษาของท่านในระบบ กรุณาติดต่อเจ้าหน้าที่',
      activeApplication: null,
      latestRequest: null,
      placement: null,
      upcomingVisit: null,
      unreadNotificationsCount: 0,
      recentNotifications: [],
      nextAction: null
    }
  }

  const openCycle = await prisma.cooperativeCycle.findFirst({
    where: {
      status: 'OPEN_FOR_APPLICATION',
      cohortYear: user.cohortYear
    },
    orderBy: [
      { academicYear: 'desc' },
      { term: 'desc' }
    ]
  })

  // Keep the student's current work visible even after applications close.
  const activeApplication = await prisma.companyApplication.findFirst({
    where: {
      studentUserId: user.id,
      status: { in: [...ACTIVE_APPLICATION_STATUSES, 'CONFIRMED'] }
    },
    include: {
      company: {
        select: { id: true, name: true, province: true }
      },
      cooperativeRequest: {
        select: { id: true, status: true, companyName: true, position: true }
      },
      cooperativeCycle: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Latest request
  const latestRequest = await prisma.cooperativeRequest.findFirst({
    where: {
      companyApplication: {
        studentUserId: user.id
      }
    },
    include: {
      companyApplication: {
        include: { cooperativeCycle: true }
      },
      documents: {
        orderBy: { version: 'desc' }
      }
    },
    orderBy: { confirmedAt: 'desc' }
  })

  // Confirmed placement
  const placement = latestRequest?.status === 'PLACEMENT_CONFIRMED'
    ? {
        requestId: latestRequest.id,
        companyName: latestRequest.companyName,
        internshipLocationName: latestRequest.internshipLocationName,
        position: latestRequest.position,
        address: latestRequest.address,
        province: latestRequest.province,
        latitude: latestRequest.latitude,
        longitude: latestRequest.longitude,
        confirmedAt: latestRequest.confirmedAt
      }
    : null

  // Upcoming supervision visit
  const displayedCycle = activeApplication?.cooperativeCycle || latestRequest?.companyApplication.cooperativeCycle || openCycle

  const upcomingVisit = displayedCycle
    ? await prisma.supervisionVisit.findFirst({
        where: {
          studentUserId: user.id,
          cooperativeCycleId: displayedCycle.id,
          status: 'PUBLISHED'
        },
        orderBy: { visitDate: 'asc' }
      })
    : null

  // Notifications
  const [unreadNotificationsCount, recentNotifications] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, isRead: false }
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ])

  // Determine canApply
  const hasActiveApplicationInOpenCycle = activeApplication?.cooperativeCycleId === openCycle?.id
  const canApply = Boolean(openCycle) && !hasActiveApplicationInOpenCycle
  let reason: string | null = null
  if (!openCycle) {
    reason = `ขณะนี้ยังไม่มีรอบสหกิจศึกษาที่เปิดรับคำร้องสำหรับรุ่น ${user.cohortYear}`
  } else if (hasActiveApplicationInOpenCycle && activeApplication?.status === 'CONFIRMED') {
    reason = 'ท่านยืนยันสถานที่ฝึกงานและส่งคำร้องเรียบร้อยแล้ว'
  } else if (hasActiveApplicationInOpenCycle) {
    reason = 'ท่านมีรายการสมัครที่อยู่ระหว่างดำเนินการแล้ว 1 รายการ'
  }

  // Derive next action
  let nextAction: { type: string; label: string; to: string } | null = null
  if (latestRequest?.status === 'LETTER_READY') {
    nextAction = {
      type: 'LETTER_READY',
      label: 'มีหนังสือพร้อมดาวน์โหลด กรุณาส่งหนังสือตอบรับ',
      to: `/student/requests/${latestRequest.id}`
    }
  } else if (latestRequest?.status === 'RETURNED_FOR_REVISION') {
    nextAction = {
      type: 'RETURNED_FOR_REVISION',
      label: 'เอกสารมีข้อเสนอแนะให้แก้ไข กรุณาอัปโหลดฉบับใหม่',
      to: `/student/requests/${latestRequest.id}`
    }
  } else if (activeApplication?.status === 'ACCEPTED') {
    nextAction = {
      type: 'CONFIRM_APPLICATION',
      label: 'บริษัทตอบรับแล้ว กรุณายืนยันข้อมูลและส่งคำร้อง',
      to: `/student/applications/${activeApplication.id}`
    }
  } else if (activeApplication && ['SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW'].includes(activeApplication.status)) {
    nextAction = {
      type: 'VIEW_APPLICATION',
      label: 'ติดตามและอัปเดตผลการสมัคร',
      to: `/student/applications/${activeApplication.id}`
    }
  } else if (canApply) {
    nextAction = {
      type: 'CREATE_APPLICATION',
      label: 'เริ่มค้นหาและยื่นสมัครสถานประกอบการ',
      to: '/student/applications/new'
    }
  } else if (placement) {
    nextAction = {
      type: 'VIEW_PLACEMENT',
      label: 'ดูสถานที่ฝึกงานและตารางนิเทศ',
      to: '/student/placement'
    }
  }

  return {
    student: studentProfile,
    cycle: displayedCycle
      ? {
          id: displayedCycle.id,
          term: displayedCycle.term,
          academicYear: displayedCycle.academicYear,
          cohortYear: displayedCycle.cohortYear,
          status: displayedCycle.status,
          applicationStartDate: displayedCycle.applicationStartDate,
          applicationEndDate: displayedCycle.applicationEndDate,
          internshipStartDate: displayedCycle.internshipStartDate,
          internshipEndDate: displayedCycle.internshipEndDate,
          note: displayedCycle.note
        }
      : null,
    canApply,
    reason,
    activeApplication,
    latestRequest,
    placement,
    upcomingVisit,
    unreadNotificationsCount,
    recentNotifications,
    nextAction
  }
})
