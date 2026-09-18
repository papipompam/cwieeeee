# แผน UX/UI: Sidebar และ Header Bar

## เป้าหมาย

สร้าง app shell สำหรับระบบบริหารจัดการนิเทศสหกิจศึกษาที่ใช้ร่วมกันทั้ง 3 บทบาท
ได้แก่ เจ้าหน้าที่ อาจารย์ และนักศึกษา โดยรอบนี้กำหนดเฉพาะ sidebar, header bar
และรายการเมนู ยังไม่ออกแบบหรือพัฒนาหน้าเนื้อหาภายใน

แนวทางอ้างอิงมาจาก `/Users/jirayu/dev/github/dashboard` แต่ปรับให้ตรงกับงานจริง
ของระบบ ไม่คัดลอกส่วน demo เช่น team switcher, inbox, notification, feedback,
theme editor หรือ command search เข้ามา

## หลักการตัดสินใจ

- ใช้ Nuxt UI เป็นโครงหลัก และใช้ Tailwind เฉพาะการจัดระยะ/ขนาดที่ component
  ยังไม่ครอบคลุม
- ใช้ Lucide ผ่านชื่อ `i-lucide-*` เท่านั้น ไม่เพิ่ม icon library อีกชุด
- ใช้สี semantic จาก `app/app.config.ts` เช่น `primary`, `neutral`, `error`,
  `bg-default`, `bg-elevated`, `text-muted` ไม่ hard-code สี palette ใน component
- ใช้ app shell เดียวร่วมกันทั้ง 3 บทบาท แล้วสร้างรายการเมนูจาก role ของ session
  ไม่ทำ layout แยกที่มี markup ซ้ำกัน
- แสดงเฉพาะเมนูที่ผู้ใช้มีสิทธิ์และมีหน้าที่ใช้งานจริง ห้ามมี dead menu
- ภาษาใน UI ใช้ภาษาไทย กระชับ และใช้คำเดียวกันทุกหน้า
- สีไม่ใช่ตัวบอกสถานะเพียงอย่างเดียว ต้องมีข้อความหรือ icon ประกอบ

## โครงสร้าง App Shell

ใช้โครงของ Nuxt UI โดยตรง:

```text
UApp
└── NuxtLayout (dashboard)
    └── UDashboardGroup
        ├── UDashboardSidebar
        │   ├── header: ชื่อระบบ/ตราระบบ
        │   ├── default: UNavigationMenu ตาม role
        │   └── footer: ข้อมูลผู้ใช้และเมนูบัญชี
        └── NuxtPage
            └── UDashboardPanel
                ├── header: UDashboardNavbar
                └── body: เนื้อหาของแต่ละหน้า (นอกรอบแผนนี้)
```

### Sidebar

- ใช้ `UDashboardSidebar` แบบ `collapsible` และ `resizable`
- ใช้ `v-model:open` สำหรับ mobile navigation และปิด drawer เมื่อเลือกเมนู
- ใช้ `UNavigationMenu orientation="vertical"` พร้อมส่งค่า `collapsed`
- เมื่อย่อ sidebar ให้เหลือ icon พร้อม tooltip และ accessible name
- เก็บสถานะย่อ/ขยายด้วยความสามารถของ `UDashboardGroup` ไม่สร้าง store เพิ่ม
- ส่วนบนแสดง icon `i-lucide-graduation-cap` และชื่อย่อ `CWIE CS BRU`
- เมื่อ sidebar กว้าง แสดงชื่อภาษาไทย `ระบบนิเทศสหกิจศึกษา` เพิ่มใต้ชื่อย่อ
- ส่วนล่างแสดงชื่อผู้ใช้และบทบาทผ่าน `UDropdownMenu`
- เมนูผู้ใช้รอบแรกมีเพียง `โปรไฟล์` และ `ออกจากระบบ`; เพิ่มตั้งค่าหรือเปลี่ยนธีม
  เมื่อมี requirement จริง

ไม่เพิ่ม sidebar search ในรอบแรก เพราะจำนวนเมนูยังน้อยและแบ่งกลุ่มได้ชัดเจน

### Header Bar

- ทุกหน้าใช้ `UDashboardNavbar`
- ด้านซ้ายมี `UDashboardSidebarCollapse` และชื่อหน้าปัจจุบัน
- หน้าย่อยแสดง breadcrumb เฉพาะเมื่อมี hierarchy มากกว่า 1 ระดับ
- ด้านขวาสงวนไว้สำหรับ primary action ของหน้าปัจจุบัน เช่น `เพิ่มรอบสหกิจ`
  ไม่ใส่ปุ่มรวมแบบ dropdown ที่เปลี่ยนไปตามหน้า
- ไม่เพิ่ม notification bell จนกว่าจะมี notification workflow และข้อมูลจริง
- บนหน้าจอแคบต้องยังเห็นปุ่มเปิด sidebar, ชื่อหน้า และ primary action ที่จำเป็น

## รายการเมนูตามบทบาท

### เจ้าหน้าที่

เมนูชุดแรกอิงจากขอบเขตงานที่ตกลงแล้วและพร้อมพัฒนาเป็นลำดับแรก

| เมนู | Route | Lucide icon | หมายเหตุ |
| --- | --- | --- | --- |
| ภาพรวม | `/staff` | `i-lucide-layout-dashboard` | สรุปงานของเจ้าหน้าที่ |
| รอบสหกิจ | `/staff/cooperative-cycles` | `i-lucide-calendar-range` | จัดการรอบ ภาคเรียน ช่วงฝึก และสถานะ |
| นักศึกษา | `/staff/students` | `i-lucide-graduation-cap` | จัดการข้อมูลนักศึกษา |
| อาจารย์ | `/staff/teachers` | `i-lucide-user-round-check` | จัดการข้อมูลอาจารย์ |
| สถานประกอบการ | `/staff/companies` | `i-lucide-building-2` | จัดการบริษัท ที่อยู่ ผู้ประสานงาน และพิกัด |

เมื่อเริ่มมี workflow คำร้อง การจัดสถานประกอบการ หนังสือส่งตัว การมอบหมายอาจารย์
หรือการนิเทศ จึงค่อยเพิ่มกลุ่มเมนูใหม่ตามงานจริง ไม่เตรียมเมนูเปล่าไว้ล่วงหน้า

### อาจารย์

ข้อมูล workflow ของอาจารย์ยังไม่พอสำหรับกำหนดเมนูย่อย จึงเริ่มด้วยเมนูที่ไม่สร้าง
ความคาดหวังเกินระบบ:

| เมนู | Route | Lucide icon | หมายเหตุ |
| --- | --- | --- | --- |
| ภาพรวม | `/teacher` | `i-lucide-layout-dashboard` | จุดเข้าใช้งานของอาจารย์ |

เมนูที่คาดว่าอาจเกิดภายหลัง เช่น นักศึกษาที่รับผิดชอบ แผนการนิเทศ และผลการนิเทศ
ต้องยืนยัน workflow ก่อนเพิ่มเข้า sidebar

### นักศึกษา

ข้อมูล workflow ของนักศึกษายังไม่พอสำหรับกำหนดเมนูย่อย จึงเริ่มด้วย:

| เมนู | Route | Lucide icon | หมายเหตุ |
| --- | --- | --- | --- |
| ภาพรวม | `/student` | `i-lucide-layout-dashboard` | จุดเข้าใช้งานของนักศึกษา |

เมนูที่คาดว่าอาจเกิดภายหลัง เช่น คำร้อง สถานประกอบการ เอกสาร และกำหนดการนิเทศ
ต้องยืนยัน workflow ก่อนเพิ่มเข้า sidebar

## การจัดกลุ่มเมนูในอนาคต

ยังไม่ต้องทำ submenu ในรอบแรก เพราะเมนูเจ้าหน้าที่มีเพียง 5 รายการ เมื่อจำนวน workflow
เพิ่มขึ้นจึงค่อยแบ่ง `NavigationMenuItem[][]` เป็นกลุ่ม เช่น `ข้อมูลหลัก`, `กระบวนการสหกิจ`
และ `การนิเทศ` โดยไม่ซ้อนเมนูเกิน 1 ระดับ

## โครงสร้างไฟล์ที่เสนอ

สร้างเท่าที่จำเป็นเมื่อเริ่ม implementation:

```text
app/
├── components/
│   └── App/
│       └── UserMenu.vue
├── layouts/
│   └── dashboard.vue
└── pages/
    ├── staff/
    ├── teacher/
    └── student/
```

- เก็บรายการ navigation ใน `dashboard.vue` ก่อน ตราบใดที่ใช้เพียงจุดเดียว
- แยกเป็น composable เมื่อมี logic permission/session จริงและมีเหตุผลให้ reuse
- ใช้ `UserMenu.vue` แยกต่างหากเพราะมี interaction และข้อมูลผู้ใช้ของตัวเอง
- ไม่สร้าง component ครอบ `UDashboardSidebar` หรือ `UDashboardNavbar` หากยังไม่ได้
  ลดความซ้ำจริง

## State และ Permission

- ข้อมูล role และผู้ใช้ต้องมาจาก session จริงเมื่อระบบยืนยันตัวตนพร้อม
- frontend ใช้ role เพื่อเลือกเมนู แต่ backend ต้องตรวจสิทธิ์ทุก API เช่นเดิม
- route ที่ไม่มีสิทธิ์ต้องถูก middleware ป้องกัน ไม่ใช่อาศัยเพียงการซ่อนเมนู
- ก่อน auth พร้อม สามารถใช้ typed fixture จุดเดียวเพื่อพัฒนา shell ได้ แต่ต้องระบุชัดว่า
  เป็นของชั่วคราวและถอดออกเมื่อเชื่อม session

## Responsive และ Accessibility

- Desktop: sidebar เปิดอยู่และย่อเป็น icon-only ได้
- Mobile: sidebar เปิดแบบ slideover/drawer ผ่าน `UDashboardSidebar`
- การเลือกเมนูบน mobile ต้องปิด sidebar อัตโนมัติ
- active, hover และ focus-visible ต้องเห็นชัดทั้ง light/dark mode
- icon-only button ทุกปุ่มต้องมี `aria-label`; tooltip ใช้ช่วยการค้นพบแต่ไม่แทน label
- รองรับชื่อผู้ใช้และชื่อหน้าแบบยาวโดยไม่ดัน primary action หลุดจอ
- ลำดับ focus ต้องเริ่มจากปุ่มเปิด sidebar ไป navigation และกลับสู่เนื้อหาหลักได้

## ลำดับการพัฒนา

1. สร้าง `dashboard.vue` ด้วย `UDashboardGroup`, `UDashboardSidebar` และ
   role-aware `UNavigationMenu` โดยเริ่มจาก fixture แบบ typed หาก auth ยังไม่พร้อม
2. สร้าง `UserMenu.vue` เฉพาะข้อมูลผู้ใช้ โปรไฟล์ และออกจากระบบ
3. สร้างหน้า entry เปล่าที่มี `UDashboardPanel` และ `UDashboardNavbar` สำหรับแต่ละ role
   เพื่อทดสอบ routing, active state และ responsive behavior
4. เชื่อม session, permission และ route middleware เมื่อ authentication พร้อม
5. เพิ่มเมนูของอาจารย์/นักศึกษาเมื่อ workflow ของแต่ละบทบาทได้รับการยืนยัน

## เกณฑ์ยอมรับ

- ทั้ง 3 role ใช้ shell เดียวและเห็นเฉพาะเมนูของตน
- route ปัจจุบันแสดง active state ถูกต้อง
- sidebar ย่อ/ขยายได้ และ mobile drawer เปิด/ปิดได้ด้วย keyboard
- เมื่อ sidebar ย่อ ทุกเมนูยังเข้าใจได้จาก accessible name และ tooltip
- header แสดงชื่อหน้าและ primary action โดยไม่ล้นที่ viewport แคบ
- ใช้เฉพาะ Nuxt UI, Tailwind ที่ติดตั้งอยู่ และ `i-lucide-*`
- ไม่มีสี raw palette ใน component ใหม่ และไม่ทำ theme ซ้ำจาก `app/app.config.ts`
- ไม่มี menu demo, dead menu หรือ dependency ใหม่
- `pnpm typecheck` และ `pnpm build` ผ่านหลัง implementation

## นอกขอบเขตรอบนี้

- เนื้อหาหน้า dashboard, table, form และ CRUD
- notification center และ global search
- authentication implementation และรายละเอียด permission matrix
- workflow ของอาจารย์และนักศึกษาที่ยังไม่ได้ตกลง
- logo/ตรามหาวิทยาลัยจริง จนกว่าจะมี asset และข้อกำหนดการใช้งานที่ยืนยันแล้ว

## แหล่งอ้างอิง

- โครงสร้างตัวอย่าง: `/Users/jirayu/dev/github/dashboard/app/layouts/default.vue`
- User menu ตัวอย่าง: `/Users/jirayu/dev/github/dashboard/app/components/UserMenu.vue`
- Nuxt UI documentation: <https://ui.nuxt.com/llms.txt>
- Nuxt documentation: <https://nuxt.com/llms.txt>

