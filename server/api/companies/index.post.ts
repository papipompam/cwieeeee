export default defineEventHandler(async (event) => {
  const company = readCompanyInput(await readBody(event))
  return await prisma.company.create({ data: company })
})
