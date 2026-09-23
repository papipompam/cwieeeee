# แผนที่ 1 — Staff UI และ Shared Foundation

## เป้าหมายการส่งมอบ

ทำให้ shared dashboard foundation และ workflow หลักของ Staff ใช้ Nuxt UI ตาม baseline `/dev/ui` อย่างสม่ำเสมอ โดยไม่เปลี่ยนข้อมูล สิทธิ์ หรือ mutation เดิม แผนนี้ต้องผ่านก่อนเริ่ม Teacher เพราะ Staff ครอบคลุม shared shell, CRUD forms, operational tables, modals และ pagination มากที่สุด

ทุก phase ต้องใช้ `docs/fix-ui/UI-CONTRACT.md` เป็น acceptance contract ห้ามถือว่าเปลี่ยนเป็น Nuxt UI แล้วเสร็จหาก rendered size, anatomy หรือ states ยังต่างจาก `/dev/ui`

## ขอบเขตไฟล์

### Shared foundation ที่อนุญาตให้แก้ในแผนนี้

- `app/app.config.ts`
- `app/assets/css/main.css`
- `app/layouts/dashboard.vue`
- `app/components/App/DashboardNavbar.vue`
- `app/components/App/NotificationBell.vue`
- `app/components/App/UserMenu.vue`
- `app/components/UI/ButtonRefresh.vue`
- `app/components/UI/ConfirmModal.vue`
- `app/components/UI/AccountPasswordModal.vue`
- `app/components/Company/Form.vue`
- `app/components/Cycle/StudentsList.vue`

### Staff pages

- `app/pages/staff/index.vue`
- `app/pages/staff/cooperative-cycles/index.vue`
- `app/pages/staff/cooperative-cycles/[cycleId].vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/index.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/students.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/applications/index.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/applications/[requestId].vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/placements.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/supervisors.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/visits.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/evaluations.vue`
- `app/pages/staff/cooperative-cycles/[cycleId]/budgets.vue`
- `app/pages/staff/staffs.vue`
- `app/pages/staff/students.vue`
- `app/pages/staff/teachers.vue`
- `app/pages/staff/companies/index.vue`
- `app/pages/staff/companies/new.vue`
- `app/pages/staff/companies/[id].vue`
- `app/pages/staff/notifications/index.vue`

## Size contract ที่ต้องใช้ตาม /dev/ui

### ปุ่มและ Form controls
- Primary page action: `UButton size="xl"`
- Form submit/cancel/modal footer buttons: `size="xl"`
- Search input ใน control row: `UInput size="xl"`
- Filter dropdown ใน control row: `USelect size="xl"`
- Form input/select/textarea/date: `size="xl"`
- `UIButtonRefresh` ใน control row: ต้องสูงเท่ากับ input/select `size="xl"`
- Tabs: `UTabs size="xl"`
- Form checkbox ปกติ: `UCheckbox size="sm"`
- Switch: `USwitch size="sm"`

### Table controls
- Row action buttons: `size="xs"`
- Bulk-action buttons: `size="sm"`
- Clear-filter button: `size="xs"`
- Sort-header button: `size="md"` และข้อความ `font-semibold`
- Table row-selection checkbox: `size="lg"`
- Page-size selector: `USelect size="md"`
- Table pagination: `UPagination size="md"`
- Page-size selector ต้องสูงเท่ากับปุ่มเลือกหน้าของ pagination

## Table visual contract
Operational Staff tables ต้องประกอบในรูปแบบเดียวกับ Data Table ใน `/dev/ui`:
1. ใช้ `UCard :ui="{ body: 'p-0' }"` เป็น table surface
2. ส่วนหัว card ใช้: `border-b border-divider`, `p-5 sm:p-6`
3. Title: `text-lg font-bold text-ink`
4. Description: `mt-1 text-sm leading-6 text-muted`
5. Search/filter row: อยู่ภายใน card header, `mt-5`, responsive (column บนจอแคบและ row บนจอกว้าง), search/select/refresh สูงเท่ากัน (40px)
6. Active filters: แสดงใต้ control row พร้อมปุ่ม “ล้างทั้งหมด” (`size="xs"`)
7. Selected/bulk-action bar: แสดงเฉพาะเมื่อมี selection จริง ใช้ `bg-warning-soft`, buttons `size="sm"`
8. Table wrapper: `w-full overflow-x-auto`
9. `UTable`: `class="min-w-full"`, `:ui="{ base: 'w-full ...' }"` แสดงเต็มพื้นที่ card
10. Header: ใช้ global `bg-surface`, font size และ weight ของ sort header เท่าหัวคอลัมน์อื่น
11. Cells: ข้อมูลหลักใช้ `font-semibold` หรือ `font-medium`, metadata รองใช้ `text-xs text-muted`
12. Status: ใช้ semantic `UBadge variant="subtle"`
13. Action column: อยู่คอลัมน์สุดท้าย, header ชิดขวา, ใช้ direct labeled buttons `size="xs"`
14. Row selection: เพิ่มเฉพาะหน้าที่มี bulk action จริง, checkbox ใช้ `size="lg"`
15. Footer: `border-t border-divider`, `px-5 py-4 sm:px-6`, แสดงช่วง `แสดง X–Y จาก Z รายการ`, page-size selector `size="md"`, `UPagination size="md"`
16. Loading: skeleton สะท้อนโครงสร้างตาราง
17. Empty: `UEmpty`
18. Filtered empty: ข้อความต่างจากกรณียังไม่มีข้อมูล พร้อมปุ่มล้างตัวกรอง
19. Error: `UEmpty` พร้อมปุ่มลองอีกครั้ง
20. Forbidden: แสดงเฉพาะเมื่อ API/permission มี state นี้จริง

## ลำดับการแก้

### Phase 1.0 — Preflight และล็อก baseline

1. ตรวจ dirty files และอ่าน diff ของ shared files ก่อนแก้ เพื่อแยกงานเดิมของผู้ใช้
2. ตรวจ generated Nuxt routes สำหรับคู่ `[cycleId].vue` กับ `[cycleId]/index.vue`; บันทึกว่าไฟล์ใดถูก render หรือเกิด route conflict และห้ามรวม/ลบไฟล์ในงาน UI นี้
3. เปิด `/dev/ui` และ Staff representative routes: `/staff`, `/staff/cooperative-cycles`, `/staff/students`, `/staff/companies`
4. ตรวจ default/hover/focus/loading/error/modal/table/pagination บน desktop และ narrow viewport
5. ยืนยัน Nuxt UI slots/props จาก `.nuxt/ui/` หรือ official docs ก่อนแก้ config

**Checkpoint:** มีรายการ discrepancy ที่พิสูจน์จากหน้าจริง และไม่มีการแก้ไฟล์นอก scope

### Phase 1.1 — Shared theme และ app shell

1. `app/app.config.ts`
   - ตรวจ primary/warning solid contrast และ tabs active contrastกับ amber
   - กำหนด defaults/variants ให้สอดคล้องกับ size matrix ใน `UI-CONTRACT.md`
   - ใช้ `xl` สำหรับ form/control-row/page actions และรักษาขนาดเฉพาะของ row actions, selection และ pagination ตาม contract
2. `app/assets/css/main.css`
   - คง semantic tokens เป็น canonical source
   - ห้ามเพิ่ม selector ที่จับ `.rounded-* + .border + .bg-*`
   - ทำ inventory call sites ที่ยังพึ่ง compatibility selectors ก่อนวางแผนลบ
3. `app/layouts/dashboard.vue`
   - ตรวจ shell/sidebar ของ Staff, collapsed state, mobile drawer และ auth-dependent fetch
   - อย่าให้ `/dev/*` หรือ guest state ยิง protected Staff API โดยไม่จำเป็น
4. `DashboardNavbar.vue`, `NotificationBell.vue`, `UserMenu.vue`
   - ปรับ semantic tokens, focus, popup width และ responsive layout
   - คง native button ได้เมื่อเป็น semantic trigger ที่ accessible และ Nuxt UI wrapperไม่เพิ่มคุณค่า
5. `ButtonRefresh.vue`
   - ให้ caller กำหนด size ได้เมื่อจำเป็นและเลือก default ที่เข้ากับ production control rows
   - ตรวจ loading, disabled, accessible label และไม่กระโดดเมื่อหมุน icon
6. `ConfirmModal.vue` และ `AccountPasswordModal.vue`
   - ตรวจ body/footer slots, focus return, Escape, loading guard และ semantic action color
   - อย่าเปลี่ยน default action color จนกว่าจะตรวจทุก call site

**Checkpoint:** `/dev/ui`, Staff dashboard, UserMenu และ shared modals ไม่มี console error; control size และ contrast ผ่าน representative states

### Phase 1.2 — Staff landing และรอบสหกิจ

ทำตามลำดับไฟล์:

1. `app/pages/staff/index.vue`
   - ปรับ summary cards และ recent cycles ให้ใช้ surface/card/table pattern กลาง
   - แยก loading, error และ empty ของ dashboard data
2. `app/pages/staff/cooperative-cycles/index.vue`
   - เป็น reference CRUD list ของ Staff: navbar action, filters, refresh, table, pagination, create/edit modal และ delete confirm
   - แก้ modal เพิ่มรอบให้ใช้ Nuxt UI form/date controls พร้อม label และ error
3. `app/pages/staff/cooperative-cycles/[cycleId].vue` และ `app/pages/staff/cooperative-cycles/[cycleId]/index.vue`
   - หลังยืนยัน generated route แล้ว ปรับเฉพาะไฟล์ที่เป็น active owner ของหน้า overview
   - ตรวจอีกไฟล์ว่าเป็น dead/duplicate/alternate entry และรายงาน ห้ามลบหรือรวมโดยไม่มีงานแยก
   - ปรับ overview/status/navigation cards โดยไม่ซ้ำ action ใน sidebar
4. `students.vue`
   - ตรวจ table range, pagination, candidate modal, history state และ confirm mutation
5. `applications/index.vue` แล้ว `applications/[requestId].vue`
   - list ก่อน detail; รักษา filtering/status transition/file input behavior
   - native file input คงได้ แต่ต้องมี visible label, type restriction และ feedback
6. `placements.vue`
   - ทำ full-width table, empty state และ pagination ให้ตรง pattern
7. `supervisors.vue`
   - แบ่งตรวจเป็น section: rounds → teacher selection → company assignment → schedule editor
   - ห้าม rewrite ไฟล์ใหญ่ทั้งไฟล์; native selection buttons คงได้ถ้ามี `aria-pressed` และ keyboard behavior ครบ
8. `visits.vue`, `evaluations.vue`, `budgets.vue`
   - ปรับตาม dependency ของ rounds/groups ที่สร้างจาก supervisors
   - รักษา compact numeric/budget fields; ห้ามขยาย `size="xs"` เป็น field ใหญ่ทั่วระบบ

**Checkpoint:** workflow รอบสหกิจตั้งแต่สร้างรอบถึงนิเทศ/ประเมิน/งบประมาณทำงานเดิมครบ และทุก operational table overflow อย่างปลอดภัย

### Phase 1.3 — Master data CRUD

1. `app/pages/staff/staffs.vue`
2. `app/pages/staff/teachers.vue`
3. `app/pages/staff/students.vue`

สำหรับทั้งสามไฟล์:

- ทำ pattern control row/table/pagination/modal/confirm ให้เหมือนกันเฉพาะส่วนที่ behavior เหมือนกัน
- คง columns, permissions, import/file controls, account activation และ password flow เดิม
- ใช้ `UFormField` กับ create/edit fields และ inline validation
- อย่าสร้าง abstraction ใหม่ระหว่างสามหน้าจนเห็น duplication ที่ stable และมี testable contract

จากนั้นทำ:

4. `app/pages/staff/companies/index.vue`
   - ตรวจ filters, table, pagination, destructive confirm และ nested modal states
5. `app/components/Company/Form.vue`
   - เป็น source เดียวของ create/edit form; รักษา map coordinates และ server validation
6. `app/pages/staff/companies/new.vue` และ `[id].vue`
   - ให้ page shell และ actions ใช้ form เดียวกันโดยไม่ duplicate presentation
7. `app/components/Cycle/StudentsList.vue`
   - ปรับหลัง Staff students pattern เสถียร เพื่อไม่สร้าง table pattern คู่ขนาน

**Checkpoint:** CRUD ทั้ง 4 กลุ่มมี normal/invalid/loading/error/confirm states ที่ตรวจได้และไม่มี duplicate submit

### Phase 1.4 — Notification และ cleanup เฉพาะ Staff

1. `app/pages/staff/notifications/index.vue`
   - ใช้ shared notification list pattern โดยรักษา unread mutation และ keyboard-accessible row
2. ค้น raw palette/native controls/local overrides ใน Staff และ shared files ที่แก้
3. ลบเฉพาะ override ที่ global theme ครอบคลุมแล้วและมี visual evidence
4. ห้ามสร้าง prototype component layer ใต้ `app/components/dev-ui/` กลับมา

## Verification matrix

- Automated: `pnpm typecheck`, `pnpm build`, `git diff --check`
- Shell: sidebar expanded/collapsed/mobile, UserMenu, NotificationBell
- CRUD: create/edit/validation/loading/error/delete confirm
- Table: search/filter/clear/range/pagination/sort/selection เฉพาะที่มี feature จริง
- Overlay: open/close/Escape/focus return/duplicate submit/narrow viewport
- Cooperative flow: cycles → students → applications → placements → supervisors → visits → evaluations → budgets

## เกณฑ์ส่งมอบแผนที่ 1

- Staff routes ทั้ง 19 ไฟล์ได้รับการตรวจ; ไฟล์ที่ไม่ต้องแก้ต้องระบุเหตุผล
- Shared changes ไม่ทำให้ `/dev/ui`, login หรือ route ของ actor อื่น build/type fail
- ไม่มี business behavior หรือ permission เปลี่ยนโดยไม่มี requirement
- บันทึก shared decisions ที่ Teacher/Student ต้อง inherit และ unresolved authenticated states
- หยุดหลังส่งมอบ ห้ามเริ่ม `02-teacher.md` โดยอัตโนมัติ
