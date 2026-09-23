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
  issueDate: { centerX: 312, y: 625 },
  subjectY: 583,
  recipientY: 550,
  bodyY: 516,
  lineSpacing: 21,
  firstLineIndent: 42.6,
  student: {
    leftX: 120,
    columnGap: 190,
    columnWidth: 180,
    fontSize: 15,
    rowSpacing: 25
  },
  signer: {
    centerX: 415,
    signatureY: 174,
    signatureMaxWidth: 140,
    signatureMaxHeight: 35,
    nameY: 160,
    firstTitleY: 140,
    titleLineSpacing: 19,
    maxTitleLines: 3,
    maxWidth: 235
  }
} as const

function assertFits(text: string, maxWidth: number, font: any, field: string, size: number = LAYOUT.fontSize) {
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

  // Preserve the reference's Garuda, four-line address, and contact footer.
  // Clear its sample text and signature before drawing the actual letter.
  page.drawRectangle({ x: 78, y: 225, width: 470, height: 385, color: white })
  page.drawRectangle({ x: 300, y: 105, width: 248, height: 145, color: white })
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

  const body =
    'ตามหนังสือที่สาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์ '
    + 'ได้รับความอนุเคราะห์จากท่านยินดีรับนักศึกษาสาขาวิชาวิทยาการคอมพิวเตอร์ '
    + 'เข้าฝึกประสบการณ์วิชาชีพในหน่วยงานของท่านตั้งแต่วันที่ '
    + `${formatThaiDate(data.internshipStartDate)} ถึงวันที่ ${formatThaiDate(data.internshipEndDate)} `
    + 'ดังรายละเอียดที่แจ้งแล้วนั้น ในการนี้ มหาวิทยาลัยฯ ขอส่งตัวนักศึกษาเข้าฝึกประสบการณ์วิชาชีพ ดังรายชื่อต่อไปนี้'

  const bodyLines = wrapThaiText(body, LAYOUT.width, LAYOUT.firstLineIndent, font, LAYOUT.fontSize)
  if (bodyLines.length > 6) throw new Error('เนื้อหาหนังสือส่งตัวยาวเกินพื้นที่เอกสาร')

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

  y -= 12
  const studentRows = Math.max(3, Math.ceil(data.students.length / 2))
  data.students.forEach((student, index) => {
    const column = index < studentRows ? 0 : 1
    const row = column === 0 ? index : index - studentRows
    const x = LAYOUT.student.leftX + column * LAYOUT.student.columnGap
    const studentY = y - row * LAYOUT.student.rowSpacing
    const studentText = `${toThaiDigits(index + 1)}.  ${student.name.trim()}`
    assertFits(studentText, LAYOUT.student.columnWidth, font, 'ข้อมูลนักศึกษา', LAYOUT.student.fontSize)
    page.drawText(studentText, {
      x,
      y: studentY,
      size: LAYOUT.student.fontSize,
      font,
      color: black
    })
  })
  y -= studentRows * LAYOUT.student.rowSpacing

  y -= 18
  const conclusionLines = [
    'จึงเรียนมาเพื่อโปรดพิจารณา และเมื่อนักศึกษาฝึกประสบการณ์วิชาชีพครบตามกำหนดเวลา ขอ',
    'ความกรุณาแจ้งผลการฝึกประสบการณ์วิชาชีพตามแบบฟอร์มที่แนบมาพร้อมนี้ ให้มหาวิทยาลัยทราบ จักเป็น',
    'พระคุณอย่างยิ่ง'
  ]
  const conclusionBottom = y - (conclusionLines.length - 1) * LAYOUT.lineSpacing
  if (conclusionBottom < 235) throw new Error('รายชื่อนักศึกษายาวเกินพื้นที่เอกสาร')
  conclusionLines.forEach((line, index) => {
    assertFits(line, LAYOUT.width - (index === 0 ? LAYOUT.firstLineIndent : 0), font, 'เนื้อหาหนังสือส่งตัว')
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
    y: 215,
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
