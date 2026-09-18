export default defineEventHandler(() => prisma.company.findMany({
  orderBy: { name: 'asc' }
}))
