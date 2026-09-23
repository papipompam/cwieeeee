import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { hashPassword } from '../server/utils/auth'

const admin = await prisma.user.findUnique({ where: { loginId: 'admin' } })
if (!admin) {
  await prisma.user.create({
    data: {
      loginId: 'admin',
      role: 'STAFF',
      passwordHash: await hashPassword('admin1234'),
      prefix: 'เจ้าหน้าที่',
      firstName: 'ผู้ดูแลระบบ',
      lastName: '(Admin)',
      isActive: true
    }
  })
  console.log('Bootstrapped admin account.')
} else {
  console.log('Admin account already exists.')
}
await prisma.$disconnect()
