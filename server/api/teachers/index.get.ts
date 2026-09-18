export default defineEventHandler(() => prisma.teacher.findMany({
  orderBy: { teacherId: 'asc' }
}))
