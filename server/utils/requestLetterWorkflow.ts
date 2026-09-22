import type { CooperativeRequestStatus } from '~~/prisma/generated/client'
import { parseStrictDate } from './cycle'
import { prisma } from './db'
import type { RequestLetterData, RequestLetterAssets } from './requestLetter'
import type { RequestLetterSigner } from './requestLetterSigner'

function makeError(statusCode: number, message: string) {
  if (typeof (globalThis as any).createError === 'function') {
    return (globalThis as any).createError({ statusCode, message })
  }
  const err = new Error(message) as any
  err.statusCode = statusCode
  return err
}

export interface ValidatedLetterInput {
  letterNumber: string
  issueDate: Date
}

/**
 * Validates request letter generation/preview input body.
 * Ensures letterNumber is a non-empty string and issueDate is a valid strict YYYY-MM-DD date.
 */
export function validateLetterGenerationInput(body: any): ValidatedLetterInput {
  if (!body || typeof body !== 'object') {
    throw makeError(400, 'ข้อมูลสำหรับจัดทำหนังสือไม่ถูกต้อง')
  }

  const rawLetterNumber = body.letterNumber
  if (!rawLetterNumber || typeof rawLetterNumber !== 'string' || !rawLetterNumber.trim()) {
    throw makeError(400, 'กรุณาระบุเลขที่หนังสือ')
  }

  const issueDate = parseStrictDate(body.issueDate, 'วันที่ออกหนังสือ')

  return {
    letterNumber: rawLetterNumber.trim(),
    issueDate
  }
}

/**
 * Maps authoritative server data (cycle, request, student) and signer info to RequestLetterData.
 * Validates all required business rules strictly without fallback or guessing.
 */
export function buildRequestLetterData(
  cycle: {
    term: number
    academicYear: number
    internshipHours: number | null
    internshipStartDate: Date | string
    internshipEndDate: Date | string
  },
  request: {
    recipientName: string | null
    companyName: string
    companyApplication?: {
      studentUser?: {
        prefix?: string | null
        firstName?: string | null
        lastName?: string | null
        loginId?: string | null
      } | null
    } | null
  },
  input: ValidatedLetterInput,
  signer: RequestLetterSigner
): RequestLetterData {
  if (
    cycle.internshipHours === null ||
    cycle.internshipHours === undefined ||
    !Number.isInteger(cycle.internshipHours) ||
    cycle.internshipHours <= 0
  ) {
    throw makeError(400, 'กรุณากำหนดจำนวนชั่วโมงฝึกประสบการณ์ในรอบสหกิจก่อนจัดทำหนังสือ')
  }

  const recipientName = request.recipientName?.trim()
  if (!recipientName) {
    throw makeError(400, 'กรุณาระบุชื่อผู้รับหนังสือในคำร้องก่อนจัดทำหนังสือ')
  }

  const companyName = request.companyName?.trim()
  if (!companyName) {
    throw makeError(400, 'กรุณาระบุชื่อสถานประกอบการในคำร้องก่อนจัดทำหนังสือ')
  }

  const studentUser = request.companyApplication?.studentUser
  if (!studentUser || !studentUser.firstName?.trim() || !studentUser.lastName?.trim()) {
    throw makeError(400, 'ข้อมูลนักศึกษาสำหรับคำร้องนี้ไม่ครบถ้วน')
  }

  const prefix = studentUser.prefix?.trim() || ''
  const studentName = `${prefix}${studentUser.firstName.trim()} ${studentUser.lastName.trim()}`

  return {
    letterNumber: input.letterNumber,
    issueDate: input.issueDate,
    term: cycle.term,
    academicYear: cycle.academicYear,
    internshipHours: cycle.internshipHours,
    internshipStartDate: new Date(cycle.internshipStartDate),
    internshipEndDate: new Date(cycle.internshipEndDate),
    recipientName,
    companyName,
    studentName,
    studentCount: 1,
    signerName: signer.signerName,
    signerTitleLines: signer.signerTitleLines,
    signatureImageBytes: signer.signatureImageBytes
  }
}

export interface LoadRequestLetterAssetsOptions {
  storage?: {
    getItemRaw: (key: string) => Promise<any>
    hasItem?: (key: string) => Promise<boolean>
  }
}

/**
 * Loads request letter template and font assets.
 * Uses Nitro storage ('assets:server') for production and Docker runtime without filesystem fallback.
 * Allows explicit storage dependency injection for testing.
 */
export async function loadRequestLetterAssets(
  templateVersion: string = 'v1',
  options?: LoadRequestLetterAssetsOptions
): Promise<RequestLetterAssets> {
  const storage: any = options?.storage ?? (typeof useStorage === 'function' ? useStorage('assets:server') : undefined)

  if (!storage) {
    throw makeError(500, 'ไม่สามารถเข้าถึงระบบจัดเก็บไฟล์ต้นแบบเอกสารได้')
  }

  let templateItem: any
  let fontItem: any
  try {
    const templateKey = `request-letter:${templateVersion}:template.pdf`
    const fontKey = `request-letter:${templateVersion}:THSarabunNew.ttf`
    ;[templateItem, fontItem] = await Promise.all([
      storage.getItemRaw(templateKey),
      storage.getItemRaw(fontKey)
    ])
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw makeError(500, 'เกิดข้อผิดพลาดในการโหลดไฟล์ต้นแบบเอกสารหรือแบบอักษร')
  }

  if (!templateItem || !fontItem) {
    throw makeError(500, 'ไม่พบไฟล์ต้นแบบเอกสารหรือแบบอักษรในระบบ')
  }

  const toUint8Array = (val: any): Uint8Array => {
    if (val instanceof Uint8Array) return val
    if (Buffer.isBuffer(val)) return new Uint8Array(val)
    if (typeof val === 'string') return new Uint8Array(Buffer.from(val, 'binary'))
    return new Uint8Array(val)
  }

  return {
    templatePdfBytes: toUint8Array(templateItem),
    fontRegularBytes: toUint8Array(fontItem)
  }
}

export interface RequestLetterWorkflowDeps {
  prismaClient?: any
  writeLetterFile?: typeof writeRequestLetterFile
  cleanupLetterFile?: typeof cleanupStoredLetterFile
}

export interface SaveRequestLetterVersionParams {
  request: {
    id: number
    status: CooperativeRequestStatus
    companyName: string
    companyApplication: {
      studentUserId: number
    }
  }
  source: 'GENERATED' | 'UPLOADED'
  pdfBytes: Uint8Array
  fileName?: string
  letterNumber?: string
  issueDate?: Date
  templateVersion?: string
  signerName?: string
  signerTitle?: string
  userId: number
  deps?: RequestLetterWorkflowDeps
}

/**
 * Saves a request letter version with concurrency protection and atomic disk write.
 * - Writes file using writeRequestLetterFile under canonical containment
 * - Retries if version collision occurs in DB transaction (P2002) and cleans up orphaned file
 * - Transaction performs ONLY: status guard/update, superseding active versions, creating new version, syncing legacy fields
 * - Student notification is triggered strictly AFTER transaction commit
 * - If notification fails, the committed document version and file are preserved
 * - Cleans up file if transaction fails
 */
export async function saveRequestLetterVersion(
  params: SaveRequestLetterVersionParams
) {
  const {
    request,
    source,
    pdfBytes,
    fileName: originalFileName,
    letterNumber,
    issueDate,
    templateVersion,
    signerName,
    signerTitle,
    userId,
    deps
  } = params

  const db = deps?.prismaClient ?? prisma
  const writeFile = deps?.writeLetterFile ?? writeRequestLetterFile
  const cleanupFile = deps?.cleanupLetterFile ?? cleanupStoredLetterFile

  const targetStatus: CooperativeRequestStatus = ['SUBMITTED', 'STAFF_PROCESSING'].includes(
    request.status
  )
    ? 'LETTER_READY'
    : request.status

  const maxAttempts = 3
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++

    // 1. Find candidate version number
    const lastVersionRecord = await db.requestLetterVersion.findFirst({
      where: { cooperativeRequestId: request.id },
      orderBy: { version: 'desc' },
      select: { version: true }
    })
    const nextVersion = (lastVersionRecord?.version ?? 0) + 1

    // 2. Write file to disk atomically under canonical containment
    const stored = await writeFile({
      requestId: request.id,
      version: nextVersion,
      pdfBytes
    })

    const finalFileName =
      source === 'UPLOADED' && originalFileName ? originalFileName : stored.fileName

    // 3. Database transaction (ONLY status guard/update, superseding active versions, creating version)
    let createdVersion: any
    try {
      createdVersion = await db.$transaction(async (tx: any) => {
        // Concurrency guard: check status has not changed
        const updated = await tx.cooperativeRequest.updateMany({
          where: {
            id: request.id,
            status: request.status
          },
          data: {
            status: targetStatus,
            letterFilePath: stored.filePath,
            letterOriginalName: finalFileName,
            letterIssuedAt: new Date()
          }
        })

        if (updated.count === 0) {
          throw makeError(409, 'สถานะคำร้องมีการเปลี่ยนแปลงแล้ว กรุณารีเฟรชหน้าเว็บ')
        }

        // Supersede older active versions
        await tx.requestLetterVersion.updateMany({
          where: {
            cooperativeRequestId: request.id,
            isActive: true
          },
          data: {
            isActive: false,
            supersededAt: new Date()
          }
        })

        // Create new active version
        return await tx.requestLetterVersion.create({
          data: {
            cooperativeRequestId: request.id,
            version: nextVersion,
            source,
            fileName: finalFileName,
            filePath: stored.filePath,
            fileSize: stored.fileSize,
            sha256: stored.sha256,
            letterNumber: letterNumber ?? null,
            issueDate: issueDate ?? null,
            templateVersion: templateVersion ?? null,
            signerName: signerName ?? null,
            signerTitle: signerTitle ?? null,
            issuedByUserId: userId,
            isActive: true
          }
        })
      })
    } catch (err: any) {
      // Clean up the file written for this attempt
      await cleanupFile(stored.filePath).catch(() => {})

      // If version collided due to concurrent generation, retry with re-read version
      if (err?.code === 'P2002' && attempts < maxAttempts) {
        continue
      }
      throw err
    }

    // 4. Notification for student strictly AFTER transaction commit
    try {
      const notifTitle = ['SUBMITTED', 'STAFF_PROCESSING'].includes(request.status)
        ? 'หนังสือขอความอนุเคราะห์พร้อมดาวน์โหลด'
        : source === 'UPLOADED'
          ? 'มีการอัปเดตไฟล์หนังสือขอความอนุเคราะห์'
          : 'มีการออกหนังสือขอความอนุเคราะห์ฉบับใหม่'

      const notifMessage = ['SUBMITTED', 'STAFF_PROCESSING'].includes(request.status)
        ? source === 'UPLOADED'
          ? `เจ้าหน้าที่ได้แนบหนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} แล้ว`
          : `เจ้าหน้าที่ได้จัดทำหนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} แล้ว`
        : source === 'UPLOADED'
          ? `เจ้าหน้าที่ได้อัปเดตไฟล์หนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} ฉบับใหม่`
          : `เจ้าหน้าที่ได้จัดทำหนังสือขอความอนุเคราะห์สำหรับ ${request.companyName} ฉบับใหม่ (ฉบับที่ ${createdVersion.version})`

      await db.notification.create({
        data: {
          userId: request.companyApplication.studentUserId,
          title: notifTitle,
          message: notifMessage,
          link: '/student/applications'
        }
      })
    } catch {
      // Safe error handling without leaking path, signer data, or PDF bytes
      console.error('[saveRequestLetterVersion] Failed to send student notification')
    }

    return createdVersion
  }

  throw makeError(500, 'เกิดข้อผิดพลาดในการบันทึกเอกสารเนื่องจากการทำงานพร้อมกัน กรุณาลองใหม่อีกครั้ง')
}
