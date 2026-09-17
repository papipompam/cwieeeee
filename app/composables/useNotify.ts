export const useNotify = () => {
  const toast = useToast()

  const errorTranslations: Record<string, string> = {
    'Invalid email or password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'User already exists': 'มีผู้ใช้งานอีเมลนี้ในระบบแล้ว',
    'Invalid credential': 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง',
  }

  const add = (
    title: string,
    description: string,
    icon: string,
    color: 'success' | 'error' | 'warning' | 'info' | 'neutral',
  ) => toast.add({ title, description, icon, color })

  const success = (message: string) =>
    add('สำเร็จ', message, 'i-lucide-check', 'success')

  const saved = (item = 'ข้อมูล') =>
    add('บันทึกสำเร็จ', `${item}ถูกบันทึกแล้ว`, 'i-lucide-check', 'success')

  const updated = (item = 'ข้อมูล') =>
    add('อัปเดตสำเร็จ', `${item}ถูกอัปเดตแล้ว`, 'i-lucide-check', 'success')

  const created = (item = 'รายการ') =>
    add('สร้างสำเร็จ', `${item}ถูกสร้างแล้ว`, 'i-lucide-plus-circle', 'success')

  const deleted = (item = 'รายการ') =>
    add('ลบสำเร็จ', `${item}ถูกลบแล้ว`, 'i-lucide-trash-2', 'success')

  const error = (message: string) =>
    add('เกิดข้อผิดพลาด', errorTranslations[message] || message, 'i-lucide-alert-octagon', 'error')

  const validationError = (message = 'กรุณาตรวจสอบข้อมูลที่กรอก') =>
    add('ข้อมูลไม่ถูกต้อง', message, 'i-lucide-alert-circle', 'error')

  const serverError = () =>
    add('เซิร์ฟเวอร์ขัดข้อง', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง', 'i-lucide-server-off', 'error')

  const warning = (message: string) =>
    add('คำเตือน', message, 'i-lucide-alert-triangle', 'warning')

  const info = (message: string) =>
    add('แจ้งให้ทราบ', message, 'i-lucide-info', 'info')

  const loading = (message = 'กำลังดำเนินการ...') =>
    add('กรุณารอสักครู่', message, 'i-lucide-loader-circle', 'neutral')

  return {
    toast,
    success,
    error,
    saved,
    updated,
    created,
    deleted,
    validationError,
    serverError,
    warning,
    info,
    loading,
  }
}
