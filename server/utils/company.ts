export type CompanyInput = {
  name: string
  contactPerson: string
  phone: string | null
  email: string | null
  addressNo: string
  moo: string | null
  soi: string | null
  street: string | null
  subdistrict: string
  district: string
  province: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  travelNote: string | null
  isActive: boolean
}

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const readOptionalText = (value: unknown) => {
  const text = readText(value)
  return text ? text : null
}

const readOptionalCoordinate = (value: unknown, min: number, max: number, label: string): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (isNaN(num) || num < min || num > max) {
    throw createError({ statusCode: 400, message: `${label}ต้องเป็นตัวเลขระหว่าง ${min} ถึง ${max}` })
  }
  return num
}

export const readCompanyInput = (value: Record<string, unknown>): CompanyInput => {
  const name = readText(value.name)
  const contactPerson = readText(value.contactPerson)
  const addressNo = readText(value.addressNo)
  const subdistrict = readText(value.subdistrict)
  const district = readText(value.district)
  const province = readText(value.province)
  const postalCode = readText(value.postalCode)

  if (!name) throw createError({ statusCode: 400, message: 'กรุณากรอกชื่อสถานประกอบการ' })
  if (!contactPerson) throw createError({ statusCode: 400, message: 'กรุณาระบุชื่อบุคลากรผู้ติดต่อหลัก' })
  if (!addressNo) throw createError({ statusCode: 400, message: 'กรุณากรอกบ้านเลขที่/อาคาร' })
  if (!subdistrict) throw createError({ statusCode: 400, message: 'กรุณากรอกตำบล/แขวง' })
  if (!district) throw createError({ statusCode: 400, message: 'กรุณากรอกอำเภอ/เขต' })
  if (!province) throw createError({ statusCode: 400, message: 'กรุณาระบุจังหวัด' })

  if (!postalCode) {
    throw createError({ statusCode: 400, message: 'กรุณากรอกรหัสไปรษณีย์' })
  }
  if (!/^\d{5}$/.test(postalCode)) {
    throw createError({ statusCode: 400, message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' })
  }

  const email = readOptionalText(value.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  }

  const phone = readOptionalText(value.phone)
  const moo = readOptionalText(value.moo)
  const soi = readOptionalText(value.soi)
  const street = readOptionalText(value.street)
  const travelNote = readOptionalText(value.travelNote)

  const latitude = readOptionalCoordinate(value.latitude, -90, 90, 'ละติจูด')
  const longitude = readOptionalCoordinate(value.longitude, -180, 180, 'ลองจิจูด')

  if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
    throw createError({ statusCode: 400, message: 'สถานะใช้งานไม่ถูกต้อง' })
  }

  return {
    name,
    contactPerson,
    phone,
    email,
    addressNo,
    moo,
    soi,
    street,
    subdistrict,
    district,
    province,
    postalCode,
    latitude,
    longitude,
    travelNote,
    isActive: value.isActive ?? true
  }
}
