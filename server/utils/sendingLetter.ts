import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { formatThaiDate, toThaiDigits, wrapThaiText } from './requestLetter'

export interface SendingLetterStudent {
  name: string
  studentId?: string
}

export interface SendingLetterData {
  letterNumber: string
  issueDate: Date
  referenceLetterNumber: string
  referenceIssueDate: Date
  internshipHours: number
  internshipStartDate: Date
  internshipEndDate: Date
  recipientName: string
  students: SendingLetterStudent[]
  signerName: string
  signerTitleLines: string[]
  signatureImageBytes?: Uint8Array
}

export interface SendingLetterAssets {
  templatePdfBytes: Uint8Array
  fontRegularBytes: Uint8Array
}

const LAYOUT = {
  fontSize: 15,
  left: 85.1,
  width: 453.7,
  letterNumber: { x: 85.1, y: 716, prefix: 'ที่ อว ๐๖๒๔.๖/' },
  issueDate: { centerX: 312, y: 628 },
  subjectY: 575,
  recipientY: 542,
  bodyY: 500,
  lineSpacing: 20,
  firstLineIndent: 70.92,
  signer: {
    centerX: 415,
    signatureY: 145,
    signatureMaxWidth: 140,
    signatureMaxHeight: 35,
    nameY: 137,
    firstTitleY: 117,
    titleLineSpacing: 19,
    maxTitleLines: 3,
    maxWidth: 235
  }
} as const

function assertFits(text: string, maxWidth: number, font: any, field: string, size = LAYOUT.fontSize) {
  const width = font.widthOfTextAtSize(text, size)
  if (width > maxWidth) {
    throw new Error(`${field} ยาวเกินพื้นที่เอกสาร กรุณาตรวจสอบข้อมูล`)
  }
}

export async function generateSendingLetter(
  data: SendingLetterData,
  assets: SendingLetterAssets
): Promise<Uint8Array> {
  if (!assets.templatePdfBytes || !assets.fontRegularBytes) {
    throw new Error('ไม่พบไฟล์ต้นแบบหรือแบบอักษรสำหรับหนังสือส่งตัว')
  }
  if (!data.students.length) throw new Error('หนังสือส่งตัวต้องมีนักศึกษาอย่างน้อยหนึ่งคน')
  if (data.students.length > 8) throw new Error('หนังสือส่งตัวรองรับนักศึกษาสูงสุด 8 คนต่อฉบับ')

  const doc = await PDFDocument.load(assets.templatePdfBytes)
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(assets.fontRegularBytes)
  const page = doc.getPage(0)
  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  // Keep the official Garuda/header/contact block from the approved template,
  // and replace the variable body with canonical DOCX wording.
  page.drawRectangle({ x: 78, y: 145, width: 470, height: 520, color: white })
  page.drawRectangle({ x: 300, y: 70, width: 248, height: 595, color: white })
  page.drawRectangle({ x: 78, y: 705, width: 195, height: 28, color: white })

  const numberText = `${LAYOUT.letterNumber.prefix}${toThaiDigits(data.letterNumber.trim())}`
  assertFits(numberText, 180, font, 'เลขที่หนังสือ')
  page.drawText(numberText, {
    x: LAYOUT.letterNumber.x,
    y: LAYOUT.letterNumber.y,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  const issueDateText = formatThaiDate(data.issueDate)
  const issueDateWidth = font.widthOfTextAtSize(issueDateText, LAYOUT.fontSize)
  page.drawText(issueDateText, {
    x: LAYOUT.issueDate.centerX - issueDateWidth / 2,
    y: LAYOUT.issueDate.y,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  page.drawText('เรื่อง  ขอส่งนักศึกษาฝึกประสบการณ์วิชาชีพ', {
    x: LAYOUT.left,
    y: LAYOUT.subjectY,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  const recipient = data.recipientName.trim()
  assertFits(`เรียน  ${recipient}`, LAYOUT.width, font, 'ชื่อผู้รับหนังสือ')
  page.drawText(`เรียน  ${recipient}`, {
    x: LAYOUT.left,
    y: LAYOUT.recipientY,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  const referenceNumber = `${LAYOUT.letterNumber.prefix}${toThaiDigits(data.referenceLetterNumber.trim())}`
  const body =
    `ตามหนังสือคณะวิทยาศาสตร์ ${referenceNumber} ลงวันที่ ${formatThaiDate(data.referenceIssueDate)} `
    + `ท่านได้ให้ความอนุเคราะห์รับนักศึกษาสาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ `
    + `มหาวิทยาลัยราชภัฏบุรีรัมย์ ฝึกประสบการณ์วิชาชีพอย่างน้อย ${toThaiDigits(data.internshipHours)} ชั่วโมง `
    + `เพื่อเสริมสร้างความรู้ ทักษะ และประสบการณ์ในการปฏิบัติงานจริง ระหว่างวันที่ `
    + `${formatThaiDate(data.internshipStartDate)} ถึงวันที่ ${formatThaiDate(data.internshipEndDate)} นั้น `
    + 'มหาวิทยาลัยราชภัฏบุรีรัมย์ขอส่งนักศึกษามารายงานตัวเข้ารับการฝึกประสบการณ์วิชาชีพ ดังรายชื่อต่อไปนี้'

  const bodyLines = wrapThaiText(body, LAYOUT.width, LAYOUT.firstLineIndent, font, LAYOUT.fontSize)
  if (bodyLines.length > 8) throw new Error('เนื้อหาหนังสือส่งตัวยาวเกินพื้นที่เอกสาร')

  let y = LAYOUT.bodyY
  bodyLines.forEach((line, index) => {
    page.drawText(line, {
      x: index === 0 ? LAYOUT.left + LAYOUT.firstLineIndent : LAYOUT.left,
      y,
      size: LAYOUT.fontSize,
      font,
      color: black
    })
    y -= LAYOUT.lineSpacing
  })

  y -= 4
  data.students.forEach((student, index) => {
    const studentText = student.studentId
      ? `${toThaiDigits(index + 1)}.  ${student.name.trim()}    รหัสนักศึกษา  ${toThaiDigits(student.studentId.trim())}`
      : `${toThaiDigits(index + 1)}.  ${student.name.trim()}`
    assertFits(studentText, LAYOUT.width - LAYOUT.firstLineIndent, font, 'ข้อมูลนักศึกษา')
    page.drawText(studentText, {
      x: LAYOUT.left + LAYOUT.firstLineIndent,
      y,
      size: LAYOUT.fontSize,
      font,
      color: black
    })
    y -= LAYOUT.lineSpacing
  })

  y -= 12
  const conclusion =
    'จึงเรียนมาเพื่อโปรดพิจารณา และเมื่อนักศึกษาฝึกประสบการณ์วิชาชีพครบตามกำหนดเวลา '
    + 'ขอความกรุณาแจ้งผลการฝึกประสบการณ์วิชาชีพตามแบบฟอร์มที่แนบมาพร้อมนี้ '
    + 'ให้มหาวิทยาลัยทราบ จักเป็นพระคุณอย่างยิ่ง'
  const conclusionLines = wrapThaiText(conclusion, LAYOUT.width, LAYOUT.firstLineIndent, font, LAYOUT.fontSize)
  const conclusionBottom = y - (conclusionLines.length - 1) * LAYOUT.lineSpacing
  if (conclusionBottom < 225) throw new Error('รายชื่อนักศึกษายาวเกินพื้นที่เอกสาร')
  conclusionLines.forEach((line, index) => {
    page.drawText(line, {
      x: index === 0 ? LAYOUT.left + LAYOUT.firstLineIndent : LAYOUT.left,
      y: y - index * LAYOUT.lineSpacing,
      size: LAYOUT.fontSize,
      font,
      color: black
    })
  })

  page.drawText('ขอแสดงความนับถือ', {
    x: LAYOUT.signer.centerX - font.widthOfTextAtSize('ขอแสดงความนับถือ', LAYOUT.fontSize) / 2,
    y: 190,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  if (data.signatureImageBytes) {
    const image = await doc.embedPng(data.signatureImageBytes)
    const dimensions = image.scale(1)
    const scale = Math.min(
      LAYOUT.signer.signatureMaxWidth / dimensions.width,
      LAYOUT.signer.signatureMaxHeight / dimensions.height,
      1
    )
    const width = dimensions.width * scale
    const height = dimensions.height * scale
    page.drawImage(image, {
      x: LAYOUT.signer.centerX - width / 2,
      y: LAYOUT.signer.signatureY,
      width,
      height
    })
  }

  const signerName = `(${data.signerName.trim()})`
  assertFits(signerName, LAYOUT.signer.maxWidth, font, 'ชื่อผู้ลงนาม')
  page.drawText(signerName, {
    x: LAYOUT.signer.centerX - font.widthOfTextAtSize(signerName, LAYOUT.fontSize) / 2,
    y: LAYOUT.signer.nameY,
    size: LAYOUT.fontSize,
    font,
    color: black
  })

  if (data.signerTitleLines.length > LAYOUT.signer.maxTitleLines) {
    throw new Error('ตำแหน่งผู้ลงนามเกิน 3 บรรทัด')
  }
  data.signerTitleLines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    assertFits(line, LAYOUT.signer.maxWidth, font, 'ตำแหน่งผู้ลงนาม')
    page.drawText(line, {
      x: LAYOUT.signer.centerX - font.widthOfTextAtSize(line, LAYOUT.fontSize) / 2,
      y: LAYOUT.signer.firstTitleY - index * LAYOUT.signer.titleLineSpacing,
      size: LAYOUT.fontSize,
      font,
      color: black
    })
  })

  return await doc.save()
}
