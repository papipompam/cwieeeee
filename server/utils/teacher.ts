export type TeacherInput = {
  teacherId: string
  prefix: string
  firstName: string
  lastName: string
  gender: string
  phone: string
  isActive: boolean
}

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export const readTeacherInput = (value: Record<string, unknown>): TeacherInput => {
  const teacherId = readText(value.teacherId)
  const prefix = readText(value.prefix)
  const firstName = readText(value.firstName)
  const lastName = readText(value.lastName)
  const gender = readText(value.gender)
  const phone = readText(value.phone)

  if (!teacherId) throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสอาจารย์' })
  if (!prefix) throw createError({ statusCode: 400, message: 'กรุณาระบุคำนำหน้า' })
  if (!firstName) throw createError({ statusCode: 400, message: 'กรุณากรอกชื่อ' })
  if (!lastName) throw createError({ statusCode: 400, message: 'กรุณากรอกนามสกุล' })
  if (!gender) throw createError({ statusCode: 400, message: 'กรุณาระบุเพศ' })
  if (phone && !/^0\d{9}$/.test(phone)) {
    throw createError({ statusCode: 400, message: 'กรุณากรอกเบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0' })
  }

  if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
    throw createError({ statusCode: 400, message: 'สถานะใช้งานไม่ถูกต้อง' })
  }

  return {
    teacherId,
    prefix,
    firstName,
    lastName,
    gender,
    phone,
    isActive: value.isActive ?? true
  }
}
