import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { hashPassword } from '../server/utils/auth'

const addUser = async (loginId: string, role: 'STAFF' | 'TEACHER' | 'STUDENT', password = loginId) => {
  await prisma.user.upsert({ where: { loginId }, update: {}, create: { loginId, role, passwordHash: await hashPassword(password) } })
}

await addUser('admin', 'STAFF', 'admin1234')
for (const item of await prisma.staff.findMany({ select: { staffId: true } })) await addUser(item.staffId, 'STAFF')
for (const item of await prisma.teacher.findMany({ select: { teacherId: true } })) await addUser(item.teacherId, 'TEACHER')
for (const item of await prisma.student.findMany({ select: { studentId: true } })) await addUser(item.studentId, 'STUDENT')
await prisma.$disconnect()
