import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { hashPassword } from '../server/utils/auth'

const admin = await prisma.user.findUnique({ where: { loginId: 'admin' } })
if (!admin) {
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (!password || password.length < 12 || password === 'admin1234') {
    throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD to a unique password of at least 12 characters')
  }
  await prisma.user.create({
    data: {
      loginId: 'admin',
      role: 'STAFF',
      passwordHash: await hashPassword(password),
      prefix: 'เจ้าหน้าที่',
      firstName: 'ผู้ดูแลระบบ',
      lastName: '(Admin)',
      isActive: true,
      mustChangePassword: true
    }
  })
  console.log('Bootstrapped admin account.')
} else {
  console.log('Admin account already exists.')
}
await prisma.$disconnect()
