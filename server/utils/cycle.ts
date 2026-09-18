export const parseStrictDate = (value: unknown, label: string): Date => {
  if (!value || typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `กรุณาระบุ${label}` })
  }
  const str = value.trim()
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง` })
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง` })
  }

  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    throw createError({ statusCode: 400, message: `รูปแบบ${label}ไม่ถูกต้อง (วันที่ไม่มีอยู่จริง)` })
  }

  return d
}

export const validateCycleDatesOrder = (appStart: Date, appEnd: Date, internStart: Date, internEnd: Date) => {
  if (appStart > appEnd) {
    throw createError({ statusCode: 400, message: 'วันเปิดรับคำร้องต้องไม่เกินวันปิดรับคำร้อง' })
  }
  if (appEnd > internStart) {
    throw createError({ statusCode: 400, message: 'วันปิดรับคำร้องต้องไม่เกินวันเริ่มฝึกงาน' })
  }
  if (internStart > internEnd) {
    throw createError({ statusCode: 400, message: 'วันเริ่มฝึกงานต้องไม่เกินวันสิ้นสุดฝึกงาน' })
  }
}

export const validateCycleTerm = (term: unknown): number => {
  const t = Number(term)
  if (!t || !Number.isInteger(t) || t < 1 || t > 3) {
    throw createError({ statusCode: 400, message: 'ภาคเรียนต้องเป็นตัวเลข 1, 2 หรือ 3' })
  }
  return t
}

export const validatePositiveYear = (year: unknown, label: string): number => {
  const y = Number(year)
  if (!y || !Number.isInteger(y) || y <= 0) {
    throw createError({ statusCode: 400, message: `${label}ต้องเป็นจำนวนเต็มบวก (พ.ศ.)` })
  }
  return y
}
