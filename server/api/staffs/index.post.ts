export default defineEventHandler(async (event) => {
  const staff = readStaffInput(await readBody(event))

  try {
    return await prisma.staff.create({ data: staff })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: `มีรหัสเจ้าหน้าที่ ${staff.staffId} อยู่แล้วในระบบ` })
    }
    throw error
  }
})
