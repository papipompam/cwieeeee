import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export interface RequestLetterData {
  /**
   * Temporary suffix for letter number until final format is confirmed by user.
   * Template draws prefix "ที่ อว ๐๖๒๔.๖/" followed by this value.
   */
  letterNumber: string
  issueDate: Date
  term: number
  academicYear: number
  internshipHours: number
  internshipStartDate: Date
  internshipEndDate: Date
  recipientName: string
  companyName: string
  studentName: string
  studentNames?: string[]
  studentCount: number
  signerName: string
  signerTitleLines: string[]
  signatureImageBytes?: Uint8Array
}

export interface RequestLetterAssets {
  templatePdfBytes: Uint8Array
  fontRegularBytes: Uint8Array
}

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
export function toThaiDigits(val: number | string): string {
  return String(val).replace(/[0-9]/g, d => THAI_DIGITS[Number(d)]!)
}

export function formatThaiDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist-nu-thai', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok'
  })
  return formatter.format(date)
}

const segmenter = new Intl.Segmenter('th', { granularity: 'word' })

export function wrapThaiText(
  text: string,
  maxWidth: number,
  firstLineIndent = 0,
  font: any,
  fontSize = 15
): string[] {
  const words = Array.from(segmenter.segment(text)).map(s => s.segment)
  const lines: string[] = []
  let currentLine = ''
  let isFirstLine = true

  for (const word of words) {
    const testLine = currentLine + word
    const currentMaxWidth = isFirstLine ? maxWidth - firstLineIndent : maxWidth
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > currentMaxWidth && currentLine.length > 0) {
      lines.push(currentLine.trimEnd())
      currentLine = word
      isFirstLine = false
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine.trimEnd())
  return lines
}

// Layout coordinate constants (all in pt, A4 = 595.32 x 841.92 pt)
export const LAYOUT = {
  fontSize: 15,
  leftMargin: 85.10,
  contentWidth: 453.70, // right margin at x = 538.80
  letterNumber: {
    prefix: 'ที่ อว ๐๖๒๔.๖/',
    prefixX: 85.10,
    y: 730.90,
    suffixGap: 5.0,
    garudaLeftX: 268.35,
    minimumGarudaGap: 3.0
  },
  issueDate: {
    centerX: 312.0, // aligned with center of Garuda
    y: 640.0
  },
  recipient: {
    x: 118.0, // follows static 'เรียน  ' at x = 85.10
    y: 575.0,
    maxLines: 2, // line 3 would collide with 'สิ่งที่ส่งมาด้วย' at y = 543.07
    lineSpacing: 18.0
  },
  paragraph1: {
    firstLineIndent: 70.92, // x = 156.02
    startY: 511.15,
    lineSpacing: 20.0,
    maxLines: 8 // lines 1-8 end at y = 371.15; student block at y = 353.15, keeping safe gap before 'อนึ่ง...' at y = 295.37
  },
  student: {
    firstLineIndent: 70.92,
    gapAfterParagraph: 15.0,
    minY: 320.0, // safe clearance of at least 24.6 pt before 'อนึ่ง...' at y = 295.37
    maxWidth: 382.78 // contentWidth (453.7) - indent (70.92)
  },
  signer: {
    centerX: 415.0,
    signatureY: 172.0,
    signatureMaxWidth: 140.0,
    signatureMaxHeight: 35.0,
    nameY: 164.06,
    firstTitleY: 144.02,
    titleLineSpacing: 19.94,
    maxTitleLines: 3, // lines 1-3 end at y = 104.14; line 4 would collide with page bottom margin / footer
    titleMaxWidth: 230.0 // centered at 415.0, stays within x in [300, 530]
  },
  page2: {
    firstLineIndent: 42.60, // x = 127.70
    startY: 527.23,
    lineSpacing: 20.0,
    maxLines: 3 // line 4 would collide with '๑. คำตอบรับ...' at y = 467.23
  }
} as const

export async function generateRequestLetter(
  data: RequestLetterData,
  assets: RequestLetterAssets
): Promise<Uint8Array> {
  const { templatePdfBytes, fontRegularBytes } = assets

  if (!templatePdfBytes || !fontRegularBytes) {
    throw new Error('Both templatePdfBytes and fontRegularBytes are required to generate request letter')
  }

  const doc = await PDFDocument.load(templatePdfBytes)
  doc.registerFontkit(fontkit)

  const regularFont = await doc.embedFont(fontRegularBytes)

  const page1 = doc.getPage(0)
  const page2 = doc.getPage(1)

  const fontSize = LAYOUT.fontSize
  const color = rgb(0, 0, 0)
  const leftMargin = LAYOUT.leftMargin
  const contentWidth = LAYOUT.contentWidth

  // 1. Page 1: Letter number
  const formattedLetterNumber = toThaiDigits(data.letterNumber)
  const prefixWidth = regularFont.widthOfTextAtSize(LAYOUT.letterNumber.prefix, fontSize)
  const letterNumberX = LAYOUT.letterNumber.prefixX + prefixWidth + LAYOUT.letterNumber.suffixGap
  const maxLetterNumberWidth = LAYOUT.letterNumber.garudaLeftX - letterNumberX - LAYOUT.letterNumber.minimumGarudaGap
  const letterNumberWidth = regularFont.widthOfTextAtSize(formattedLetterNumber, fontSize)
  if (letterNumberWidth > maxLetterNumberWidth) {
    throw new Error(
      `Letter number "${data.letterNumber}" is too long (${letterNumberWidth.toFixed(1)} pt, maximum ${maxLetterNumberWidth.toFixed(1)} pt). It would collide with the center Garuda emblem.`
    )
  }
  // Redraw the prefix to avoid the tight slash glyph baked into the Word-exported master.
  page1.drawRectangle({ x: 80, y: 725, width: 185, height: 22, color: rgb(1, 1, 1) })
  page1.drawText(LAYOUT.letterNumber.prefix, {
    x: LAYOUT.letterNumber.prefixX,
    y: LAYOUT.letterNumber.y,
    size: fontSize,
    font: regularFont,
    color
  })
  page1.drawText(formattedLetterNumber, {
    x: letterNumberX,
    y: LAYOUT.letterNumber.y,
    size: fontSize,
    font: regularFont,
    color
  })

  // 2. Page 1: Issue date (centered under Garuda emblem)
  const formattedIssueDate = formatThaiDate(data.issueDate)
  const dateWidth = regularFont.widthOfTextAtSize(formattedIssueDate, fontSize)
  page1.drawText(formattedIssueDate, {
    x: LAYOUT.issueDate.centerX - dateWidth / 2,
    y: LAYOUT.issueDate.y,
    size: fontSize,
    font: regularFont,
    color
  })

  // 3. Page 1: Recipient
  const fullRecipient = data.recipientName.trim()
  const recipientIndent = LAYOUT.recipient.x - leftMargin // 32.9 pt
  const recipientLines = wrapThaiText(fullRecipient, contentWidth, recipientIndent, regularFont, fontSize)
  if (recipientLines.length > LAYOUT.recipient.maxLines) {
    throw new Error(
      `Recipient name is too long (${recipientLines.length} lines, maximum ${LAYOUT.recipient.maxLines} lines allowed). It would collide with 'สิ่งที่ส่งมาด้วย' at y = 543.07 pt. Please shorten recipientName.`
    )
  }
  for (let i = 0; i < recipientLines.length; i++) {
    page1.drawText(recipientLines[i] || '', {
      x: LAYOUT.recipient.x,
      y: LAYOUT.recipient.y - i * LAYOUT.recipient.lineSpacing,
      size: fontSize,
      font: regularFont,
      color
    })
  }

  // 4. Page 1: Paragraph 1 (Body)
  const p1Text =
    `ด้วยคณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์ ได้เปิดสอนหลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ โดยในภาคการศึกษาที่ ${toThaiDigits(data.term)} ปีการศึกษา ${toThaiDigits(data.academicYear)} มีนักศึกษาภาคปกติจะออกฝึกประสบการณ์วิชาชีพเป็นระยะเวลา ${toThaiDigits(data.internshipHours)} ชั่วโมง ระหว่างวันที่ ${formatThaiDate(data.internshipStartDate)} ถึงวันที่ ${formatThaiDate(data.internshipEndDate)} ซึ่งเป็นไปตามแผนการเรียนของนักศึกษา ในการนี้สาขาวิชาวิทยาการคอมพิวเตอร์พิจารณาเห็นว่า ${data.companyName.trim()} เป็นหน่วยงานที่เหมาะสมที่จะเป็นสถานที่ฝึกประสบการณ์ของนักศึกษาดังกล่าวได้เป็นอย่างดี จึงใคร่ขอความอนุเคราะห์ให้นักศึกษาเข้ารับการฝึกประสบการณ์วิชาชีพ จำนวน ${toThaiDigits(data.studentCount)} คน คือ`

  const p1Lines = wrapThaiText(p1Text, contentWidth, LAYOUT.paragraph1.firstLineIndent, regularFont, fontSize)
  if (p1Lines.length > LAYOUT.paragraph1.maxLines) {
    throw new Error(
      `Body paragraph is too long (${p1Lines.length} lines, maximum ${LAYOUT.paragraph1.maxLines} lines allowed). It would overflow toward the concluding paragraph. Please shorten companyName.`
    )
  }

  let currentY = LAYOUT.paragraph1.startY
  for (let i = 0; i < p1Lines.length; i++) {
    const x = i === 0 ? leftMargin + LAYOUT.paragraph1.firstLineIndent : leftMargin
    page1.drawText(p1Lines[i] || '', {
      x,
      y: currentY,
      size: fontSize,
      font: regularFont,
      color
    })
    currentY -= LAYOUT.paragraph1.lineSpacing
  }

  // 5. Page 1: Student line
  const studentY = currentY - LAYOUT.student.gapAfterParagraph
  if (studentY < LAYOUT.student.minY) {
    throw new Error(
      `Student line position (y = ${studentY.toFixed(1)} pt) falls below minimum safe bound (${LAYOUT.student.minY} pt). It would collide with the concluding paragraph at y = 295.37 pt. Please shorten body text or companyName.`
    )
  }

  const studentNames = (data.studentNames?.length ? data.studentNames : [data.studentName])
    .map(name => name.trim())
    .filter(Boolean)
  if (!studentNames.length || studentNames.length > 6) {
    throw new Error('หนังสือขอความอนุเคราะห์รองรับรายชื่อนักศึกษาสูงสุด 6 คนต่อฉบับ')
  }

  const rows = Math.min(3, studentNames.length)
  const studentColumnWidth = 205
  for (let index = 0; index < studentNames.length; index++) {
    const column = index < rows ? 0 : 1
    const row = column === 0 ? index : index - rows
    const studentLineText = `${toThaiDigits(index + 1)}.  ${studentNames[index]}`
    const studentLineWidth = regularFont.widthOfTextAtSize(studentLineText, fontSize)
    if (studentLineWidth > studentColumnWidth) {
      throw new Error('ชื่อนักศึกษายาวเกินพื้นที่เอกสาร กรุณาตรวจสอบข้อมูล')
    }
    page1.drawText(studentLineText, {
      x: leftMargin + LAYOUT.student.firstLineIndent + column * 225,
      y: studentY - row * LAYOUT.paragraph1.lineSpacing,
      size: fontSize,
      font: regularFont,
      color
    })
  }

  // 6. Page 1: Signature image & Signer block
  const signerCenterX = LAYOUT.signer.centerX
  if (data.signatureImageBytes) {
    const sigImage = await doc.embedPng(data.signatureImageBytes)
    const originalDims = sigImage.scale(1)
    const scale = Math.min(
      LAYOUT.signer.signatureMaxWidth / originalDims.width,
      LAYOUT.signer.signatureMaxHeight / originalDims.height,
      1
    )
    const targetWidth = originalDims.width * scale
    const targetHeight = originalDims.height * scale

    page1.drawImage(sigImage, {
      x: signerCenterX - targetWidth / 2,
      y: LAYOUT.signer.signatureY,
      width: targetWidth,
      height: targetHeight
    })
  }

  // Signer Name
  const signerNameText = `(${data.signerName.trim()})`
  const signerNameWidth = regularFont.widthOfTextAtSize(signerNameText, fontSize)
  if (signerNameWidth > LAYOUT.signer.titleMaxWidth) {
    throw new Error(
      `Signer name "${data.signerName}" is too long (${signerNameWidth.toFixed(1)} pt, maximum ${LAYOUT.signer.titleMaxWidth} pt). Please shorten signerName.`
    )
  }
  page1.drawText(signerNameText, {
    x: signerCenterX - signerNameWidth / 2,
    y: LAYOUT.signer.nameY,
    size: fontSize,
    font: regularFont,
    color
  })

  // Signer Titles
  if (data.signerTitleLines.length > LAYOUT.signer.maxTitleLines) {
    throw new Error(
      `Signer title lines exceed maximum limit (${data.signerTitleLines.length} lines provided, maximum ${LAYOUT.signer.maxTitleLines} lines allowed). Please reduce to at most ${LAYOUT.signer.maxTitleLines} lines.`
    )
  }

  let titleY = LAYOUT.signer.firstTitleY
  for (const rawTitle of data.signerTitleLines) {
    const titleLine = rawTitle.trim()
    const titleWidth = regularFont.widthOfTextAtSize(titleLine, fontSize)
    if (titleWidth > LAYOUT.signer.titleMaxWidth) {
      throw new Error(
        `Signer title line "${titleLine}" is too wide (${titleWidth.toFixed(1)} pt, maximum ${LAYOUT.signer.titleMaxWidth} pt). Please shorten the title line.`
      )
    }
    page1.drawText(titleLine, {
      x: signerCenterX - titleWidth / 2,
      y: titleY,
      size: fontSize,
      font: regularFont,
      color
    })
    titleY -= LAYOUT.signer.titleLineSpacing
  }

  // 7. Page 2: Confirmation paragraph (only startDate and endDate dynamic)
  const p2Text =
    `ตามที่มหาวิทยาลัยราชภัฏบุรีรัมย์ ได้มีหนังสือขอความอนุเคราะห์ในการส่งนักศึกษาสาขาวิชาวิทยาการคอมพิวเตอร์ ฝึกประสบการณ์วิชาชีพกับหน่วยงานของเราระหว่าง วันที่ ${formatThaiDate(data.internshipStartDate)} ถึงวันที่ ${formatThaiDate(data.internshipEndDate)} นั้น หน่วยงานได้พิจารณาแล้ว ขอแจ้งข้อมูลตอบรับ ดังนี้`

  const p2Lines = wrapThaiText(p2Text, contentWidth, LAYOUT.page2.firstLineIndent, regularFont, fontSize)
  if (p2Lines.length > LAYOUT.page2.maxLines) {
    throw new Error(
      `Page 2 confirmation paragraph is too long (${p2Lines.length} lines, maximum ${LAYOUT.page2.maxLines} lines allowed). It would collide with '๑. คำตอบรับ...' at y = 467.23 pt.`
    )
  }

  let p2Y = LAYOUT.page2.startY
  for (let i = 0; i < p2Lines.length; i++) {
    const x = i === 0 ? leftMargin + LAYOUT.page2.firstLineIndent : leftMargin
    page2.drawText(p2Lines[i] || '', {
      x,
      y: p2Y,
      size: fontSize,
      font: regularFont,
      color
    })
    p2Y -= LAYOUT.page2.lineSpacing
  }

  return await doc.save()
}
