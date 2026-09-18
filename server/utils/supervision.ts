import { prisma } from './db'
import { getStaffCycle, validatePositiveId } from './cycle'

export const getStaffSupervisionContext = async (event: any, options?: { mustNotBeClosed?: boolean }) => {
  const { user, cycle, cycleId } = await getStaffCycle(event, options)
  return { user, cycle, cycleId }
}

export const getSupervisionRound = async (cycleId: number, roundId: number) => {
  const round = await prisma.supervisionRound.findFirst({
    where: { id: roundId, cooperativeCycleId: cycleId }
  })
  if (!round) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลครั้งที่นิเทศในรอบสหกิจนี้' })
  }
  return round
}

export const getSupervisionGroup = async (roundId: number, groupId: number) => {
  const group = await prisma.supervisionGroup.findFirst({
    where: { id: groupId, supervisionRoundId: roundId },
    include: {
      companies: {
        include: {
          company: true
        }
      },
      teachers: {
        include: {
          teacherUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              phone: true,
              gender: true
            }
          }
        }
      }
    }
  })
  if (!group) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลกลุ่มนิเทศในครั้งที่นิเทศนี้' })
  }
  return group
}

export const getSupervisionAppointment = async (roundId: number, appointmentId: number) => {
  const appointment = await prisma.supervisionAppointment.findFirst({
    where: { id: appointmentId, supervisionRoundId: roundId },
    include: {
      company: true,
      supervisionGroup: true,
      students: {
        include: {
          studentUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          cooperativeRequest: true
        }
      },
      teachers: {
        include: {
          teacherUser: {
            select: {
              id: true,
              loginId: true,
              prefix: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        }
      }
    }
  })
  if (!appointment) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลนัดหมายในครั้งที่นิเทศนี้' })
  }
  return appointment
}

export const checkTeacherScheduleConflict = async (
  cycleId: number,
  scheduledDate: Date,
  period: string,
  teacherUserIds: number[],
  excludeAppointmentIds?: number[],
  tx?: any
) => {
  if (!teacherUserIds || teacherUserIds.length === 0) return
  const db = tx || prisma

  // Find other published or rescheduled appointments in the same cycle on the same date
  const appointmentsOnDate = await db.supervisionAppointment.findMany({
    where: {
      supervisionRound: { cooperativeCycleId: cycleId },
      scheduledDate,
      status: { in: ['PUBLISHED', 'RESCHEDULED'] },
      ...(excludeAppointmentIds?.length ? { id: { notIn: excludeAppointmentIds } } : {})
    },
    include: {
      teachers: {
        include: {
          teacherUser: {
            select: {
              id: true,
              prefix: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  })

  for (const app of appointmentsOnDate) {
    const isPeriodOverlap =
      app.period === period ||
      app.period === 'FULL_DAY' ||
      period === 'FULL_DAY'

    if (!isPeriodOverlap) continue

    for (const t of app.teachers) {
      if (teacherUserIds.includes(t.teacherUserId)) {
        const teacherName = `${t.teacherUser?.prefix || ''}${t.teacherUser?.firstName || ''} ${t.teacherUser?.lastName || ''}`.trim()
        throw createError({
          statusCode: 400,
          message: `อาจารย์ ${teacherName} มีตารางนิเทศที่เผยแพร่แล้วในช่วงเวลาดังกล่าว (${app.companyName})`
        })
      }
    }
  }
}

export const checkIntraBatchTeacherConflict = (
  appointments: Array<{
    id: number
    companyName: string
    scheduledDate: Date
    period: string
    teachers: Array<{ teacherUserId: number; teacherUser?: any }>
  }>
) => {
  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const a1 = appointments[i]!
      const a2 = appointments[j]!

      // Check date match
      const d1 = new Date(a1.scheduledDate).toISOString().slice(0, 10)
      const d2 = new Date(a2.scheduledDate).toISOString().slice(0, 10)
      if (d1 !== d2) continue

      // Check period overlap
      const isOverlap = a1.period === a2.period || a1.period === 'FULL_DAY' || a2.period === 'FULL_DAY'
      if (!isOverlap) continue

      // Check shared teachers
      const t1Ids = a1.teachers.map(t => t.teacherUserId)
      for (const t2 of a2.teachers) {
        if (t1Ids.includes(t2.teacherUserId)) {
          const tName = `${t2.teacherUser?.prefix || ''}${t2.teacherUser?.firstName || ''} ${t2.teacherUser?.lastName || ''}`.trim()
          throw createError({
            statusCode: 400,
            message: `พบข้อขัดแย้งของอาจารย์ ${tName || 'ในกลุ่ม'} ในรายการนัดหมายที่เลือกเผยแพร่พร้อมกัน (${a1.companyName} และ ${a2.companyName})`
          })
        }
      }
    }
  }
}

export const lockTeacherScheduleSlots = async (
  tx: any,
  slots: Array<{ scheduledDate: Date; teacherUserIds: number[] }>
) => {
  const locks = new Map<string, { teacherUserId: number; day: number }>()

  for (const slot of slots) {
    const day = Math.floor(Date.UTC(
      slot.scheduledDate.getUTCFullYear(),
      slot.scheduledDate.getUTCMonth(),
      slot.scheduledDate.getUTCDate()
    ) / 86_400_000)
    for (const teacherUserId of slot.teacherUserIds) {
      locks.set(`${day}:${teacherUserId}`, { teacherUserId, day })
    }
  }

  for (const lock of [...locks.values()].sort((a, b) => a.day - b.day || a.teacherUserId - b.teacherUserId)) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lock.teacherUserId}, ${lock.day})`
  }
}

export const validateAppointmentStudents = async (
  cycleId: number,
  companyId: number,
  studentUserIds: number[],
  tx?: any
): Promise<Map<number, number>> => {
  const db = tx || prisma
  if (!studentUserIds || studentUserIds.length === 0) {
    throw createError({ statusCode: 400, message: 'นัดหมายต้องมีนักศึกษาอย่างน้อย 1 คน' })
  }

  const confirmedRequests = await db.cooperativeRequest.findMany({
    where: {
      status: 'PLACEMENT_CONFIRMED',
      companyApplication: {
        cooperativeCycleId: cycleId,
        companyId
      }
    },
    include: {
      companyApplication: { select: { studentUserId: true } }
    }
  })

  const reqMap = new Map<number, number>()
  for (const req of confirmedRequests) {
    reqMap.set(req.companyApplication.studentUserId, req.id)
  }

  for (const sId of studentUserIds) {
    if (!reqMap.has(sId)) {
      throw createError({
        statusCode: 400,
        message: `นักศึกษารหัสผู้ใช้ ${sId} ไม่ได้ยืนยันการฝึกงานกับสถานประกอบการนี้ในรอบสหกิจปัจจุบัน`
      })
    }
  }

  return reqMap
}

export const validateAppointmentTeachers = async (
  groupId: number,
  teacherUserIds: number[],
  tx?: any
) => {
  const db = tx || prisma
  if (!teacherUserIds || teacherUserIds.length === 0) {
    throw createError({ statusCode: 400, message: 'นัดหมายต้องมีอาจารย์นิเทศอย่างน้อย 1 ท่าน' })
  }

  // Verify teachers belong to group
  const groupTeachers = await db.supervisionGroupTeacher.findMany({
    where: { supervisionGroupId: groupId },
    select: { teacherUserId: true }
  })
  const allowedTeacherIds = new Set(groupTeachers.map((gt: any) => gt.teacherUserId))

  for (const tId of teacherUserIds) {
    if (!allowedTeacherIds.has(tId)) {
      throw createError({
        statusCode: 400,
        message: `อาจารย์รหัสผู้ใช้ ${tId} ไม่ได้อยู่ในกลุ่มนิเทศนี้`
      })
    }
  }

  // Verify all are active teachers
  const activeTeachers = await db.user.findMany({
    where: {
      id: { in: teacherUserIds },
      role: 'TEACHER',
      isActive: true
    },
    select: { id: true }
  })
  if (activeTeachers.length !== teacherUserIds.length) {
    throw createError({
      statusCode: 400,
      message: 'พบอาจารย์ที่ไม่มีสถานะปฏิบัติงาน (Inactive) หรือไม่ได้มีบทบาทอาจารย์'
    })
  }
}

export const validateTravelPlanTravellers = async (
  groupId: number,
  travellerUserIds: number[],
  tx?: any
) => {
  const db = tx || prisma
  if (!travellerUserIds || travellerUserIds.length === 0) {
    return
  }

  const groupTeachers = await db.supervisionGroupTeacher.findMany({
    where: { supervisionGroupId: groupId },
    select: { teacherUserId: true }
  })
  const allowedTeacherIds = new Set(groupTeachers.map((gt: any) => gt.teacherUserId))

  for (const tId of travellerUserIds) {
    if (!allowedTeacherIds.has(tId)) {
      throw createError({
        statusCode: 400,
        message: `ผู้เดินทางรหัสผู้ใช้ ${tId} ไม่ใช่อาจารย์ที่อยู่ในกลุ่มนิเทศนี้`
      })
    }
  }

  const activeTeachers = await db.user.findMany({
    where: {
      id: { in: travellerUserIds },
      role: 'TEACHER',
      isActive: true
    },
    select: { id: true }
  })
  if (activeTeachers.length !== travellerUserIds.length) {
    throw createError({
      statusCode: 400,
      message: 'พบผู้เดินทางที่ไม่มีสถานะปฏิบัติงาน (Inactive) หรือไม่ได้มีบทบาทอาจารย์'
    })
  }
}

export interface TravelCalculationBreakdown {
  totalDistanceKm: number
  fuelRate: number
  fuelCost: number
  perDiemTotal: number
  lodgingTotal: number
  grandTotal: number
  totalEstimate: number
  travellerDetails: Array<{
    teacherUserId: number
    teacherName?: string
    perDiemCost: number
    lodgingCost: number
    totalCost: number
  }>
}

export const calculateTravelBudget = (
  fuelRate: number,
  stops: Array<{ distanceKmFromPrevious: number }>,
  travellers: Array<{
    teacherUserId: number
    teacherName?: string
    perDiemRate: number
    perDiemDays: number
    lodgingRate: number
    nights: number
    personsPerRoom: number
  }>,
  lodging?: { rate: number; nights: number; rooms: number }
): TravelCalculationBreakdown => {
  const totalDistanceKm = stops.reduce((acc, s) => acc + (Number(s.distanceKmFromPrevious) || 0), 0)
  const fuelCost = Math.round(totalDistanceKm * (Number(fuelRate) || 0) * 100) / 100
  const hasLodgingBreakdown = Boolean(lodging && Number(lodging.rooms) > 0)

  let perDiemTotal = 0
  let lodgingTotal = hasLodgingBreakdown && lodging
    ? Math.round((Math.max(0, lodging.rate) * Math.max(0, lodging.nights) * Math.max(0, lodging.rooms)) * 100) / 100
    : 0

  const travellerDetails = travellers.map((t) => {
    const perDiemCost = Math.round((Number(t.perDiemRate) || 0) * (Number(t.perDiemDays) || 0) * 100) / 100
    const personsPerRoom = Math.max(1, Number(t.personsPerRoom) || 1)
    const lodgingCost = hasLodgingBreakdown ? 0 : Math.round((((Number(t.lodgingRate) || 0) * (Number(t.nights) || 0)) / personsPerRoom) * 100) / 100
    const totalCost = Math.round((perDiemCost + lodgingCost) * 100) / 100

    perDiemTotal += perDiemCost
    lodgingTotal += lodgingCost

    return {
      teacherUserId: t.teacherUserId,
      teacherName: t.teacherName,
      perDiemCost,
      lodgingCost,
      totalCost
    }
  })

  perDiemTotal = Math.round(perDiemTotal * 100) / 100
  lodgingTotal = Math.round(lodgingTotal * 100) / 100
  const grandTotal = Math.round((fuelCost + perDiemTotal + lodgingTotal) * 100) / 100

  return {
    totalDistanceKm,
    fuelRate,
    fuelCost,
    perDiemTotal,
    lodgingTotal,
    grandTotal,
    totalEstimate: grandTotal,
    travellerDetails
  }
}

export const notifySupervisionParticipants = async (opts: {
  title: string
  message: string
  link?: string
  studentUserIds: number[]
  teacherUserIds: number[]
}) => {
  const recipientIds = Array.from(new Set([...opts.studentUserIds, ...opts.teacherUserIds]))
  if (recipientIds.length === 0) return

  await prisma.notification.createMany({
    data: recipientIds.map(userId => ({
      userId,
      title: opts.title,
      message: opts.message,
      link: opts.link || null
    }))
  })
}
