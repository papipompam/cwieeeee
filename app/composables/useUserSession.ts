export type UserRole = 'staff' | 'teacher' | 'student'

export interface MockUser {
  id: string
  name: string
  email: string
  role: UserRole
  roleLabel: string
  avatar?: {
    src?: string
    alt?: string
    text?: string
  }
}

const roleProfiles: Record<UserRole, MockUser> = {
  staff: {
    id: '1',
    name: 'สมศรี มณีฉาย',
    email: 'somsri.m@bru.ac.th',
    role: 'staff',
    roleLabel: 'เจ้าหน้าที่บริหารงานทั่วไป',
    avatar: {
      text: 'สม'
    }
  },
  teacher: {
    id: '2',
    name: 'ผศ.ดร.ประสิทธิ์ วงศ์วิวัฒน์',
    email: 'prasit.w@bru.ac.th',
    role: 'teacher',
    roleLabel: 'อาจารย์นิเทศ',
    avatar: {
      text: 'ปว'
    }
  },
  student: {
    id: '3',
    name: 'กิตติภูมิ พัฒนสกุล',
    email: '65011234@bru.ac.th',
    role: 'student',
    roleLabel: 'นักศึกษา',
    avatar: {
      text: 'กพ'
    }
  }
}

// ponytail: temporary mock session fixture until authentication system is implemented
export const useUserSession = () => {
  const currentRole = useState<UserRole>('app:currentRole', () => 'staff')

  const user = computed<MockUser>(() => roleProfiles[currentRole.value])

  const setRole = (role: UserRole) => {
    currentRole.value = role
  }

  return {
    user,
    currentRole,
    setRole
  }
}
