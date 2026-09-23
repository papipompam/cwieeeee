import assert from 'node:assert'
import { describe, it } from 'node:test'
import { buildSendingLetterData, saveSendingLetterVersion } from './sendingLetterWorkflow'

const cycle = {
  internshipHours: null,
  internshipStartDate: new Date('2026-10-19T00:00:00+07:00'),
  internshipEndDate: new Date('2027-02-05T00:00:00+07:00')
}
const request = {
  status: 'PLACEMENT_CONFIRMED',
  recipientName: 'กรรมการผู้จัดการ',
  companyApplication: {
    studentUser: {
      prefix: 'นาย',
      firstName: 'ทดสอบ',
      lastName: 'ระบบดี',
      loginId: '65011212001'
    }
  }
}
const input = { letterNumber: '123/2569', issueDate: new Date('2026-10-15T00:00:00+07:00') }
const reference = { letterNumber: '100/2569', issueDate: new Date('2026-09-20T00:00:00+07:00') }
const signer = {
  signerName: 'อาจารย์ ดร.ทิพวัลย์ แสนคำ',
  signerTitleLines: ['คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน', 'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'],
  signatureImageBytes: new Uint8Array([1])
}

describe('sendingLetterWorkflow', () => {
  it('maps confirmed request and active request letter into sending-letter data', () => {
    const result = buildSendingLetterData(cycle, request, input, reference, signer)
    assert.strictEqual(result.internshipStartDate.toISOString(), cycle.internshipStartDate.toISOString())
    assert.deepStrictEqual(result.students, [{ name: 'นายทดสอบ ระบบดี', studentId: '65011212001' }])
  })

  it('requires a confirmed placement', () => {
    assert.throws(
      () => buildSendingLetterData(cycle, { ...request, status: 'LETTER_READY' }, input, reference, signer),
      /หลังยืนยันสถานที่ฝึกงาน/
    )
  })

  it('requires an active request-letter number and issue date', () => {
    assert.throws(
      () => buildSendingLetterData(cycle, request, input, { letterNumber: null, issueDate: null }, signer),
      /หนังสือขอความอนุเคราะห์/
    )
  })

  it('stores one participant and keeps the confirmed request status unchanged', async () => {
    let createData: any
    const fakeDb = {
      sendingLetterVersion: {
        findFirst: async () => null
      },
      notification: { create: async () => ({ id: 1 }) },
      $transaction: async (callback: (tx: any) => Promise<any>) => callback({
        cooperativeRequest: { findUnique: async () => ({ status: 'PLACEMENT_CONFIRMED' }) },
        sendingLetterVersion: {
          updateMany: async () => ({ count: 0 }),
          create: async ({ data }: any) => {
            createData = data
            return { id: 1, ...data }
          }
        }
      })
    }

    const created = await saveSendingLetterVersion({
      request: { id: 3, companyApplication: { studentUserId: 9 } },
      pdfBytes: new Uint8Array([37, 80, 68, 70]),
      input,
      reference: { letterNumber: reference.letterNumber!, issueDate: reference.issueDate! },
      signer,
      userId: 1,
      prismaClient: fakeDb,
      writeFile: async () => ({ filePath: '/safe/letter.pdf', fileName: 'letter.pdf', fileSize: 4, sha256: 'hash' }),
      cleanupFile: async () => undefined
    })

    assert.strictEqual(created.version, 1)
    assert.deepStrictEqual(createData.participants, { create: { cooperativeRequestId: 3 } })
    assert.strictEqual(createData.referenceLetterNumber, '100/2569')
  })
})
