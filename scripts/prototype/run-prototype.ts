import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { generateRequestLetter, type RequestLetterData, type RequestLetterAssets } from './generator'
import { PDFDocument } from 'pdf-lib'

const PROTOTYPE_DIR = path.resolve(process.cwd(), 'scripts/prototype')

export const validFixtures: Record<string, RequestLetterData> = {
  standard: {
    letterNumber: 'ว ๑๒๓/๒๕๖๙',
    issueDate: new Date('2026-10-15T00:00:00.000+07:00'),
    term: 2,
    academicYear: 2569,
    internshipHours: 450,
    internshipStartDate: new Date('2026-10-19T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-02-05T00:00:00.000+07:00'),
    recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
    companyName: 'บริษัท บูรพาเทคโนโลยี จำกัด',
    studentName: 'นายสมศักดิ์ รักดี',
    studentId: '64012345678',
    studentCount: 1,
    signerName: 'อาจารย์ ดร.ทิพวัลย์ แสนคำ',
    signerTitleLines: [
      'คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน',
      'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
    ]
  },
  long_names: {
    letterNumber: 'ว ๙๙๙/๒๕๖๙/ศธ๐๖๒๔',
    issueDate: new Date('2026-12-30T00:00:00.000+07:00'),
    term: 1,
    academicYear: 2569,
    internshipHours: 600,
    internshipStartDate: new Date('2026-11-01T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-04-30T00:00:00.000+07:00'),
    recipientName: 'ผู้อำนวยการอาวุโสฝ่ายพัฒนาทรัพยากรบุคคลและบริหารงานทั่วไป ประจำภูมิภาคตะวันออกเฉียงเหนือ',
    companyName: 'บริษัท สยามปิโตรเคมีคอลส์ แอนด์ อินดัสเตรียล ดิจิทัล โซลูชั่นส์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)',
    studentName: 'นายพงศ์ปกรณ์เกียรติ์ อัครสิริวรวัชรโภคินทร์',
    studentId: '64019999999',
    studentCount: 1,
    signerName: 'รองศาสตราจารย์ ดร.สิทธิพงษ์ ศรีสุวรรณวงศ์',
    signerTitleLines: [
      'รองคณบดีฝ่ายวิชาการและวิจัย ปฏิบัติราชการแทน',
      'คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน',
      'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
    ]
  },
  thai_vowels_tone_marks: {
    letterNumber: 'ว ๔๕๖/๒๕๖๙',
    issueDate: new Date('2026-09-21T00:00:00.000+07:00'),
    term: 2,
    academicYear: 2569,
    internshipHours: 450,
    internshipStartDate: new Date('2026-11-15T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-03-15T00:00:00.000+07:00'),
    recipientName: 'กรรมการผู้จัดการใหญ่ผู้มีอำนาจลงนามผูกพันนิติบุคคล',
    companyName: 'บริษัท นวัตกรรมเทคโนโลยีดิจิทัลเพื่อการศึกษาและการวิจัยขั้นสูง จำกัด',
    studentName: 'นางสาวกรรณิการ์ ฤทธิ์เดชเดโชชัย',
    studentId: '64015555555',
    studentCount: 1,
    signerName: 'อาจารย์ ดร.ทิพวัลย์ แสนคำ',
    signerTitleLines: [
      'คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน',
      'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
    ]
  }
}

export const rejectedFixtures: Record<string, RequestLetterData> = {
  overflow_recipient: {
    letterNumber: 'ว ๑/๒๕๖๙',
    issueDate: new Date('2026-10-01T00:00:00.000+07:00'),
    term: 1,
    academicYear: 2569,
    internshipHours: 450,
    internshipStartDate: new Date('2026-10-19T00:00:00.000+07:00'),
    internshipEndDate: new Date('2027-02-05T00:00:00.000+07:00'),
    // 3 lines recipient will overflow maximum 2 lines and collide with 'สิ่งที่ส่งมาด้วย'
    recipientName:
      'ประธานกรรมการบริหารและประธานเจ้าหน้าที่บริหารสูงสุดฝ่ายปฏิบัติการระดับภูมิภาคเอเชียแปซิฟิก และรองกรรมการผู้จัดการใหญ่ฝ่ายพัฒนาทรัพยากรบุคคลและบริหารงานทั่วไป ประจำสำนักงานใหญ่ภูมิภาค บริษัท ข้ามชาติเทคโนโลยีดิจิทัล โซลูชั่นส์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)',
    companyName: 'บริษัท ทดสอบ จำกัด',
    studentName: 'นายทดสอบ เกินขอบเขต',
    studentCount: 1,
    signerName: 'อาจารย์ ดร.ทิพวัลย์ แสนคำ',
    signerTitleLines: ['คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน']
  }
}

async function main() {
  const templateBytes = fs.readFileSync(path.join(PROTOTYPE_DIR, 'template.pdf'))
  const fontRegularBytes = fs.readFileSync(path.join(PROTOTYPE_DIR, 'fonts/THSarabunNew.ttf'))
  const signatureBytes = fs.readFileSync(path.join(PROTOTYPE_DIR, 'dummy_signature.png'))
  const assets: RequestLetterAssets = {
    templatePdfBytes: templateBytes,
    fontRegularBytes
  }

  const outDir = path.join(PROTOTYPE_DIR, 'output')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  // 1. Generate valid fixtures
  for (const [key, data] of Object.entries(validFixtures)) {
    console.log(`Generating valid fixture: ${key}...`)
    const letterData: RequestLetterData = {
      ...data,
      signatureImageBytes: signatureBytes
    }
    const pdfBytes = await generateRequestLetter(letterData, assets)
    const pdfPath = path.join(outDir, `request_letter_${key}.pdf`)
    fs.writeFileSync(pdfPath, pdfBytes)

    // Split pages and render to PNG
    const doc = await PDFDocument.load(pdfBytes)
    for (let pageIdx = 0; pageIdx < doc.getPageCount(); pageIdx++) {
      const singleDoc = await PDFDocument.create()
      const [copiedPage] = await singleDoc.copyPages(doc, [pageIdx])
      singleDoc.addPage(copiedPage)
      const singlePdfPath = path.join(outDir, `request_letter_${key}_p${pageIdx + 1}.pdf`)
      const singlePngPath = path.join(outDir, `request_letter_${key}_p${pageIdx + 1}.png`)
      fs.writeFileSync(singlePdfPath, await singleDoc.save())

      // Render with sips at 144 DPI (1191 x 1684)
      execSync(`sips -s format png -z 1684 1191 "${singlePdfPath}" --out "${singlePngPath}"`, {
        stdio: 'pipe'
      })
      console.log(`  Rendered: ${singlePngPath}`)
    }
  }

  // 2. Test rejected fixtures (verify rejection and ensure NO PDF is generated)
  for (const [key, data] of Object.entries(rejectedFixtures)) {
    console.log(`Testing rejection for fixture: ${key}...`)
    const rejectedPdfPath = path.join(outDir, `request_letter_${key}.pdf`)
    // Remove if left from previous runs
    if (fs.existsSync(rejectedPdfPath)) {
      fs.unlinkSync(rejectedPdfPath)
    }

    let didReject = false
    let rejectionMessage = ''
    try {
      await generateRequestLetter(data, assets)
    } catch (err: any) {
      didReject = true
      rejectionMessage = err.message
    }

    if (!didReject) {
      throw new Error(`Fixture ${key} should have been rejected but succeeded!`)
    }

    console.log(`  Successfully rejected as expected: ${rejectionMessage}`)
    if (fs.existsSync(rejectedPdfPath)) {
      throw new Error(`File ${rejectedPdfPath} was unexpectedly created for rejected fixture!`)
    }
  }

  // 3. Optional artifact copy: only when ARTIFACT_DIR env is explicitly provided and valid
  const artifactDirEnv = process.env.ARTIFACT_DIR
  if (artifactDirEnv) {
    const resolvedArtifactDir = path.resolve(artifactDirEnv)
    if (fs.existsSync(resolvedArtifactDir) && fs.statSync(resolvedArtifactDir).isDirectory()) {
      const standardPdf = path.join(outDir, 'request_letter_standard.pdf')
      const standardP1Png = path.join(outDir, 'request_letter_standard_p1.png')
      const standardP2Png = path.join(outDir, 'request_letter_standard_p2.png')

      fs.copyFileSync(standardPdf, path.join(resolvedArtifactDir, 'request_letter_prototype.pdf'))
      fs.copyFileSync(standardP1Png, path.join(resolvedArtifactDir, 'request_letter_prototype_page_1.png'))
      fs.copyFileSync(standardP2Png, path.join(resolvedArtifactDir, 'request_letter_prototype_page_2.png'))
      console.log(`\nOptional: Copies synchronized to ARTIFACT_DIR: ${resolvedArtifactDir}`)
    } else {
      console.warn(`\nWarning: ARTIFACT_DIR "${artifactDirEnv}" does not exist or is not a directory. Skipping external copy.`)
    }
  }

  console.log('\nAll fixtures processed successfully.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
