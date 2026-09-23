export type StaffInput = {
  staffId: string
  prefix: string
  firstName: string
  lastName: string
  phone: string
  isActive: boolean
}

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export const readStaffInput = (value: Record<string, unknown>): StaffInput => {
  const staffId = readText(value.staffId)
  const prefix = readText(value.prefix)
  const firstName = readText(value.firstName)
  const lastName = readText(value.lastName)
  const phone = readText(value.phone)

  if (!staffId) throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสเจ้าหน้าที่' })
  if (!prefix) throw createError({ statusCode: 400, message: 'กรุณาระบุคำนำหน้า' })
  if (!firstName) throw createError({ statusCode: 400, message: 'กรุณากรอกชื่อ' })
  if (!lastName) throw createError({ statusCode: 400, message: 'กรุณากรอกนามสกุล' })
  if (!phone) throw createError({ statusCode: 400, message: 'กรุณากรอกเบอร์มือถือ' })
  if (!/^0\d{9}$/.test(phone)) {
    throw createError({ statusCode: 400, message: 'กรุณากรอกเบอร์มือถือเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0' })
  }

  if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
    throw createError({ statusCode: 400, message: 'สถานะใช้งานไม่ถูกต้อง' })
  }

  return {
    staffId,
    prefix,
    firstName,
    lastName,
    phone,
    isActive: value.isActive ?? true
  }
}
