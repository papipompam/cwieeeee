export default defineEventHandler(async (event) => {
  const company = readCompanyInput(await readBody(event))
  try {
    return await prisma.company.create({ data: company })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, message: 'มีข้อมูลสถานประกอบการนี้ในระบบแล้ว' })
    }
    throw error
  }
})
