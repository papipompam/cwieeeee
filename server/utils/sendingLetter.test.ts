import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { generateSendingLetter, type SendingLetterData } from './sendingLetter'

const assetsDir = path.resolve(process.cwd(), 'server/assets/sending-letter/v1')
const assets = {
  templatePdfBytes: fs.readFileSync(path.join(assetsDir, 'template.pdf')),
  fontRegularBytes: fs.readFileSync(path.join(assetsDir, 'THSarabunNew.ttf'))
}

const validData: SendingLetterData = {
  letterNumber: '123/2569',
  issueDate: new Date('2026-10-15T00:00:00+07:00'),
  referenceLetterNumber: '100/2569',
  referenceIssueDate: new Date('2026-09-20T00:00:00+07:00'),
  internshipHours: 450,
  internshipStartDate: new Date('2026-10-19T00:00:00+07:00'),
  internshipEndDate: new Date('2027-02-05T00:00:00+07:00'),
  recipientName: 'กรรมการผู้จัดการ บริษัท ตัวอย่าง จำกัด',
  students: [{ name: 'นายทดสอบ ระบบดี', studentId: '65011212001' }],
  signerName: 'อาจารย์ ดร.ทิพวัลย์ แสนคำ',
  signerTitleLines: [
    'คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน',
    'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
  ]
}

describe('sendingLetter renderer', () => {
  it('creates a one-page A4 PDF for one student', async () => {
    const bytes = await generateSendingLetter(validData, assets)
    const pdf = await PDFDocument.load(bytes)
    assert.strictEqual(pdf.getPageCount(), 1)
    const size = pdf.getPage(0).getSize()
    assert.ok(Math.abs(size.width - 595.32) < 0.5)
    assert.ok(Math.abs(size.height - 841.92) < 0.5)
  })

  it('accepts multiple students for the future grouped workflow', async () => {
    const bytes = await generateSendingLetter({
      ...validData,
      students: [
        validData.students[0]!,
        { name: 'นางสาวตัวอย่าง ทดสอบดี', studentId: '65011212002' }
      ]
    }, assets)
    assert.strictEqual((await PDFDocument.load(bytes)).getPageCount(), 1)
  })

  it('rejects an empty student list', async () => {
    await assert.rejects(() => generateSendingLetter({ ...validData, students: [] }, assets), /อย่างน้อยหนึ่งคน/)
  })

  it('rejects data that would overflow the approved single-page layout', async () => {
    await assert.rejects(
      () => generateSendingLetter({
        ...validData,
        recipientName: 'กรรมการผู้จัดการ'.repeat(30)
      }, assets),
      /ชื่อผู้รับหนังสือ/
    )
  })
})
