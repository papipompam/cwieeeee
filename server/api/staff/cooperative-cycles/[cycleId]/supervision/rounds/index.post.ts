export default defineEventHandler(async (event) => {
  await getStaffSupervisionContext(event)
  throw createError({ statusCode: 405, message: 'รอบนิเทศกำหนดไว้แล้วเพียงครั้งที่ 1 และ 2 ไม่สามารถเพิ่มรอบได้' })
})
