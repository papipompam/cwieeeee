import assert from 'node:assert'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { toThaiDigits, formatThaiDate, generateRequestLetter, type RequestLetterData } from './generator'

const PROTOTYPE_DIR = path.resolve(process.cwd(), 'scripts/prototype')

function computeFileSha256(filePath: string): string {
  const fileBytes = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileBytes).digest('hex')
}

async function runCheck() {
  console.log('Running prototype verification check...')

  // 1. Check SHA-256 integrity of original documents in docs/doc-template/
  const expectedDocxSha = 'a46ee23ad0be4fe54c5720c2a490732514d3cffb94a833157d5d4f8ac47c8926'
  const expectedPdfSha = '5135a790db4a6655cd139a0553febefe3e1308b7ff9c34073552b9d405cfd38f'

  const actualDocxSha = computeFileSha256(path.resolve('docs/doc-template/เอกสารขอความอนุเคราะห์.docx'))
  const actualPdfSha = computeFileSha256(path.resolve('docs/doc-template/รูปแบบเอกสารขอความอนุเคราะห์.pdf'))

  assert.strictEqual(
    actualDocxSha,
    expectedDocxSha,
    `DOCX template SHA-256 must match plan: expected ${expectedDocxSha}, got ${actualDocxSha}`
  )
  assert.strictEqual(
    actualPdfSha,
    expectedPdfSha,
    `PDF template SHA-256 must match plan: expected ${expectedPdfSha}, got ${actualPdfSha}`
  )
  console.log('  [PASS] Original document SHA-256 hashes match plan byte-for-byte')

  // 2. Check Thai digits conversion
  assert.strictEqual(toThaiDigits('ว 123/2569'), 'ว ๑๒๓/๒๕๖๙', 'Arabic digits must convert to Thai digits')
  assert.strictEqual(toThaiDigits(450), '๔๕๐', 'Numbers must convert to Thai digits')
  console.log('  [PASS] Thai digits conversion')

  // 3. Check Buddhist calendar date formatting in Asia/Bangkok
  const testDate = new Date('2026-10-15T00:00:00.000+07:00')
  const formattedDate = formatThaiDate(testDate)
  assert.ok(formattedDate.includes('ตุลาคม'), 'Month must be in Thai')
  assert.ok(formattedDate.includes('๒๕๖๙'), 'Year must be in Buddhist era')
  console.log('  [PASS] Buddhist calendar date formatting in Asia/Bangkok')

  // 4. Check template.pdf
  const templatePath = path.join(PROTOTYPE_DIR, 'template.pdf')
  assert.ok(fs.existsSync(templatePath), 'template.pdf must exist')
  const templateBytes = fs.readFileSync(templatePath)
  assert.strictEqual(Buffer.from(templateBytes.subarray(0, 5)).toString('ascii'), '%PDF-', 'Must have PDF magic bytes')

  const templateDoc = await PDFDocument.load(templateBytes)
  assert.strictEqual(templateDoc.getPageCount(), 2, 'Template must have exactly 2 pages')
  for (let i = 0; i < 2; i++) {
    const page = templateDoc.getPage(i)
    const { width, height } = page.getSize()
    assert.ok(Math.abs(width - 595.32) < 0.5, `Page ${i + 1} width must be A4 (~595.32 pt)`)
    assert.ok(Math.abs(height - 841.92) < 0.5, `Page ${i + 1} height must be A4 (~841.92 pt)`)
  }
  console.log('  [PASS] template.pdf structure and A4 dimensions')

  // 5. Check font files
  assert.ok(fs.existsSync(path.join(PROTOTYPE_DIR, 'fonts/THSarabunNew.ttf')), 'THSarabunNew.ttf must exist')
  const fontRegularBytes = fs.readFileSync(path.join(PROTOTYPE_DIR, 'fonts/THSarabunNew.ttf'))
  const sigBytes = fs.readFileSync(path.join(PROTOTYPE_DIR, 'dummy_signature.png'))

  const baseValidData: RequestLetterData = {
    letterNumber: 'ว ๑/๒๕๖๙',
    issueDate: new Date('2026-10-01T00:00:00.000+07:00'),
    term: 2,
    academicYear: 2569,
    internshipHours: 450,
    internshipStartDate: new Date('2026-10-19T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-02-05T00:00:00.000+07:00'),
    recipientName: 'ผู้จัดการ',
    companyName: 'บริษัท ทดสอบ จำกัด',
    studentName: 'นายทดสอบ ระบบ',
    studentCount: 1,
    signerName: 'ผู้ลงนาม ทดสอบ',
    signerTitleLines: ['ตำแหน่งทดสอบ'],
    signatureImageBytes: sigBytes
  }

  // 6. Test generation with valid sample
  const outBytes = await generateRequestLetter(baseValidData, templateBytes, fontRegularBytes)
  assert.strictEqual(Buffer.from(outBytes.subarray(0, 5)).toString('ascii'), '%PDF-', 'Output must have PDF magic')
  const outDoc = await PDFDocument.load(outBytes)
  assert.strictEqual(outDoc.getPageCount(), 2, 'Generated PDF must have exactly 2 pages')
  console.log('  [PASS] Valid letter generation')

  // 7. Test oversized field rejections (boundary testing)
  // 7.1 Oversized letterNumber (> 120 pt)
  await assert.rejects(
    async () => {
      await generateRequestLetter(
        {
          ...baseValidData,
          letterNumber: 'ว ๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙/๒๕๖๙/ศธ๐๖๒๔/พิเศษมาก'
        },
        templateBytes,
        fontRegularBytes
      )
    },
    (err: Error) => {
      assert.ok(err.message.includes('Letter number'), 'Must name field in error message')
      assert.ok(err.message.includes('collide with the center Garuda'), 'Must state reason for rejection')
      return true
    }
  )
  console.log('  [PASS] Rejection of oversized letterNumber')

  // 7.2 Oversized recipientName (> 2 lines)
  await assert.rejects(
    async () => {
      await generateRequestLetter(
        {
          ...baseValidData,
          recipientName:
            'ประธานกรรมการบริหารและประธานเจ้าหน้าที่บริหารสูงสุดฝ่ายปฏิบัติการระดับภูมิภาคเอเชียแปซิฟิก และรองกรรมการผู้จัดการใหญ่ฝ่ายพัฒนาทรัพยากรบุคคลและบริหารงานทั่วไป ประจำสำนักงานใหญ่ภูมิภาค บริษัท ข้ามชาติเทคโนโลยีดิจิทัล โซลูชั่นส์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)'
        },
        templateBytes,
        fontRegularBytes
      )
    },
    (err: Error) => {
      assert.ok(err.message.includes('Recipient name is too long'), 'Must name field in error message')
      assert.ok(err.message.includes('collide with \'สิ่งที่ส่งมาด้วย\''), 'Must state collision reason')
      return true
    }
  )
  console.log('  [PASS] Rejection of oversized recipientName')

  // 7.3 Oversized body paragraph / companyName (> 8 lines)
  await assert.rejects(
    async () => {
      await generateRequestLetter(
        {
          ...baseValidData,
          companyName:
            'บริษัท พัฒนาเทคโนโลยีดิจิทัล คลาวด์คอมพิวติ้ง ซอฟต์แวร์วิศวกรรม ปัญญาประดิษฐ์ หุ่นยนต์อัตโนมัติ นวัตกรรมการสื่อสารโทรคมนาคมความเร็วสูง และระบบบริหารจัดการข้อมูลสารสนเทศขนาดใหญ่เพื่ออุตสาหกรรมยานยนต์แห่งอนาคตและพลังงานหมุนเวียนแบบยั่งยืนครบวงจร จำกัด (มหาชน) สาขาประจำเขตพัฒนาพิเศษภาคตะวันออก ประเทศไทย'
        },
        templateBytes,
        fontRegularBytes
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
  console.log('  [PASS] Rejection of oversized body paragraph')

  // 7.4 Oversized studentName (exceeds single line width)
  await assert.rejects(
    async () => {
      await generateRequestLetter(
        {
          ...baseValidData,
          studentName:
            'นายสมเด็จพระมหาบุรุษรามาธิบดีศรีสุริยพงศ์พิริยะสถาพรชัยโยดมสกลรัตนโกสินทร์ มหาเจษฎาบดินทร์สิริวิลาสโภคินทร์วรวัชรเกียรติกุลวัฒนศักดาภิเษก',
          studentId: '๖๔๐๑๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙๙'
        },
        templateBytes,
        fontRegularBytes
      )
    },
    (err: Error) => {
      assert.ok(err.message.includes('Student details are too long'), 'Must name field in error message')
      return true
    }
  )
  console.log('  [PASS] Rejection of oversized student details')

  // 7.5 Oversized signerTitleLines (> 3 lines)
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
        templateBytes,
        fontRegularBytes
      )
    },
    (err: Error) => {
      assert.ok(err.message.includes('Signer title lines exceed maximum limit'), 'Must reject > 3 title lines')
      return true
    }
  )
  console.log('  [PASS] Rejection of oversized signerTitleLines')

  // 8. Check rendered output files and dimensions
  const requiredOutputs = [
    'output/request_letter_standard.pdf',
    'output/request_letter_standard_p1.png',
    'output/request_letter_standard_p2.png',
    'output/request_letter_long_names.pdf',
    'output/request_letter_long_names_p1.png',
    'output/request_letter_long_names_p2.png',
    'output/request_letter_thai_vowels_tone_marks.pdf',
    'output/request_letter_thai_vowels_tone_marks_p1.png',
    'output/request_letter_thai_vowels_tone_marks_p2.png'
  ]

  for (const rel of requiredOutputs) {
    const p = path.join(PROTOTYPE_DIR, rel)
    assert.ok(fs.existsSync(p), `Required output file ${rel} must exist`)
    assert.ok(fs.statSync(p).size > 0, `Output file ${rel} must not be empty`)

    // Verify PDF page count & dimensions
    if (rel.endsWith('.pdf') && !rel.includes('_p1.') && !rel.includes('_p2.')) {
      const doc = await PDFDocument.load(fs.readFileSync(p))
      assert.strictEqual(doc.getPageCount(), 2, `${rel} must have exactly 2 pages`)
      for (let i = 0; i < 2; i++) {
        const sz = doc.getPage(i).getSize()
        assert.ok(Math.abs(sz.width - 595.32) < 0.5, `${rel} page ${i + 1} width must be A4`)
        assert.ok(Math.abs(sz.height - 841.92) < 0.5, `${rel} page ${i + 1} height must be A4`)
      }
    }
  }
  console.log('  [PASS] Output PDFs (2-page A4) and PNG renders verified')

  // 9. Verify that rejected fixtures have NO generated PDF
  const disallowedPdf = path.join(PROTOTYPE_DIR, 'output/request_letter_overflow_recipient.pdf')
  assert.ok(!fs.existsSync(disallowedPdf), 'Rejected fixture must NOT produce an output PDF')
  console.log('  [PASS] Rejected fixture produces no output PDF')

  console.log('\nAll prototype verification checks passed successfully!')
}

runCheck().catch(err => {
  console.error('Check failed:', err)
  process.exit(1)
})
