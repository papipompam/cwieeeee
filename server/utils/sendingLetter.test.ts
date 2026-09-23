import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { decodePDFRawStream, PDFDocument } from 'pdf-lib'
import { generateSendingLetter, type SendingLetterData } from './sendingLetter'

const assetsDir = path.resolve(process.cwd(), 'server/assets/sending-letter/v1')
const assets = {
  templatePdfBytes: fs.readFileSync(path.join(assetsDir, 'template.pdf')),
  fontRegularBytes: fs.readFileSync(path.join(assetsDir, 'THSarabunNew.ttf'))
}

const validData: SendingLetterData = {
  letterNumber: '123/2569',
  issueDate: new Date('2026-10-15T00:00:00+07:00'),
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

const extractDrawnPositions = (pdf: PDFDocument) => {
  const contents = pdf.getPage(0).node.Contents()
  if (!contents) return []
  const stream = pdf.context.lookup(contents.get(contents.size() - 1)) as any
  const decoded = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
  return [...decoded.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)].map(match => ({ x: Number(match[1]), y: Number(match[2]) }))
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

  it('lays out six students down the left column before the right column', async () => {
    const bytes = await generateSendingLetter({
      ...validData,
      students: Array.from({ length: 6 }, (_, index) => ({ name: `นักศึกษา ${index + 1}`, studentId: `6501121200${index + 1}` }))
    }, assets)
    const positions = extractDrawnPositions(await PDFDocument.load(bytes))
      .filter(position => [120, 310].includes(position.x))
      .slice(-6)
    assert.deepStrictEqual(
      positions.map(position => position.x),
      [120, 120, 120, 310, 310, 310]
    )
    assert.deepStrictEqual(
      positions.map(position => position.y),
      [positions[0]!.y, positions[0]!.y - 25, positions[0]!.y - 50, positions[0]!.y, positions[0]!.y - 25, positions[0]!.y - 50]
    )
    assert.ok(!extractDrawnPositions(await PDFDocument.load(bytes)).some(position => [138, 353].includes(position.x)), 'Student IDs must not be rendered')
  })

  it('keeps three students in the left column', async () => {
    const bytes = await generateSendingLetter({
      ...validData,
      students: Array.from({ length: 3 }, (_, index) => ({ name: `นักศึกษา ${index + 1}` }))
    }, assets)
    const positions = extractDrawnPositions(await PDFDocument.load(bytes))
      .filter(position => [120, 310].includes(position.x))
      .slice(-3)
    assert.deepStrictEqual(positions.map(position => position.x), [120, 120, 120])
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
