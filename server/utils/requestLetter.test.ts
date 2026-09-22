import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, decodePDFRawStream } from 'pdf-lib'
import {
  generateRequestLetter,
  toThaiDigits,
  formatThaiDate,
  type RequestLetterData,
  type RequestLetterAssets
} from './requestLetter'

const ASSETS_DIR = path.resolve(process.cwd(), 'server/assets/request-letter/v1')
const templateBytes = fs.readFileSync(path.join(ASSETS_DIR, 'template.pdf'))
const fontBytes = fs.readFileSync(path.join(ASSETS_DIR, 'THSarabunNew.ttf'))
const assets: RequestLetterAssets = {
  templatePdfBytes: templateBytes,
  fontRegularBytes: fontBytes
}

const baseValidData: RequestLetterData = {
  letterNumber: 'ว ๑/๒๕๖๙',
  issueDate: new Date('2026-10-01T00:00:00.000+07:00'),
  term: 2,
  academicYear: 2569,
  internshipHours: 450,
  internshipStartDate: new Date('2026-10-19T00:00:00.000+07:00'),
  internshipEndDate: new Date('2027-02-05T00:00:00.000+07:00'),
  recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  companyName: 'บริษัท ทดสอบเทคโนโลยี จำกัด',
  studentName: 'นายทดสอบ ระบบดี',
  studentCount: 1,
  signerName: 'ผู้ช่วยศาสตราจารย์ ดร.ผู้ลงนาม ทดสอบ',
  signerTitleLines: ['คณบดีคณะวิทยาศาสตร์'],
  signatureImageBytes: undefined
}

describe('requestLetter renderer', () => {
  it('converts Arabic digits to Thai digits', () => {
    assert.strictEqual(toThaiDigits('ว 123/2569'), 'ว ๑๒๓/๒๕๖๙')
    assert.strictEqual(toThaiDigits(450), '๔๕๐')
    assert.strictEqual(toThaiDigits('0123456789'), '๐๑๒๓๔๕๖๗๘๙')
  })

  it('formats Buddhist calendar dates in Asia/Bangkok timezone', () => {
    const testDate = new Date('2026-10-15T00:00:00.000+07:00')
    const formatted = formatThaiDate(testDate)
    assert.ok(formatted.includes('๑๕'), 'Day must be Thai digits')
    assert.ok(formatted.includes('ตุลาคม'), 'Month must be Thai name')
    assert.ok(formatted.includes('๒๕๖๙'), 'Year must be Buddhist era in Thai digits')
  })

  it('generates a valid 2-page A4 PDF with valid data and no signature', async () => {
    const pdfBytes = await generateRequestLetter({ ...baseValidData, signatureImageBytes: undefined }, assets)
    assert.ok(pdfBytes instanceof Uint8Array)
    assert.strictEqual(Buffer.from(pdfBytes.subarray(0, 5)).toString('ascii'), '%PDF-')

    const doc = await PDFDocument.load(pdfBytes)
    assert.strictEqual(doc.getPageCount(), 2, 'Must have exactly 2 pages')

    for (let i = 0; i < 2; i++) {
      const { width, height } = doc.getPage(i).getSize()
      assert.ok(Math.abs(width - 595.32) < 0.5, `Page ${i + 1} width must be A4 (~595.32 pt)`)
      assert.ok(Math.abs(height - 841.92) < 0.5, `Page ${i + 1} height must be A4 (~841.92 pt)`)
    }
  })

  it('generates a valid PDF when signatureImageBytes is provided', async () => {
    // 1x1 transparent PNG for signature test
    const dummyPngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const pdfBytes = await generateRequestLetter(
      { ...baseValidData, signatureImageBytes: new Uint8Array(dummyPngBytes) },
      assets
    )
    const doc = await PDFDocument.load(pdfBytes)
    assert.strictEqual(doc.getPageCount(), 2)
  })

  it('handles complex Thai vowels and tone marks properly', async () => {
    const thaiVowelData: RequestLetterData = {
      ...baseValidData,
      recipientName: 'ผู้จัดการทั่วไปฝ่ายปฏิบัติการและนวัตกรรม',
      companyName: 'บริษัท ปิโตรเลียมและพลังงานบริสุทธิ์แห่งประเทศไทย จำกัด (มหาชน)',
      studentName: 'นายสิริวัฒน์ ฐิติพงศ์ปรีชากุล',
      signerName: 'ผู้ช่วยศาสตราจารย์ ดร.นิรมิต เทพประทาน',
      signerTitleLines: ['รองคณบดีฝ่ายวิชาการและวิจัย', 'ปฏิบัติราชการแทนคณบดีคณะวิทยาศาสตร์']
    }
    const pdfBytes = await generateRequestLetter(thaiVowelData, assets)
    const doc = await PDFDocument.load(pdfBytes)
    assert.strictEqual(doc.getPageCount(), 2)
  })

function extractPageDrawnLines(page: any, doc: any) {
  const contents = page.node.Contents()
  const lastStreamRef = contents.get(contents.size() - 1)
  const stream = doc.context.lookup(lastStreamRef)
  const raw = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
  // Each drawn line or block is enclosed in q ... Q blocks
  const blocks = raw.split('Q\n').filter(b => b.trim().length > 0)
  return blocks.map(b => {
    const posMatch = b.match(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/)
    const textMatch = b.match(/<([0-9a-fA-F]+)>\s*Tj/)
    return {
      x: posMatch ? posMatch[1] : null,
      y: posMatch ? posMatch[2] : null,
      hex: textMatch ? textMatch[1] : null
    }
  })
}

  it('page 2 fills only the internship dates dynamically', async () => {
    // 1. PDF A: base data
    const sharedStartDate = new Date('2026-10-19T00:00:00.000+07:00')
    const sharedEndDate = new Date('2027-02-05T00:00:00.000+07:00')

    const dataA: RequestLetterData = {
      letterNumber: 'ว ๑/๒๕๖๙',
      issueDate: new Date('2026-10-01T00:00:00.000+07:00'),
      term: 1,
      academicYear: 2569,
      internshipHours: 300,
      internshipStartDate: sharedStartDate,
      internshipEndDate: sharedEndDate,
      recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
      companyName: 'บริษัท ทดสอบ ก จำกัด',
      studentName: 'นายสมชาย สายลม',
      studentCount: 1,
      signerName: 'ผู้ช่วยศาสตราจารย์ ดร.สมศักดิ์ นามสมมุติ',
      signerTitleLines: ['คณบดีคณะวิทยาศาสตร์'],
      signatureImageBytes: undefined
    }

    // 2. PDF B: same internship dates as A, but drastically different Page 1 fields
    const dummyPngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const dataB: RequestLetterData = {
      letterNumber: 'ว ๙๙๙/๒๕๗๐',
      issueDate: new Date('2027-01-15T00:00:00.000+07:00'),
      term: 2,
      academicYear: 2570,
      internshipHours: 450,
      internshipStartDate: sharedStartDate, // EXACTLY the same
      internshipEndDate: sharedEndDate,   // EXACTLY the same
      recipientName: 'กรรมการผู้จัดการใหญ่และประธานเจ้าหน้าที่บริหาร',
      companyName: 'บริษัท ปิโตรเคมีคอล นวัตกรรม จำกัด (มหาชน)',
      studentName: 'นางสาวกานดา วิไลลักษณ์',
      studentCount: 3,
      signerName: 'รองศาสตราจารย์ ดร.ประสิทธิ์ เกียรติขจร',
      signerTitleLines: [
        'รองคณบดีฝ่ายวิชาการและวิจัย',
        'ปฏิบัติราชการแทนคณบดีคณะวิทยาศาสตร์'
      ],
      signatureImageBytes: new Uint8Array(dummyPngBytes)
    }

    const docA = await PDFDocument.load(await generateRequestLetter(dataA, assets))
    const docB = await PDFDocument.load(await generateRequestLetter(dataB, assets))

    // Confirm Page 1 content is completely different between A and B
    const p1LinesA = extractPageDrawnLines(docA.getPage(0), docA)
    const p1LinesB = extractPageDrawnLines(docB.getPage(0), docB)
    assert.notDeepStrictEqual(p1LinesA, p1LinesB, 'Page 1 drawn content must differ between A and B')

    // Confirm Page 2 drawn content is completely identical between A and B
    const p2LinesA = extractPageDrawnLines(docA.getPage(1), docA)
    const p2LinesB = extractPageDrawnLines(docB.getPage(1), docB)
    assert.strictEqual(p2LinesA.length, 3, 'Page 2 should have exactly 3 drawn paragraph lines')
    assert.strictEqual(p2LinesB.length, 3, 'Page 2 should have exactly 3 drawn paragraph lines')
    assert.deepStrictEqual(
      p2LinesA,
      p2LinesB,
      'Page 2 drawn text lines must be identical between A and B because internship dates are equal'
    )

    // 3. PDF C: identical to A, but with different internship dates
    const dataC: RequestLetterData = {
      ...dataA,
      internshipStartDate: new Date('2026-11-01T00:00:00.000+07:00'),
      internshipEndDate: new Date('2027-03-31T00:00:00.000+07:00')
    }
    const docC = await PDFDocument.load(await generateRequestLetter(dataC, assets))
    const p2LinesC = extractPageDrawnLines(docC.getPage(1), docC)

    assert.strictEqual(p2LinesC.length, 3, 'Page 2 of C should have exactly 3 drawn paragraph lines')
    // Line 0 (Static prefix text): identical to A
    assert.deepStrictEqual(p2LinesC[0], p2LinesA[0], 'Page 2 Line 0 (prefix text) must remain identical')
    // Line 1 (Dynamic dates text): differs from A in text glyphs, but same Y coordinate
    assert.strictEqual(p2LinesC[1].y, p2LinesA[1].y, 'Page 2 Line 1 must be at the same vertical coordinate')
    assert.notStrictEqual(p2LinesC[1].hex, p2LinesA[1].hex, 'Page 2 Line 1 text must change when internship dates change')
    // Line 2 (Static suffix text): identical to A
    assert.deepStrictEqual(p2LinesC[2], p2LinesA[2], 'Page 2 Line 2 (suffix text) must remain identical')
  })

  describe('overflow boundaries and guards', () => {
    it('rejects oversized letterNumber colliding with center Garuda emblem', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              letterNumber: 'ว ๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙/๒๕๖๙/ศธ๐๖๒๔/พิเศษมาก'
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(err.message.includes('Letter number'), 'Must name field in error message')
          assert.ok(err.message.includes('collide with the center Garuda'), 'Must mention collision with Garuda')
          return true
        }
      )
    })

    it('rejects oversized recipientName (> 2 lines)', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              recipientName:
                'ประธานกรรมการบริหารและประธานเจ้าหน้าที่บริหารสูงสุดฝ่ายปฏิบัติการระดับภูมิภาคเอเชียแปซิฟิก และรองกรรมการผู้จัดการใหญ่ฝ่ายพัฒนาทรัพยากรบุคคลและบริหารงานทั่วไป ประจำสำนักงานใหญ่ภูมิภาค บริษัท ข้ามชาติเทคโนโลยีดิจิทัล โซลูชั่นส์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)'
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(err.message.includes('Recipient name is too long'), 'Must name field in error message')
          assert.ok(err.message.includes('สิ่งที่ส่งมาด้วย'), 'Must mention collision target')
          return true
        }
      )
    })

    it('rejects oversized companyName / body paragraph (> 8 lines or exceeds safe margin)', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              companyName:
                'บริษัท พัฒนาเทคโนโลยีดิจิทัล คลาวด์คอมพิวติ้ง ซอฟต์แวร์วิศวกรรม ปัญญาประดิษฐ์ หุ่นยนต์อัตโนมัติ นวัตกรรมการสื่อสารโทรคมนาคมความเร็วสูง และระบบบริหารจัดการข้อมูลสารสนเทศขนาดใหญ่เพื่ออุตสาหกรรมยานยนต์แห่งอนาคตและพลังงานหมุนเวียนแบบยั่งยืนครบวงจร จำกัด (มหาชน) สาขาประจำเขตพัฒนาพิเศษภาคตะวันออก ประเทศไทย'
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(
            err.message.includes('Body paragraph is too long') || err.message.includes('Student line position'),
            'Must name body paragraph or safe bound in error message'
          )
          return true
        }
      )
    })

    it('rejects oversized student details (exceeds single line width)', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              studentName:
                'นายสมเด็จพระมหาบุรุษรามาธิบดีศรีสุริยพงศ์พิริยะสถาพรชัยโยดมสกลรัตนโกสินทร์ มหาเจษฎาบดินทร์สิริวิลาสโภคินทร์วรวัชรเกียรติกุลวัฒนศักดาภิเษก'
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(err.message.includes('Student details are too long'), 'Must name field in error message')
          return true
        }
      )
    })

    it('rejects signer title lines when count exceeds 3 lines', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              signerTitleLines: [
                'รองคณบดีฝ่ายวิชาการและวิจัย',
                'ปฏิบัติราชการแทนคณบดีคณะวิทยาศาสตร์',
                'รักษาการแทนรองอธิการบดีฝ่ายบริหาร',
                'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
              ]
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(err.message.includes('Signer title lines exceed maximum limit'), 'Must reject > 3 title lines')
          return true
        }
      )
    })

    it('rejects signer title line when line width exceeds max width', async () => {
      await assert.rejects(
        async () => {
          await generateRequestLetter(
            {
              ...baseValidData,
              signerTitleLines: [
                'ประธานกรรมการบริหารและประธานเจ้าหน้าที่บริหารสูงสุดฝ่ายปฏิบัติการระดับภูมิภาคเอเชียแปซิฟิกและบริหารงานทั่วไป'
              ]
            },
            assets
          )
        },
        (err: Error) => {
          assert.ok(err.message.includes('Signer title line'), 'Must reject line too wide')
          return true
        }
      )
    })
  })
})
