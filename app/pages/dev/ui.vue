<script setup lang="ts">
import type { FormSubmitEvent, InputDateProps, TableColumn } from '@nuxt/ui'
import { z } from 'zod'
import UIConfirmModal from '~/components/UI/ConfirmModal.vue'
import UIButtonRefresh from '~/components/UI/ButtonRefresh.vue'

definePageMeta({ title: 'Design System', layout: 'dashboard', middleware: 'dev-ui' })
useHead({ title: 'Design System' })

const demoPaginationPage = ref(1)
const demoMenuItems = [
  [
    {
      label: 'โปรไฟล์จำลอง',
      icon: 'i-lucide-user',
    },
    {
      label: 'ตั้งค่าระบบ',
      icon: 'i-lucide-settings',
    },
  ],
  [
    {
      label: 'ออกจากระบบ (จำลอง)',
      icon: 'i-lucide-log-out',
    },
  ],
]

const form = reactive({ companyName: '', province: '', positionDetails: '', accepted: false })
const modalExample = reactive({ title: '', notifyStudent: true, publishNow: false })
const modalDate = shallowRef<InputDateProps<false>['modelValue']>()
const toast = useToast()
const colors = [
  { name: 'Primary', value: '#F5B32B', class: 'bg-primary text-ink' },
  { name: 'Main', value: '#FFFFFF', class: 'border border-divider bg-canvas text-ink' },
  { name: 'Secondary', value: '#F7F7F7', class: 'bg-surface text-ink' },
  { name: 'Sidebar', value: '#1D1E20', class: 'bg-sidebar text-white' },
  { name: 'Border', value: '#E5E7E9', class: 'bg-divider text-ink' },
]
const tabs = [{ value: 'student', label: 'นักศึกษา', slot: 'student' }, { value: 'lecturer', label: 'อาจารย์', slot: 'lecturer' }, { value: 'staff', label: 'เจ้าหน้าที่', slot: 'staff' }]
const provinceOptions = [
  { value: 'buriram', label: 'บุรีรัมย์' },
  { value: 'nakhon-ratchasima', label: 'นครราชสีมา' },
  { value: 'khon-kaen', label: 'ขอนแก่น' },
]

type RequestStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'cancelled'
type TablePreviewState = 'data' | 'loading' | 'empty' | 'error' | 'forbidden'
type SortDirection = 'asc' | 'desc'

interface PlacementRequest {
  id: string
  studentId: string
  studentName: string
  company: string
  position: string
  submittedDate: string
  status: RequestStatus
}

const formSchema = z.object({
  companyName: z.string().trim().min(1, 'กรุณากรอกชื่อสถานประกอบการ'),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  positionDetails: z.string().trim().min(10, 'กรุณากรอกรายละเอียดอย่างน้อย 10 ตัวอักษร'),
  accepted: z.boolean().refine(Boolean, 'กรุณายืนยันความถูกต้องของข้อมูล'),
})

const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'draft', label: 'ฉบับร่าง' },
  { value: 'review', label: 'รอตรวจสอบ' },
  { value: 'approved', label: 'ยืนยันแล้ว' },
  { value: 'rejected', label: 'ต้องแก้ไข' },
  { value: 'cancelled', label: 'ยกเลิกแล้ว' },
]
const pageSizeOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]
const previewColumns: TableColumn<PlacementRequest>[] = [
  { id: 'select', header: '', enableSorting: false },
  { accessorKey: 'studentName', header: 'นักศึกษา' },
  { accessorKey: 'company', header: 'สถานประกอบการ / ตำแหน่ง' },
  { accessorKey: 'submittedDate', header: 'วันที่ยื่น' },
  { accessorKey: 'status', header: 'สถานะ' },
  { id: 'actions', header: 'จัดการ', enableSorting: false },
]
const tablePreviewOptions: { value: TablePreviewState, label: string }[] = [
  { value: 'data', label: 'Data' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
  { value: 'forbidden', label: 'Forbidden' },
]
const initialPlacementRequests: PlacementRequest[] = [
  { id: 'REQ-001', studentId: '65011212001', studentName: 'กานต์พิชชา สุขใจ', company: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด', position: 'Frontend Developer', submittedDate: '2026-08-24', status: 'review' },
  { id: 'REQ-002', studentId: '65011212008', studentName: 'ธีรภัทร วัฒนะ', company: 'โรงพยาบาลบุรีรัมย์', position: 'IT Support', submittedDate: '2026-08-23', status: 'approved' },
  { id: 'REQ-003', studentId: '65011212014', studentName: 'ปวีณ์นุช มั่นคง', company: 'บริษัท อีสานเทค จำกัด', position: 'UX/UI Designer', submittedDate: '2026-08-22', status: 'draft' },
  { id: 'REQ-004', studentId: '65011212021', studentName: 'ณัฐวุฒิ แสงทอง', company: 'สำนักงานจังหวัดบุรีรัมย์', position: 'Data Analyst', submittedDate: '2026-08-21', status: 'review' },
  { id: 'REQ-005', studentId: '65011212029', studentName: 'ศิริพร ใจดี', company: 'บริษัท โคราชซอฟต์แวร์ จำกัด', position: 'Software Tester', submittedDate: '2026-08-20', status: 'rejected' },
  { id: 'REQ-006', studentId: '65011212035', studentName: 'ภูริณัฐ ทองแท้', company: 'การไฟฟ้าส่วนภูมิภาค', position: 'Network Engineer', submittedDate: '2026-08-19', status: 'approved' },
  { id: 'REQ-007', studentId: '65011212042', studentName: 'ชนากานต์ บุญมี', company: 'บริษัท เน็กซ์โค้ด จำกัด', position: 'Backend Developer', submittedDate: '2026-08-18', status: 'review' },
  { id: 'REQ-008', studentId: '65011212047', studentName: 'วรัญญา คำดี', company: 'เทศบาลเมืองบุรีรัมย์', position: 'IT Officer', submittedDate: '2026-08-17', status: 'draft' },
  { id: 'REQ-009', studentId: '65011212053', studentName: 'พีรพัฒน์ สีหา', company: 'บริษัท สมาร์ทฟาร์ม จำกัด', position: 'IoT Developer', submittedDate: '2026-08-16', status: 'approved' },
  { id: 'REQ-010', studentId: '65011212061', studentName: 'อรอนงค์ สายใจ', company: 'สำนักงานสาธารณสุขจังหวัดบุรีรัมย์', position: 'Data Support', submittedDate: '2026-08-15', status: 'review' },
  { id: 'REQ-011', studentId: '65011212068', studentName: 'ภาณุพงศ์ แก้วกล้า', company: 'บริษัท คลาวด์อีสาน จำกัด', position: 'Cloud Support', submittedDate: '2026-08-14', status: 'rejected' },
  { id: 'REQ-012', studentId: '65011212074', studentName: 'สุพิชญา มั่นหมาย', company: 'มหาวิทยาลัยราชภัฏบุรีรัมย์', position: 'Web Developer', submittedDate: '2026-08-13', status: 'approved' },
  { id: 'REQ-013', studentId: '65011212081', studentName: 'ณรงค์ชัย พันธ์ดี', company: 'บริษัท โลจิสติกส์บุรีรัมย์ จำกัด', position: 'System Support', submittedDate: '2026-08-12', status: 'draft' },
  { id: 'REQ-014', studentId: '65011212089', studentName: 'เบญญาภา แสงงาม', company: 'ศูนย์ดิจิทัลชุมชนบุรีรัมย์', position: 'UX Researcher', submittedDate: '2026-08-11', status: 'review' },
]
const femaleStudentIds = new Set(['65011212001', '65011212014', '65011212029', '65011212042', '65011212047', '65011212061', '65011212074', '65011212089'])
const createPlacementRequests = (): PlacementRequest[] => initialPlacementRequests.map(request => ({
  ...request,
  studentName: `${femaleStudentIds.has(request.studentId) ? 'นางสาว' : 'นาย'}${request.studentName}`,
}))
const placementRequests = ref(createPlacementRequests())

const searchQuery = ref('')
const statusFilter = ref('all')
const tablePreviewState = ref<TablePreviewState>('data')
const sortDirection = ref<SortDirection | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedIds = ref<string[]>([])
const tableRowSelection = computed<Record<string, boolean>>({
  get: () => Object.fromEntries(selectedIds.value.map(id => [id, true])),
  set: selection => { selectedIds.value = Object.keys(selection).filter(id => selection[id]) },
})
const demoDialogOpen = ref(false)
const demoConfirmOpen = ref(false)
const cancelDialogOpen = ref(false)
const requestToCancel = ref<PlacementRequest | null>(null)

const statusMeta: Record<RequestStatus, { label: string, color: 'neutral' | 'warning' | 'success' | 'error' }> = {
  draft: { label: 'ฉบับร่าง', color: 'neutral' },
  review: { label: 'รอตรวจสอบ', color: 'warning' },
  approved: { label: 'ยืนยันแล้ว', color: 'success' },
  rejected: { label: 'ต้องแก้ไข', color: 'error' },
  cancelled: { label: 'ยกเลิกแล้ว', color: 'neutral' },
}

const filteredRequests = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('th')
  return placementRequests.value
    .filter(request => statusFilter.value === 'all' || request.status === statusFilter.value)
    .filter(request => !keyword || [request.studentId, request.studentName, request.company, request.position].some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .toSorted((a, b) => {
      if (!sortDirection.value) return 0
      const comparison = a.submittedDate.localeCompare(b.submittedDate)
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRequests.value.length / pageSize.value)))
const paginatedRequests = computed(() => {
  const safePage = Math.min(currentPage.value, pageCount.value)
  const start = (safePage - 1) * pageSize.value
  return filteredRequests.value.slice(start, start + pageSize.value)
})
const visibleSelectedCount = computed(() => paginatedRequests.value.filter(request => selectedIds.value.includes(request.id)).length)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (!visibleSelectedCount.value) return false
  if (visibleSelectedCount.value === paginatedRequests.value.length) return true
  return 'indeterminate'
})
const resultStart = computed(() => filteredRequests.value.length ? (currentPage.value - 1) * pageSize.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSize.value, filteredRequests.value.length))

watch([searchQuery, statusFilter, pageSize], () => {
  currentPage.value = 1
  selectedIds.value = []
})
watch(tablePreviewState, (state) => {
  if (state !== 'data') selectedIds.value = []
})
watch(pageCount, count => { currentPage.value = Math.min(currentPage.value, count) })

const toggleDateSort = () => {
  sortDirection.value = sortDirection.value === null ? 'asc' : sortDirection.value === 'asc' ? 'desc' : null
  currentPage.value = 1
  selectedIds.value = []
}
const toggleSelectAll = (checked: boolean | 'indeterminate') => {
  const visibleIds = paginatedRequests.value.map(request => request.id)
  selectedIds.value = checked === true
    ? [...new Set([...selectedIds.value, ...visibleIds])]
    : selectedIds.value.filter(id => !visibleIds.includes(id))
}
const toggleRow = (id: string, checked: boolean | 'indeterminate') => {
  selectedIds.value = checked === true
    ? [...new Set([...selectedIds.value, id])]
    : selectedIds.value.filter(selectedId => selectedId !== id)
}
const handleTableRowSelect = (_event: Event, row: { original: PlacementRequest }) => {
  toggleRow(row.original.id, !selectedIds.value.includes(row.original.id))
}
const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
}
const resetTable = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  tablePreviewState.value = 'data'
  sortDirection.value = null
  pageSize.value = 10
  currentPage.value = 1
  selectedIds.value = []
  placementRequests.value = createPlacementRequests()
}

const thaiDateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const formatThaiDate = (date: string) => thaiDateFormatter.format(new Date(`${date}T00:00:00+07:00`))

const notifyAction = (title: string, description: string) => {
  toast.add({ title, description })
}

const cancelRequest = (request: PlacementRequest) => {
  request.status = 'cancelled'
  selectedIds.value = selectedIds.value.filter(id => id !== request.id)
  notifyAction('ยกเลิกคำร้องแล้ว', `${request.id} ของ ${request.studentName}`)
}
const openCancelDialog = (request: PlacementRequest) => {
  requestToCancel.value = request
  cancelDialogOpen.value = true
}
const confirmCancel = () => {
  if (requestToCancel.value) cancelRequest(requestToCancel.value)
  cancelDialogOpen.value = false
  requestToCancel.value = null
}

const submitExampleForm = (_event: FormSubmitEvent<z.output<typeof formSchema>>) => {
  notifyAction('ตรวจสอบฟอร์มแล้ว', 'ข้อมูลตัวอย่างผ่าน Validation และพร้อมส่ง')
}

let retryTimer: number | undefined
const retryTable = () => {
  tablePreviewState.value = 'loading'
  retryTimer = window.setTimeout(() => { tablePreviewState.value = 'data' }, 600)
}

onBeforeUnmount(() => {
  if (retryTimer) window.clearTimeout(retryTimer)
})
</script>

<template>
  <UDashboardPanel id="developer-ui-page">
    <template #body>
      <div class="w-full space-y-6 pb-12">
        <div>
          <p class="text-sm font-medium text-warning">Checkpoint 1</p>
          <h2 class="mt-1 text-2xl font-bold text-ink sm:text-3xl">Design Foundation</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">หน้านี้ใช้ตรวจสี ตัวอักษร ปุ่ม ฟอร์ม สถานะ และ
            interaction กลางก่อนนำไปสร้างทุกโมดูล</p>
        </div>

        <UCard>
          <h3 class="text-lg font-bold text-ink">สีและสถานะ</h3>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div v-for="color in colors" :key="color.name"
              class="overflow-hidden rounded-control border border-divider">
              <div class="h-20 p-3 text-sm font-semibold" :class="color.class">{{ color.name }}</div>
              <div class="bg-canvas px-3 py-2 font-mono text-xs text-muted">{{ color.value }}</div>
            </div>
          </div>
          <div class="mt-5 flex flex-wrap gap-2">
            <UBadge color="neutral" variant="subtle">ค่าเริ่มต้น</UBadge>
            <UBadge color="info" variant="subtle">รอดำเนินการ</UBadge>
            <UBadge color="warning" variant="subtle">รอตรวจสอบ</UBadge>
            <UBadge color="info" variant="subtle">รอสัมภาษณ์</UBadge>
            <UBadge color="success" variant="subtle">ยืนยันแล้ว</UBadge>
            <UBadge color="error" variant="subtle">ไม่ผ่าน</UBadge>
          </div>
        </UCard>

        <UCard>
          <h3 class="text-lg font-bold text-ink">ปุ่มและ Feedback</h3>
          <div class="mt-4 flex flex-wrap gap-3">
            <UButton size="xl" icon="i-lucide-plus" @click="notifyAction('ทดลองปุ่มสร้างรายการ', 'ตัวอย่าง Primary action')">
              สร้างรายการ</UButton>
            <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-search"
              @click="notifyAction('ทดลองปุ่มค้นหา', 'ตัวอย่าง Secondary action')">ค้นหา</UButton>
            <UButton size="xl" color="neutral" variant="ghost" @click="notifyAction('ทดลองปุ่มยกเลิก', 'ตัวอย่าง Ghost action')">
              ยกเลิก</UButton>
            <UButton size="xl" color="error" icon="i-lucide-trash-2"
              @click="notifyAction('ทดลองปุ่มอันตราย', 'Action จริงต้องเปิดกล่องยืนยันก่อนดำเนินการ')">ยุติการใช้งาน
            </UButton>
            <UButton size="xl" loading>กำลังบันทึก</UButton>
            <UButton size="xl" disabled>ไม่มีสิทธิ์ใช้งาน</UButton>
            <UButton size="xl" color="neutral" variant="outline"
              @click="notifyAction('บันทึกข้อมูลแล้ว', 'ตัวอย่างข้อความตอบกลับระดับ Action')">ทดลอง Toast</UButton>
          </div>
          <div class="mt-5 grid gap-3 lg:grid-cols-2">
            <UAlert color="info" variant="subtle" title="ข้อมูลสำหรับตรวจสอบ"
              description="ใช้สีร่วมกับข้อความและไอคอน ไม่ใช้สีอย่างเดียวในการบอกสถานะ" />
            <UAlert color="success" variant="subtle" title="ดำเนินการสำเร็จ"
              description="ระบบบันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว" />
            <UAlert color="warning" variant="subtle" title="ต้องตรวจสอบเพิ่มเติม"
              description="เอกสารยังไม่มีลายเซ็นของสถานประกอบการ" />
            <UAlert color="error" variant="subtle" title="ไม่สามารถบันทึกได้"
              description="กรุณาตรวจสอบข้อมูลในช่องที่ระบุ" />
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-ink">Nuxt UI Components (ธีมกลางสำหรับ Production)</h3>
              <p class="mt-1 text-xs text-muted">คอมโพเนนต์ Nuxt UI v4 ที่ได้รับสไตล์จาก app.config.ts และ design tokens
                กลาง</p>
            </div>
            <UBadge color="primary" variant="subtle">Production Theme</UBadge>
          </div>

          <div class="mt-5 space-y-4">
            <div>
              <p class="text-xs font-semibold text-muted mb-2">ปุ่ม (UButton)</p>
              <div class="flex flex-wrap items-center gap-3">
                <UButton size="xl" color="primary" label="สร้างรายการ (Primary)" icon="i-lucide-plus" />
                <UButton size="xl" color="neutral" variant="outline" label="ค้นหา (Outline)" icon="i-lucide-search" />
                <UButton size="xl" color="neutral" variant="ghost" label="ยกเลิก (Ghost)" />
                <UButton size="xl" color="error" label="ลบรายการ (Danger)" icon="i-lucide-trash-2" />
                <UButton size="xl" color="success" label="ยืนยันสำเร็จ" icon="i-lucide-check" />
                <UButton size="xl" color="primary" loading label="กำลังบันทึก" />
                <UButton size="xl" color="neutral" variant="outline" disabled label="ไม่มีสิทธิ์" />
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-2">ป้ายสถานะ (UBadge)</p>
              <div class="flex flex-wrap gap-2">
                <UBadge color="primary" variant="subtle">กำลังดำเนินการ</UBadge>
                <UBadge color="info" variant="subtle">รอดำเนินการ</UBadge>
                <UBadge color="warning" variant="subtle">รอตรวจสอบ</UBadge>
                <UBadge color="success" variant="subtle">ผ่านการอนุมัติ</UBadge>
                <UBadge color="error" variant="subtle">ไม่อนุมัติ / ต้องแก้ไข</UBadge>
                <UBadge color="neutral" variant="subtle">ยกเลิกแล้ว</UBadge>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-2">การแจ้งเตือน (UAlert)</p>
              <div class="grid gap-3 lg:grid-cols-2">
                <UAlert color="info" variant="subtle" title="ข้อมูลสำหรับตรวจสอบ"
                  description="ใช้สีร่วมกับข้อความและไอคอนเพื่อบอกสถานะอย่างชัดเจน" />
                <UAlert color="success" variant="subtle" title="ดำเนินการสำเร็จ"
                  description="ระบบบันทึกข้อมูลเรียบร้อยแล้ว" />
                <UAlert color="warning" variant="subtle" title="ต้องตรวจสอบเพิ่มเติม"
                  description="เอกสารยังไม่สมบูรณ์ กรุณาตรวจสอบอีกครั้ง" />
                <UAlert color="error" variant="subtle" title="เกิดข้อผิดพลาด"
                  description="ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" />
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-2">การแบ่งหน้า (UPagination)</p>
              <div class="flex flex-wrap items-center gap-4">
                <UPagination v-model:page="demoPaginationPage" :total="100" :items-per-page="10" size="sm" />
                <span class="text-xs text-muted">หน้าปัจจุบัน: {{ demoPaginationPage }}</span>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-2">เมนูดรอปดาวน์จำลอง (UDropdownMenu Showcase - แยกจาก Auth
                State)</p>
              <div class="flex flex-wrap items-center gap-4">
                <UDropdownMenu :items="demoMenuItems" :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)' }">
                  <button type="button"
                    class="flex h-12 w-full max-w-90 items-center gap-3 rounded-control bg-canvas px-3 text-left transition-colors hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary/25 sm:w-90"
                    aria-label="เมนูผู้ใช้จำลอง">
                    <div
                      class="grid size-9.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-medium text-ink">
                      จ
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[14px] font-medium text-ink">ผู้ใช้จำลอง (Demo User)</span>
                      <span class="text-[12px] text-muted">แสดงเมนูเฉพาะหน้า ไม่แตะ Auth State</span>
                    </div>
                    <UIcon name="i-lucide-chevron-down" class="size-4 text-muted shrink-0" />
                  </button>
                </UDropdownMenu>

                <UDropdownMenu :items="demoMenuItems">
                  <UButton color="neutral" variant="ghost" label="เปิดเมนูตัวอย่าง" icon="i-lucide-chevron-down"
                    trailing />
                </UDropdownMenu>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <h3 class="text-lg font-bold text-ink">ฟอร์ม</h3>
          <p class="mt-1 text-sm text-muted">ตัวอย่าง field, validation และ action ที่ใช้เป็นมาตรฐานกลาง</p>
          <UForm :schema="formSchema" :state="form" class="mt-4 grid gap-5 lg:grid-cols-2" @submit="submitExampleForm">
            <UFormField name="companyName" class="w-full" label="ชื่อสถานประกอบการ" required>
              <UInput v-model="form.companyName" class="w-full" size="xl" placeholder="เช่น บริษัท ตัวอย่าง จำกัด" />
            </UFormField>
            <UFormField name="province" class="w-full" label="จังหวัด" required>
              <USelect v-model="form.province" class="w-full" size="xl" placeholder="เลือกจังหวัด" :items="provinceOptions" />
            </UFormField>
            <UFormField name="positionDetails" class="lg:col-span-2" label="รายละเอียดตำแหน่งงาน" required>
              <UTextarea v-model="form.positionDetails" class="w-full" size="xl" placeholder="อธิบายลักษณะงานที่คาดว่าจะได้รับมอบหมาย" />
            </UFormField>
            <UFormField name="accepted" class="lg:col-span-2">
              <UCheckbox v-model="form.accepted" size="sm"
                label="ยืนยันว่าข้อมูลข้างต้นถูกต้องและสามารถนำไปจัดทำหนังสือขอฝึกงานได้" />
            </UFormField>
            <div class="lg:col-span-2">
              <UButton size="xl" type="submit">ตรวจสอบฟอร์ม</UButton>
            </div>
          </UForm>
          <div class="mt-8 border-t border-divider pt-6">
            <h4 class="text-base font-bold text-ink">Overlay</h4>
            <p class="mt-1 text-sm text-muted">ใช้ Modal สำหรับข้อมูลหรือขั้นตอนต่อเนื่อง และ Confirm Modal สำหรับ action ที่ย้อนกลับยาก</p>
            <div class="mt-4 flex flex-wrap gap-3">
              <UButton size="xl" color="neutral" variant="outline" @click="demoDialogOpen = true">เปิด Modal ตัวอย่าง</UButton>
              <UButton size="xl" color="error" variant="soft" @click="demoConfirmOpen = true">เปิด Confirm Modal</UButton>
            </div>
            <UModal v-model:open="demoDialogOpen" title="ยืนยันการดำเนินการ"
              description="ตัวอย่าง Modal สำหรับเนื้อหาหรือขั้นตอนที่ผู้ใช้ต้องตรวจสอบก่อนยืนยัน"><template #body>
                <div class="grid gap-5">
                  <UFormField label="ชื่อรอบสหกิจ" description="ตั้งชื่อให้ผู้ใช้เข้าใจช่วงเวลาที่เลือก">
                    <UInput v-model="modalExample.title" class="w-full" size="xl" placeholder="เช่น รอบสหกิจ ภาคเรียนที่ 2" />
                  </UFormField>
                  <UFormField label="วันเริ่มต้น" required>
                    <UInputDate v-model="modalDate" class="w-full" size="xl" aria-label="Select a date" />
                  </UFormField>
                  <div class="space-y-3 rounded-control bg-surface p-4">
                    <USwitch v-model="modalExample.notifyStudent" size="sm" label="แจ้งนักศึกษาเมื่อเปิดรอบ" />
                    <USwitch v-model="modalExample.publishNow" size="sm" label="เผยแพร่รอบทันที" />
                  </div>
                </div>
              </template><template #footer>
                <div class="ml-auto flex gap-2">
                  <UButton size="xl" color="neutral" variant="ghost" @click="demoDialogOpen = false">ยกเลิก</UButton>
                  <UButton
                    size="xl"
                    @click="demoDialogOpen = false; notifyAction('ยืนยันการดำเนินการแล้ว', 'Dialog ปิดและคืน focus ไปยังปุ่มเปิด')">
                    ยืนยัน</UButton>
                </div>
              </template>
            </UModal>
            <UIConfirmModal v-model:open="demoConfirmOpen" title="ยืนยันการลบข้อมูลตัวอย่าง"
              description="ตัวอย่างสำหรับ action ที่มีผลกระทบ" message="เมื่อลบแล้ว ข้อมูลตัวอย่างนี้จะไม่สามารถกู้คืนได้"
              sub-message="ใช้ Confirm Modal ก่อน mutation ที่ย้อนกลับยาก" confirm-label="ยืนยันการลบ"
              confirm-color="error" @confirm="demoConfirmOpen = false; notifyAction('ยืนยันการลบแล้ว', 'นี่เป็นเพียงข้อมูลตัวอย่าง')" />
          </div>
          <UTabs :items="tabs" default-value="student" size="xl" class="mt-6"><template
              #student>มุมมองติดตามคำร้องและตารางนิเทศของนักศึกษา</template><template
              #lecturer>มุมมองตารางนิเทศและแบบประเมินของอาจารย์</template><template #staff>มุมมองจัดการคำร้อง รอบสหกิจ
              และการนิเทศของเจ้าหน้าที่</template></UTabs>
        </UCard>

        <UCard :ui="{ body: 'p-0' }">
          <div class="border-b border-divider p-5 sm:p-6">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 class="text-lg font-bold text-ink">Data Table</h3>
                <p class="mt-1 text-sm leading-6 text-muted">ตัวอย่างตารางคำร้องสถานประกอบการ รองรับค้นหา กรอง เรียง
                  เลือกหลายรายการ การทำงานต่อแถว และแบ่งหน้า</p>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <div class="flex flex-wrap gap-2" aria-label="เลือกสถานะตัวอย่างตาราง">
                  <UButton
                    v-for="option in tablePreviewOptions"
                    :key="option.value"
                    size="sm"
                    :color="tablePreviewState === option.value ? 'primary' : 'neutral'"
                    :variant="tablePreviewState === option.value ? 'soft' : 'ghost'"
                    :aria-pressed="tablePreviewState === option.value"
                    @click="tablePreviewState = option.value"
                  >
                    {{ option.label }}
                  </UButton>
                </div>
                <UButton size="xl" icon="i-lucide-plus"
                  @click="notifyAction('ตัวอย่างปุ่มหลัก', 'ระบบแสดงผลตอบกลับด้วย Toast ตามมาตรฐานกลาง')">
                  สร้างคำร้อง
                </UButton>
              </div>
            </div>

            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <UFormField label="ค้นหาคำร้อง" class="w-full sm:max-w-sm lg:w-96 lg:flex-none">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  size="xl"
                  icon="i-lucide-search"
                  class="w-full"
                  placeholder="ค้นหารหัส ชื่อ บริษัท หรือตำแหน่ง"
                />
              </UFormField>
              <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
                <div class="w-full sm:w-52">
                  <USelect v-model="statusFilter" class="w-full" size="xl" :items="statusOptions" placeholder="กรองตามสถานะ" />
                </div>
                <UIButtonRefresh @refresh="resetTable" />
              </div>
            </div>

            <div v-if="statusFilter !== 'all' || searchQuery" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">ตัวกรองที่ใช้:</span>
              <span v-if="searchQuery"
                class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">คำค้น “{{
                searchQuery
                }}”</span>
              <span v-if="statusFilter !== 'all'"
                class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">{{
                  statusOptions.find(option => option.value === statusFilter)?.label }}</span>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearFilters">
                ล้างทั้งหมด
              </UButton>
            </div>
          </div>

          <div v-if="selectedIds.length"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-warning-soft px-5 py-3 sm:px-6"
            role="status">
            <p class="text-sm font-semibold text-ink">เลือกแล้ว {{ selectedIds.length }} รายการ</p>
            <div class="flex gap-2">
              <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-download"
                @click="notifyAction('จำลองการส่งออกแล้ว', `เลือก ${selectedIds.length} รายการ`)">ส่งออก</UButton>
              <UButton size="sm" color="neutral" variant="ghost" @click="selectedIds = []">ยกเลิกการเลือก</UButton>
            </div>
          </div>

          <div v-if="tablePreviewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูล">
            <div v-for="row in 4" :key="row"
              class="grid grid-cols-[2rem_1.2fr_1fr_8rem] gap-4 max-md:grid-cols-[1fr_7rem]">
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
              <USkeleton class="h-10 max-md:hidden" />
              <USkeleton class="h-10" />
            </div>
          </div>

          <div v-else-if="tablePreviewState === 'error'" class="p-5 sm:p-6">
            <UEmpty icon="i-lucide-triangle-alert" title="โหลดรายการคำร้องไม่สำเร็จ"
              description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" variant="subtle" class="min-h-64">
              <template #actions>
                <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="retryTable">ลองอีกครั้ง</UButton>
              </template>
            </UEmpty>
          </div>
          <div v-else-if="tablePreviewState === 'forbidden'" class="p-5 sm:p-6">
            <UEmpty icon="i-lucide-shield-alert" title="ไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
              description="บัญชีปัจจุบันไม่มีสิทธิ์เปิดดูหรือดำเนินการกับรายการนี้" variant="subtle" class="min-h-64" />
          </div>
          <div v-else-if="tablePreviewState === 'empty' || !paginatedRequests.length" class="p-5 sm:p-6">
            <UEmpty icon="i-lucide-inbox" class="min-h-64"
              :title="searchQuery || statusFilter !== 'all' ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีคำร้องสถานประกอบการ'"
              :description="searchQuery || statusFilter !== 'all' ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เมื่อมีคำร้อง รายการจะแสดงในตารางนี้'">
              <template #actions>
                <UButton v-if="searchQuery || statusFilter !== 'all'" size="xl" color="neutral" variant="outline" @click="clearFilters">
                  ล้างตัวกรอง
                </UButton>
                <UButton v-else size="xl" icon="i-lucide-plus"
                  @click="notifyAction('ตัวอย่างปุ่มหลัก', 'ระบบแสดงผลตอบกลับด้วย Toast ตามมาตรฐานกลาง')">สร้างคำร้อง
                </UButton>
              </template>
            </UEmpty>
          </div>

          <template v-else>
            <div class="w-full overflow-x-auto">
              <UTable
                v-model:row-selection="tableRowSelection"
                :data="paginatedRequests"
                :columns="previewColumns"
                :get-row-id="row => row.id"
                :row-selection-options="{ enableRowSelection: true }"
                class="min-w-full cursor-pointer"
                :ui="{ base: 'w-full min-w-240' }"
                @select="handleTableRowSelect"
              >
                <template #select-header>
                  <UCheckbox size="lg" :model-value="selectAllState" aria-label="เลือกทุกรายการในหน้านี้" @click.stop @update:model-value="toggleSelectAll" />
                </template>
                <template #select-cell="{ row }">
                  <UCheckbox size="lg" :model-value="selectedIds.includes(row.original.id)" :aria-label="`เลือกคำร้องของ ${row.original.studentName}`" @click.stop @update:model-value="toggleRow(row.original.id, $event)" />
                </template>
                <template #studentName-cell="{ row }">
                  <p class="font-semibold text-ink">{{ row.original.studentName }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.original.studentId }} · {{ row.original.id }}</p>
                </template>
                <template #company-cell="{ row }">
                  <p class="font-medium text-ink">{{ row.original.company }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.original.position }}</p>
                </template>
                <template #submittedDate-cell="{ row }">{{ formatThaiDate(row.original.submittedDate) }}</template>
                <template #status-cell="{ row }"><UBadge :color="statusMeta[row.original.status].color" variant="subtle">{{ statusMeta[row.original.status].label }}</UBadge></template>
                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                    <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-eye"
                      @click.stop="notifyAction('เปิดรายละเอียดคำร้อง', row.original.id)"
                    >
                      ดูรายละเอียด
                    </UButton>
                    <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-pencil"
                      @click.stop="notifyAction('เปิดแบบแก้ไขคำร้อง', row.original.id)"
                    >
                      แก้ไข
                    </UButton>
                    <UButton
                      v-if="row.original.status !== 'cancelled'"
                      color="error"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-trash-2"
                      @click.stop="openCancelDialog(row.original)"
                    >
                      ยกเลิก
                    </UButton>
                  </div>
                </template>
                <template #actions-header><span class="block text-right">จัดการ</span></template>
                <template #submittedDate-header>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="md"
                    :ui="{ base: 'font-semibold' }"
                    :icon="sortDirection === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : sortDirection === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-down-up'"
                    trailing
                    :aria-label="sortDirection === null ? 'เรียงวันที่ยื่น' : sortDirection === 'asc' ? 'เรียงวันที่ยื่นจากเก่าไปใหม่' : 'เรียงวันที่ยื่นจากใหม่ไปเก่า'"
                    @click.stop="toggleDateSort"
                  >
                    วันที่ยื่น
                  </UButton>
                </template>
              </UTable>
              <UIConfirmModal
                v-model:open="cancelDialogOpen"
                title="ยืนยันการยกเลิกคำร้อง"
                :description="requestToCancel ? `คำร้อง ${requestToCancel.id} ของ ${requestToCancel.studentName}` : ''"
                message="เมื่อตกลง คำร้องจะเปลี่ยนเป็นสถานะยกเลิก"
                confirm-label="ยืนยันการยกเลิก"
                confirm-color="error"
                icon="i-lucide-trash-2"
                icon-color="error"
                @confirm="confirmCancel"
                @cancel="requestToCancel = null"
              />
            </div>
            <div
              class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="flex flex-wrap items-center gap-3">
                <p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{
                  filteredRequests.length }}
                  รายการ</p>
                <div class="w-16 shrink-0">
                  <USelect v-model="pageSize" size="md" class="w-full" :items="pageSizeOptions" aria-label="จำนวนรายการต่อหน้า" />
                </div>
              </div>
              <UPagination v-model:page="currentPage" :total="filteredRequests.length" :items-per-page="pageSize" size="md" />
            </div>
          </template>
        </UCard>

        <UCard>
          <h3 class="text-lg font-bold text-ink">Shared States</h3>
          <p class="mt-1 text-sm text-muted">ตัวอย่างสถานะมาตรฐานที่ใช้ซ้ำในหน้าข้อมูลจริง</p>
          <div class="mt-5 grid gap-4 lg:grid-cols-3">
            <UEmpty icon="i-lucide-inbox" title="ไม่พบรายการที่ค้นหา"
              description="ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น" class="min-h-64" />
            <UEmpty icon="i-lucide-triangle-alert" title="ไม่สามารถโหลดข้อมูลได้"
              description="โปรดลองอีกครั้ง หากยังพบปัญหาให้ติดต่อเจ้าหน้าที่ดูแลระบบ" variant="subtle" class="min-h-64" />
            <UEmpty icon="i-lucide-shield-alert" title="ไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
              description="บัญชีปัจจุบันไม่มีสิทธิ์เปิดดูหรือดำเนินการกับรายการนี้" variant="subtle" class="min-h-64" />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<!-- Keep a non-empty style module so Vite HMR does not resolve this SFC's script as CSS. -->
<style scoped>
.dev-ui-hmr-anchor {
  --dev-ui-hmr-anchor: 2;
}
</style>
