import { prisma } from './db'
import { cleanupStoredLetterFile, writeRequestLetterFile } from './letterStorage'
import type { RequestLetterSigner } from './requestLetterSigner'
import type { SendingLetterAssets, SendingLetterData } from './sendingLetter'

function makeError(statusCode: number, message: string) {
  if (typeof (globalThis as any).createError === 'function') {
    return (globalThis as any).createError({ statusCode, message })
  }
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = statusCode
  return error
}

export function buildSendingLetterData(
  cycle: {
    internshipHours: number | null
    internshipStartDate: Date | string
    internshipEndDate: Date | string
  },
  request: {
    status: string
    recipientName: string | null
    companyApplication: {
      studentUser: {
        prefix: string | null
        firstName: string | null
        lastName: string | null
        loginId: string | null
      }
    }
  },
  input: { letterNumber: string; issueDate: Date },
  reference: { letterNumber: string | null; issueDate: Date | null },
  signer: RequestLetterSigner
): SendingLetterData {
  if (request.status !== 'PLACEMENT_CONFIRMED') {
    throw makeError(400, 'สามารถออกหนังสือส่งตัวได้หลังยืนยันสถานที่ฝึกงานแล้วเท่านั้น')
  }
  if (!cycle.internshipHours || cycle.internshipHours <= 0) {
    throw makeError(400, 'กรุณากำหนดจำนวนชั่วโมงฝึกประสบการณ์ในรอบสหกิจก่อนออกหนังสือส่งตัว')
  }
  if (!reference.letterNumber?.trim() || !reference.issueDate) {
    throw makeError(400, 'ไม่พบเลขที่หรือวันที่ของหนังสือขอความอนุเคราะห์ฉบับที่ใช้อ้างอิง')
  }
  const recipientName = request.recipientName?.trim()
  if (!recipientName) throw makeError(400, 'กรุณาระบุชื่อผู้รับหนังสือในคำร้องก่อนออกหนังสือส่งตัว')

  const student = request.companyApplication.studentUser
  if (!student.firstName?.trim() || !student.lastName?.trim()) {
    throw makeError(400, 'ข้อมูลนักศึกษาสำหรับคำร้องนี้ไม่ครบถ้วน')
  }

  return {
    letterNumber: input.letterNumber,
    issueDate: input.issueDate,
    referenceLetterNumber: reference.letterNumber,
    referenceIssueDate: reference.issueDate,
    internshipHours: cycle.internshipHours,
    internshipStartDate: new Date(cycle.internshipStartDate),
    internshipEndDate: new Date(cycle.internshipEndDate),
    recipientName,
    students: [{
      name: `${student.prefix ?? ''}${student.firstName.trim()} ${student.lastName.trim()}`,
      studentId: student.loginId?.trim() || undefined
    }],
    signerName: signer.signerName,
    signerTitleLines: signer.signerTitleLines,
    signatureImageBytes: signer.signatureImageBytes
  }
}

export async function loadSendingLetterAssets(templateVersion = 'v1'): Promise<SendingLetterAssets> {
  const storage: any = typeof useStorage === 'function' ? useStorage('assets:server') : undefined
  if (!storage) throw makeError(500, 'ไม่สามารถเข้าถึงไฟล์ต้นแบบหนังสือส่งตัวได้')

  const [template, font] = await Promise.all([
    storage.getItemRaw(`sending-letter:${templateVersion}:template.pdf`),
    storage.getItemRaw(`sending-letter:${templateVersion}:THSarabunNew.ttf`)
  ])
  if (!template || !font) throw makeError(500, 'ไม่พบไฟล์ต้นแบบหรือแบบอักษรสำหรับหนังสือส่งตัว')

  const bytes = (value: any) => value instanceof Uint8Array
    ? value
    : Buffer.isBuffer(value)
      ? new Uint8Array(value)
      : new Uint8Array(value)

  return { templatePdfBytes: bytes(template), fontRegularBytes: bytes(font) }
}

export async function saveSendingLetterVersion(params: {
  request: { id: number; companyApplication: { studentUserId: number } }
  pdfBytes: Uint8Array
  input: { letterNumber: string; issueDate: Date }
  reference: { letterNumber: string; issueDate: Date }
  signer: RequestLetterSigner
  userId: number
  templateVersion?: string
  prismaClient?: any
  writeFile?: typeof writeRequestLetterFile
  cleanupFile?: typeof cleanupStoredLetterFile
}) {
  const db = params.prismaClient ?? prisma
  const writeFile = params.writeFile ?? writeRequestLetterFile
  const cleanupFile = params.cleanupFile ?? cleanupStoredLetterFile

  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await db.sendingLetterVersion.findFirst({
      where: { primaryCooperativeRequestId: params.request.id },
      orderBy: { version: 'desc' },
      select: { version: true }
    })
    const version = (latest?.version ?? 0) + 1
    const stored = await writeFile({ requestId: params.request.id, version, pdfBytes: params.pdfBytes })

    try {
      const created = await db.$transaction(async (tx: any) => {
        const current = await tx.cooperativeRequest.findUnique({
          where: { id: params.request.id },
          select: { status: true }
        })
        if (current?.status !== 'PLACEMENT_CONFIRMED') {
          throw makeError(409, 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ')
        }

        await tx.sendingLetterVersion.updateMany({
          where: { primaryCooperativeRequestId: params.request.id, isActive: true },
          data: { isActive: false, supersededAt: new Date() }
        })
        return tx.sendingLetterVersion.create({
          data: {
            primaryCooperativeRequestId: params.request.id,
            version,
            fileName: `sending-letter-${params.request.id}-v${version}.pdf`,
            filePath: stored.filePath,
            fileSize: stored.fileSize,
            sha256: stored.sha256,
            letterNumber: params.input.letterNumber,
            issueDate: params.input.issueDate,
            referenceLetterNumber: params.reference.letterNumber,
            referenceIssueDate: params.reference.issueDate,
            templateVersion: params.templateVersion ?? 'v1',
            signerName: params.signer.signerName,
            signerTitle: params.signer.signerTitleLines.join('\n'),
            issuedByUserId: params.userId,
            participants: { create: { cooperativeRequestId: params.request.id } }
          }
        })
      })

      await db.notification.create({
        data: {
          userId: params.request.companyApplication.studentUserId,
          title: 'หนังสือส่งตัวพร้อมดาวน์โหลด',
          message: 'เจ้าหน้าที่ได้จัดทำหนังสือส่งตัวสำหรับการฝึกประสบการณ์วิชาชีพแล้ว',
          link: '/student/applications'
        }
      }).catch(() => console.error('[saveSendingLetterVersion] Failed to send student notification'))
      return created
    } catch (error: any) {
      await cleanupFile(stored.filePath).catch(() => {})
      if (error?.code === 'P2002' && attempt < 2) continue
      throw error
    }
  }

  throw makeError(500, 'ไม่สามารถบันทึกหนังสือส่งตัวได้ กรุณาลองใหม่อีกครั้ง')
}
