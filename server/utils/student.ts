export type StudentInput = {
  studentId: string
  prefix: string
  firstName: string
  lastName: string
  gender: string
  cohortYear: number
  classGroup: number
  isActive: boolean
}

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const readPositiveInteger = (value: unknown, message: string) => {
  const number = Number(value)

  if (!Number.isInteger(number) || number <= 0) {
    throw createError({ statusCode: 400, message })
  }

  return number
}

export const readStudentInput = (value: Record<string, unknown>): StudentInput => {
  const studentId = readText(value.studentId)
  const prefix = readText(value.prefix)
  const firstName = readText(value.firstName)
  const lastName = readText(value.lastName)
  const gender = readText(value.gender)

  if (!studentId) throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสนักศึกษา' })
  if (!prefix) throw createError({ statusCode: 400, message: 'กรุณาระบุคำนำหน้า' })
  if (!firstName) throw createError({ statusCode: 400, message: 'กรุณากรอกชื่อ' })
  if (!lastName) throw createError({ statusCode: 400, message: 'กรุณากรอกนามสกุล' })
  if (!gender) throw createError({ statusCode: 400, message: 'กรุณาระบุเพศ' })

  const cohortYear = readPositiveInteger(value.cohortYear, 'รุ่นนักศึกษาต้องเป็นจำนวนเต็มบวก (พ.ศ.)')
  const classGroup = readPositiveInteger(value.classGroup, 'หมู่เรียนต้องเป็นจำนวนเต็มบวก')

  if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
    throw createError({ statusCode: 400, message: 'สถานะใช้งานไม่ถูกต้อง' })
  }

  return { studentId, prefix, firstName, lastName, gender, cohortYear, classGroup, isActive: value.isActive ?? true }
}

export const isUniqueConstraintError = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === 'P2002'
)
