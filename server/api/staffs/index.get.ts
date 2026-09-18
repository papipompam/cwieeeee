export default defineEventHandler(() => prisma.staff.findMany({
  orderBy: { staffId: 'asc' }
}))
