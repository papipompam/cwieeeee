import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  validateLetterGenerationInput,
  buildRequestLetterData,
  loadRequestLetterAssets,
  saveRequestLetterVersion
} from './requestLetterWorkflow'
import { generateRequestLetter } from './requestLetter'

if (!(globalThis as any).createError) {
  (globalThis as any).createError = (opts: any) => Object.assign(new Error(opts.message), opts)
}

function createFakeDb(initialState?: {
  requests?: any[]
  versions?: any[]
  notifications?: any[]
  failFirstVersionCreate?: boolean
  failNotification?: boolean
  statusConflict?: boolean
}) {
  const requests = (initialState?.requests || []).map(r => ({ ...r }))
  const versions = (initialState?.versions || []).map(v => ({ ...v }))
  const notifications: any[] = []
  let p2002Triggered = false
  const callOrder: string[] = []

  const db = {
    requests,
    versions,
    notifications,
    callOrder,
    requestLetterVersion: {
      async findFirst({ where, orderBy }: any) {
        const matching = versions.filter(v => v.cooperativeRequestId === where.cooperativeRequestId)
        if (orderBy?.version === 'desc') {
          matching.sort((a, b) => b.version - a.version)
        }
        return matching[0] ? { ...matching[0] } : null
      }
    },
    notification: {
      async create({ data }: any) {
        callOrder.push('notification_create')
        if (initialState?.failNotification) {
          throw new Error('Notification network failure')
        }
        notifications.push(data)
        return data
      }
    },
    async $transaction(cb: (tx: any) => Promise<any>) {
      const requestsSnapshot = requests.map(r => ({ ...r }))
      const versionsSnapshot = versions.map(v => ({ ...v }))
      const tx = {
        cooperativeRequest: {
          async updateMany({ where, data }: any) {
            if (initialState?.statusConflict) {
              return { count: 0 }
            }
            const req = requests.find(r => r.id === where.id && r.status === where.status)
            if (!req) return { count: 0 }
            Object.assign(req, data)
            return { count: 1 }
          }
        },
        requestLetterVersion: {
          async updateMany({ where, data }: any) {
            let updatedCount = 0
            for (const v of versions) {
              if (v.cooperativeRequestId === where.cooperativeRequestId && v.isActive === where.isActive) {
                Object.assign(v, data)
                updatedCount++
              }
            }
            return { count: updatedCount }
          },
          async create({ data }: any) {
            if (initialState?.failFirstVersionCreate && !p2002Triggered) {
              p2002Triggered = true
              // Simulate another transaction inserted this version already
              versions.push({
                id: versions.length + 1,
                cooperativeRequestId: data.cooperativeRequestId,
                version: data.version,
                isActive: true
              })
              const err = new Error('Unique constraint failed on the fields: (`cooperative_request_id`,`version`)') as any
              err.code = 'P2002'
              throw err
            }
            const record = { id: versions.length + 1, ...data, createdAt: new Date() }
            versions.push(record)
            return record
          }
        }
      }
      try {
        const result = await cb(tx)
        callOrder.push('transaction_commit')
        return result
      } catch (err) {
        requests.length = 0
        requests.push(...requestsSnapshot)
        // Keep the concurrent record in versions so next findFirst sees next version
        if (initialState?.failFirstVersionCreate && p2002Triggered) {
          if (!versions.some(v => v.version === 1)) {
            versions.push({
              id: 999,
              cooperativeRequestId: 1,
              version: 1,
              isActive: true
            })
          }
        } else {
          versions.length = 0
          versions.push(...versionsSnapshot)
        }
        throw err
      }
    }
  }

  return db
}

function createFakeFileOps() {
  const writtenFiles: any[] = []
  const cleanedFiles: string[] = []

  const writeLetterFile = async (opts: any) => {
    const filePath = `storage/letters/req-${opts.requestId}-v${opts.version}-test.pdf`
    const stored = {
      filePath,
      fileName: `letter-${opts.requestId}-v${opts.version}.pdf`,
      fileSize: opts.pdfBytes.length,
      sha256: 'fake-sha256-hex'
    }
    writtenFiles.push(stored)
    return stored
  }

  const cleanupLetterFile = async (filePath: string) => {
    cleanedFiles.push(filePath)
  }

  return { writtenFiles, cleanedFiles, writeLetterFile, cleanupLetterFile }
}

describe('requestLetterWorkflow utility', () => {
  const validSigner = {
    signerName: 'ผู้ช่วยศาสตราจารย์ ดร.ทดสอบ ระบบ',
    signerTitleLines: ['คณบดีคณะวิทยาศาสตร์', 'ปฏิบัติราชการแทน'],
    signatureImageBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  }

  const validCycle = {
    term: 2,
    academicYear: 2569,
    internshipHours: 450,
    internshipStartDate: new Date('2026-10-19T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-02-05T00:00:00.000+07:00')
  }

  const validRequest = {
    id: 1,
    status: 'SUBMITTED' as const,
    recipientName: 'กรรมการผู้จัดการ',
    companyName: 'บริษัท เอบีซี เทคโนโลยี จำกัด',
    companyApplication: {
      studentUserId: 101,
      studentUser: {
        prefix: 'นาย',
        firstName: 'สมชาย',
        lastName: 'เรียนดี',
        loginId: '64012345678'
      }
    }
  }

  const fixtureStorage = {
    async getItemRaw(key: string) {
      const baseDir = path.resolve(process.cwd(), 'server/assets/request-letter/v1')
      if (key === 'request-letter:v1:template.pdf') {
        return fs.readFile(path.join(baseDir, 'template.pdf'))
      }
      if (key === 'request-letter:v1:THSarabunNew.ttf') {
        return fs.readFile(path.join(baseDir, 'THSarabunNew.ttf'))
      }
      return null
    }
  }

  it('validates correct generation input body', () => {
    const input = validateLetterGenerationInput({
      letterNumber: '  ว ๑๒๓/๒๕๖๙  ',
      issueDate: '2026-10-01'
    })

    assert.strictEqual(input.letterNumber, 'ว ๑๒๓/๒๕๖๙')
    assert.ok(input.issueDate instanceof Date)
    assert.strictEqual(input.issueDate.getUTCFullYear(), 2026)
    assert.strictEqual(input.issueDate.getUTCMonth(), 9) // 0-indexed month: 9 = October
    assert.strictEqual(input.issueDate.getUTCDate(), 1)
  })

  it('rejects missing or empty letterNumber', () => {
    assert.throws(
      () => validateLetterGenerationInput({ letterNumber: '   ', issueDate: '2026-10-01' }),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'กรุณาระบุเลขที่หนังสือ')
        return true
      }
    )

    assert.throws(
      () => validateLetterGenerationInput({ issueDate: '2026-10-01' }),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'กรุณาระบุเลขที่หนังสือ')
        return true
      }
    )
  })

  it('rejects invalid or malformed issueDate', () => {
    assert.throws(
      () => validateLetterGenerationInput({ letterNumber: '1', issueDate: 'not-a-date' }),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.ok(err?.message.includes('วันที่ออกหนังสือ'))
        return true
      }
    )

    // Nonexistent leap day
    assert.throws(
      () => validateLetterGenerationInput({ letterNumber: '1', issueDate: '2026-02-29' }),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.ok(err?.message.includes('วันที่ไม่มีอยู่จริง'))
        return true
      }
    )
  })

  it('builds RequestLetterData correctly from authoritative server sources', () => {
    const input = {
      letterNumber: 'ว ๑/๒๕๖๙',
      issueDate: new Date('2026-10-01T00:00:00.000+07:00')
    }

    const data = buildRequestLetterData(validCycle, validRequest, input, validSigner)

    assert.strictEqual(data.letterNumber, 'ว ๑/๒๕๖๙')
    assert.strictEqual(data.term, 2)
    assert.strictEqual(data.academicYear, 2569)
    assert.strictEqual(data.internshipHours, 450)
    assert.strictEqual(data.recipientName, 'กรรมการผู้จัดการ')
    assert.strictEqual(data.companyName, 'บริษัท เอบีซี เทคโนโลยี จำกัด')
    assert.strictEqual(data.studentName, 'นายสมชาย เรียนดี')
    assert.strictEqual(data.studentId, '64012345678')
    assert.strictEqual(data.studentCount, 1)
    assert.strictEqual(data.signerName, validSigner.signerName)
    assert.deepStrictEqual(data.signerTitleLines, validSigner.signerTitleLines)
    assert.strictEqual(data.signatureImageBytes, validSigner.signatureImageBytes)
  })

  it('rejects building data when cycle internshipHours is missing or non-positive', () => {
    const cycleWithoutHours = { ...validCycle, internshipHours: null }
    const input = { letterNumber: '1', issueDate: new Date() }

    assert.throws(
      () => buildRequestLetterData(cycleWithoutHours, validRequest, input, validSigner),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'กรุณากำหนดจำนวนชั่วโมงฝึกประสบการณ์ในรอบสหกิจก่อนจัดทำหนังสือ')
        return true
      }
    )

    const cycleWithZeroHours = { ...validCycle, internshipHours: 0 }
    assert.throws(
      () => buildRequestLetterData(cycleWithZeroHours, validRequest, input, validSigner),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        return true
      }
    )
  })

  it('rejects building data when request recipientName is missing', () => {
    const requestNoRecipient = { ...validRequest, recipientName: '   ' }
    const input = { letterNumber: '1', issueDate: new Date() }

    assert.throws(
      () => buildRequestLetterData(validCycle, requestNoRecipient, input, validSigner),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'กรุณาระบุชื่อผู้รับหนังสือในคำร้องก่อนจัดทำหนังสือ')
        return true
      }
    )
  })

  it('rejects building data when request companyName is missing', () => {
    const requestNoCompany = { ...validRequest, companyName: '   ' }
    const input = { letterNumber: '1', issueDate: new Date() }

    assert.throws(
      () => buildRequestLetterData(validCycle, requestNoCompany, input, validSigner),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'กรุณาระบุชื่อสถานประกอบการในคำร้องก่อนจัดทำหนังสือ')
        return true
      }
    )
  })

  it('rejects building data when student user details are missing', () => {
    const requestNoStudent = {
      ...validRequest,
      companyApplication: { studentUserId: 101, studentUser: null }
    }
    const input = { letterNumber: '1', issueDate: new Date() }

    assert.throws(
      () => buildRequestLetterData(validCycle, requestNoStudent, input, validSigner),
      (err: any) => {
        assert.strictEqual(err?.statusCode, 400)
        assert.strictEqual(err?.message, 'ข้อมูลนักศึกษาสำหรับคำร้องนี้ไม่ครบถ้วน')
        return true
      }
    )
  })

  describe('asset loading', () => {
    it('loads request letter assets via injected storage without source filesystem fallback', async () => {
      const mockStorage = {
        async getItemRaw(key: string) {
          if (key === 'request-letter:v1:template.pdf') return new Uint8Array([1, 2, 3])
          if (key === 'request-letter:v1:THSarabunNew.ttf') return new Uint8Array([4, 5, 6])
          return null
        }
      }

      const assets = await loadRequestLetterAssets('v1', { storage: mockStorage })
      assert.deepStrictEqual(Array.from(assets.templatePdfBytes), [1, 2, 3])
      assert.deepStrictEqual(Array.from(assets.fontRegularBytes), [4, 5, 6])
    })

    it('throws controlled server error when asset is missing in storage without leaking paths', async () => {
      const missingStorage = {
        async getItemRaw() {
          return null
        }
      }

      await assert.rejects(
        () => loadRequestLetterAssets('v1', { storage: missingStorage }),
        (err: any) => {
          assert.strictEqual(err?.statusCode, 500)
          assert.strictEqual(err?.message, 'ไม่พบไฟล์ต้นแบบเอกสารหรือแบบอักษรในระบบ')
          assert.ok(!err?.message.includes('/'))
          assert.ok(!err?.message.includes('\\'))
          return true
        }
      )
    })

    it('throws controlled server error when storage is unavailable without leaking paths', async () => {
      await assert.rejects(
        () => loadRequestLetterAssets('v1'),
        (err: any) => {
          assert.strictEqual(err?.statusCode, 500)
          assert.strictEqual(err?.message, 'ไม่สามารถเข้าถึงระบบจัดเก็บไฟล์ต้นแบบเอกสารได้')
          assert.ok(!err?.message.includes('/'))
          assert.ok(!err?.message.includes('\\'))
          return true
        }
      )
    })

    it('loads test fixtures and renders valid PDF', async () => {
      const assets = await loadRequestLetterAssets('v1', { storage: fixtureStorage })
      assert.ok(assets.templatePdfBytes.length > 0)
      assert.ok(assets.fontRegularBytes.length > 0)

      const input = {
        letterNumber: 'ว ๑/๒๕๖๙',
        issueDate: new Date('2026-10-01T00:00:00.000+07:00')
      }
      const letterData = buildRequestLetterData(validCycle, validRequest, input, {
        ...validSigner,
        signatureImageBytes: undefined
      })

      const pdfBytes = await generateRequestLetter(letterData, assets)
      assert.ok(pdfBytes instanceof Uint8Array)
      assert.ok(pdfBytes.length > 0)
      assert.strictEqual(Buffer.from(pdfBytes.subarray(0, 5)).toString('ascii'), '%PDF-')
    })
  })

  describe('versioning, concurrency, and notification ordering', () => {
    it('creates first version successfully and maintains exactly one active version', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'SUBMITTED', letterFilePath: null, letterOriginalName: null }]
      })
      const fileOps = createFakeFileOps()

      const created = await saveRequestLetterVersion({
        request: validRequest,
        source: 'GENERATED',
        pdfBytes: new Uint8Array([10, 20, 30]),
        letterNumber: 'ว 1/2569',
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })

      assert.strictEqual(created.version, 1)
      assert.strictEqual(created.isActive, true)
      assert.strictEqual(db.versions.length, 1)
      assert.strictEqual(db.versions.filter(v => v.isActive).length, 1)
      assert.strictEqual(db.requests[0].status, 'LETTER_READY')
      assert.strictEqual(db.requests[0].letterFilePath, created.filePath)
      assert.strictEqual(fileOps.writtenFiles.length, 1)
      assert.strictEqual(fileOps.cleanedFiles.length, 0)
    })

    it('new version supersedes previous active version cleanly', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'LETTER_READY', letterFilePath: 'old.pdf', letterOriginalName: 'old.pdf' }]
      })
      const fileOps = createFakeFileOps()

      // Version 1
      const v1 = await saveRequestLetterVersion({
        request: { ...validRequest, status: 'LETTER_READY' },
        source: 'GENERATED',
        pdfBytes: new Uint8Array([1]),
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })
      assert.strictEqual(v1.version, 1)

      // Version 2 (supersedes v1)
      const v2 = await saveRequestLetterVersion({
        request: { ...validRequest, status: 'LETTER_READY' },
        source: 'GENERATED',
        pdfBytes: new Uint8Array([2]),
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })
      assert.strictEqual(v2.version, 2)
      assert.strictEqual(v2.isActive, true)

      assert.strictEqual(db.versions.length, 2)
      const oldV1 = db.versions.find(v => v.version === 1)
      assert.strictEqual(oldV1.isActive, false)
      assert.ok(oldV1.supersededAt instanceof Date)
      assert.strictEqual(db.versions.filter(v => v.isActive).length, 1)
      assert.strictEqual(fileOps.cleanedFiles.length, 0) // Historical files are preserved
    })

    it('P2002 retry cleans up attempted file and yields correct final version', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'SUBMITTED' }],
        failFirstVersionCreate: true
      })
      const fileOps = createFakeFileOps()

      const created = await saveRequestLetterVersion({
        request: validRequest,
        source: 'GENERATED',
        pdfBytes: new Uint8Array([100]),
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })

      assert.strictEqual(created.version, 2)
      assert.strictEqual(fileOps.writtenFiles.length, 2)
      assert.strictEqual(fileOps.cleanedFiles.length, 1)
      assert.strictEqual(fileOps.cleanedFiles[0], fileOps.writtenFiles[0].filePath)
      assert.strictEqual(created.filePath, fileOps.writtenFiles[1].filePath)
    })

    it('status conflict cleans up written file leaving no orphan file', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'SUBMITTED' }],
        statusConflict: true
      })
      const fileOps = createFakeFileOps()

      await assert.rejects(
        () => saveRequestLetterVersion({
          request: validRequest,
          source: 'GENERATED',
          pdfBytes: new Uint8Array([200]),
          userId: 99,
          deps: { prismaClient: db, ...fileOps }
        }),
        (err: any) => {
          assert.strictEqual(err?.statusCode, 409)
          assert.ok(err?.message.includes('สถานะคำร้องมีการเปลี่ยนแปลงแล้ว'))
          return true
        }
      )

      assert.strictEqual(fileOps.writtenFiles.length, 1)
      assert.strictEqual(fileOps.cleanedFiles.length, 1)
      assert.strictEqual(fileOps.cleanedFiles[0], fileOps.writtenFiles[0].filePath)
    })

    it('student notification is triggered strictly AFTER transaction commit', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'SUBMITTED' }]
      })
      const fileOps = createFakeFileOps()

      await saveRequestLetterVersion({
        request: validRequest,
        source: 'GENERATED',
        pdfBytes: new Uint8Array([50]),
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })

      assert.deepStrictEqual(db.callOrder, ['transaction_commit', 'notification_create'])
      assert.strictEqual(db.notifications.length, 1)
      assert.strictEqual(db.notifications[0].userId, validRequest.companyApplication.studentUserId)
    })

    it('if notification fails, document version and file are preserved and no error is thrown to caller', async () => {
      const db = createFakeDb({
        requests: [{ id: 1, status: 'SUBMITTED' }],
        failNotification: true
      })
      const fileOps = createFakeFileOps()

      const created = await saveRequestLetterVersion({
        request: validRequest,
        source: 'GENERATED',
        pdfBytes: new Uint8Array([75]),
        userId: 99,
        deps: { prismaClient: db, ...fileOps }
      })

      assert.ok(created)
      assert.strictEqual(created.version, 1)
      assert.strictEqual(created.isActive, true)
      assert.strictEqual(db.versions.length, 1)
      assert.strictEqual(fileOps.cleanedFiles.length, 0)
    })
  })
})
