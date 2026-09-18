import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

const headers = {
  studentId: ['studentid', 'รหัสนักศึกษา', 'รหัส'],
  prefix: ['prefix', 'คำนำหน้า'],
  firstName: ['firstname', 'ชื่อ'],
  lastName: ['lastname', 'นามสกุล'],
  cohortYear: ['cohortyear', 'รุ่น', 'รุ่นนักศึกษา'],
  classGroup: ['classgroup', 'หมู่', 'หมู่เรียน'],
  isActive: ['isactive', 'สถานะ', 'สถานะใช้งาน']
}

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, '').trim().toLowerCase().replaceAll(' ', '')

const rowValue = (row: Record<string, unknown>, names: string[]) => {
  const entry = Object.entries(row).find(([key]) => names.includes(normalizeHeader(key)))
  return entry?.[1]
}

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : String(value ?? '').trim()

const readName = (value: unknown) => {
  const parts = readText(value).split(/\s+/).filter(Boolean)
  const prefix = ['นางสาว', 'นาย', 'นาง'].includes(parts[0] ?? '') ? parts.shift() ?? '' : ''

  return {
    prefix,
    firstName: parts.shift() ?? '',
    lastName: parts.join(' ')
  }
}

const normalizeCohortYear = (value: unknown) => {
  const year = Number(value)
  return Number.isInteger(year) && year > 0 && year < 100 ? year + 2500 : value
}

const readActive = (value: unknown) => {
  if (value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false

  const text = String(value).trim().toLowerCase()
  if (['true', 'active', 'ใช้งาน'].includes(text)) return true
  if (['false', 'inactive', 'ไม่ใช้งาน'].includes(text)) return false

  return null
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)

  if (!file?.data.length) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกไฟล์ CSV หรือ Excel (.xlsx)' })
  }

  if (file.data.length > 2 * 1024 * 1024) {
    throw createError({ statusCode: 413, message: 'ไฟล์ต้องมีขนาดไม่เกิน 2 MB' })
  }

  const extension = file.filename?.split('.').pop()?.toLowerCase()
  if (!['csv', 'xlsx'].includes(extension ?? '')) {
    throw createError({ statusCode: 400, message: 'รองรับเฉพาะไฟล์ CSV และ XLSX' })
  }

  let rows: Record<string, unknown>[]
  try {
    const workbook = new ExcelJS.Workbook()
    if (extension === 'csv') {
      await workbook.csv.read(Readable.from([file.data]))
    } else {
      await workbook.xlsx.load(file.data as never)
    }

    const worksheet = workbook.worksheets[0]
    const headerRow = worksheet?.getRow(1).values as unknown[] | undefined
    rows = []
    worksheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || !headerRow) return
      const record: Record<string, unknown> = {}
      headerRow.forEach((header, index) => {
        if (index && header !== undefined && header !== null) {
          record[String(header)] = row.getCell(index).value ?? ''
        }
      })
      rows.push(record)
    })
  } catch {
    throw createError({ statusCode: 400, message: 'ไม่สามารถอ่านไฟล์ที่อัปโหลดได้' })
  }

  if (!rows.length) {
    throw createError({ statusCode: 400, message: 'ไม่พบข้อมูลนักศึกษาในไฟล์' })
  }

  if (rows.length > 1000) {
    throw createError({ statusCode: 400, message: 'นำเข้าได้ไม่เกิน 1,000 รายการต่อครั้ง' })
  }

  const errors: string[] = []
  const seenIds = new Set<string>()
  const students = rows.flatMap((row, index) => {
    const isActive = readActive(rowValue(row, headers.isActive))
    if (isActive === null) {
      errors.push(`แถว ${index + 2}: สถานะใช้งานต้องเป็น ใช้งาน หรือ ไม่ใช้งาน`)
      return []
    }

    try {
      const name = readName(rowValue(row, headers.firstName))
      const firstName = readText(rowValue(row, headers.firstName))
      const lastName = readText(rowValue(row, headers.lastName))
      const student = readStudentInput({
        studentId: String(rowValue(row, headers.studentId) ?? ''),
        prefix: readText(rowValue(row, headers.prefix)) || name.prefix || 'ไม่ระบุ',
        firstName: lastName ? firstName : name.firstName || firstName,
        lastName: lastName || name.lastName || '-',
        cohortYear: normalizeCohortYear(rowValue(row, headers.cohortYear)),
        classGroup: rowValue(row, headers.classGroup),
        ...(isActive === undefined ? {} : { isActive })
      })

      if (seenIds.has(student.studentId)) {
        errors.push(`แถว ${index + 2}: รหัสนักศึกษา ${student.studentId} ซ้ำในไฟล์`)
        return []
      }

      seenIds.add(student.studentId)
      return [student]
    } catch (error) {
      errors.push(`แถว ${index + 2}: ${error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง'}`)
      return []
    }
  })

  if (errors.length) {
    throw createError({
      statusCode: 400,
      message: `ไม่ได้นำเข้าข้อมูล: ${errors.slice(0, 10).join(' | ')}${errors.length > 10 ? ' | …' : ''}`
    })
  }

  const existing = await prisma.user.findMany({
    where: { loginId: { in: students.map(student => student.studentId) } },
    select: { loginId: true }
  })
  const existingIds = new Set(existing.map(user => user.loginId))
  const newStudents = students.filter(student => !existingIds.has(student.studentId))

  let importedCount = 0
  const chunkSize = 20
  for (let i = 0; i < newStudents.length; i += chunkSize) {
    const chunk = newStudents.slice(i, i + chunkSize)
    const records = await Promise.all(
      chunk.map(async (student) => ({
        loginId: student.studentId,
        passwordHash: await hashPassword(student.studentId),
        role: 'STUDENT' as const,
        prefix: student.prefix,
        firstName: student.firstName,
        lastName: student.lastName,
        cohortYear: student.cohortYear,
        classGroup: student.classGroup,
        isActive: student.isActive,
        mustChangePassword: true
      }))
    )

    for (const record of records) {
      await prisma.user.create({ data: record })
      importedCount++
    }
  }

  return {
    imported: importedCount,
    skipped: students.length - importedCount,
    total: students.length
  }
})
