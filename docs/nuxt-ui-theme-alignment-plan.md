# แผนปรับ Nuxt UI ให้สอดคล้องกับ Design System

> เอกสารนี้เป็น implementation plan สำหรับปรับ theme กลางของ Nuxt UI ให้สอดคล้องกับ
> design reference ที่ `/dev/ui` โดยคง route, API, state management และ business workflow เดิม
> ห้ามเปลี่ยน logic หรือย้าย component จำนวนมากในรอบเดียว ให้ผ่านเกณฑ์ตรวจรับของแต่ละ phase
> ก่อนเริ่ม phase ถัดไป

## 1. เป้าหมาย

หลังจบงาน หน้า dashboard ของ `STAFF`, `TEACHER` และ `STUDENT` ต้องใช้ visual language เดียวกัน:

- พื้นหลังหลัก `#FFFFFF`, พื้นผิวรอง `#F7F7F7`, เส้นขอบ `#E5E7E9`, ข้อความ `#1D1E20`
- primary amber `#F5B32B` พร้อมข้อความเข้ม, card ขอบมนและเงาแบบเดียวกับ `/dev/ui`
- form control, button, badge, alert, table และ modal ของ Nuxt UI มีค่าเริ่มต้นสม่ำเสมอ
- sidebar สีเข้มมี hover เทา, active amber และคง contrast ของข้อความ/ไอคอน
- หน้า login และ MapPicker ยังคง visual treatment เฉพาะหน้าตามเดิม เว้นแต่มี requirement เพิ่ม

ผลลัพธ์นี้ต้องเกิดจาก Nuxt UI theme configuration และ design tokens ไม่ใช่การ copy class ไปทุกหน้า

## 2. ข้อเท็จจริงและขอบเขต

### แหล่งอ้างอิง

| แหล่ง | บทบาท |
| --- | --- |
| `app/pages/dev/ui.vue` | design reference: สี, รัศมี, spacing, states และ interaction ที่ต้องเทียบ |
| `app/pages/dev/ui.vue` | showcase ที่ประกอบจาก Nuxt UI และ shared production primitives โดยตรง |
| `app/app.config.ts` | จุดตั้งค่า Nuxt UI global component theme |
| `app/assets/css/main.css` | จุดประกาศ tokens และ app-shell variables |
| `app/layouts/dashboard.vue` | owner ของ dashboard shell และ sidebar |
| `.nuxt/ui/*.ts` | source of truth ของ slot/variant ที่ติดตั้งจริงของ Nuxt UI v4 |

### นอกขอบเขต

- ไม่เปลี่ยน API, Prisma schema, authentication, routing หรือ business rules
- ไม่เปลี่ยน semantic meaning ของ `primary`, `success`, `warning`, `error`, `info`, `neutral`
- ไม่ migrate หน้า login หรือ MapPicker ในงานนี้
- ไม่สร้าง prototype component layer ที่ทำหน้าที่ซ้ำกับ Nuxt UI กลับมา
- ไม่ refactor template ของทุกหน้าเพียงเพื่อให้ class สวยขึ้น

### ความเสี่ยงหลักที่ต้องควบคุม

1. `app/assets/css/main.css` ให้ theme เฉพาะ staff/student ขณะที่ teacher ไม่ได้รับ theme เดียวกัน
2. Nuxt UI global change กระทบ `UInput` 107 จุดและ `UButton` 211 จุด; input `size="xs"` ใน budget ต้องไม่สูงเท่า field ปกติ
3. local `:ui`, raw palette classes และ selector CSS อาจชนะ global config ทำให้หน้าตาไม่สม่ำเสมอ
4. sidebar เป็น dark context ซึ่งต้อง override เฉพาะพื้นที่ ไม่ควรเปลี่ยน navigation/menu ทั่วแอป

## 3. Token contract ที่จะใช้

คง token เดิมใน `app/assets/css/main.css` และถือเป็น canonical palette สำหรับ Nuxt UI:

| ความหมาย | Token | ค่า reference |
| --- | --- | --- |
| พื้นหลังหลัก | `--color-canvas` | `#FFFFFF` |
| พื้นผิวรอง/hover แบบ light | `--color-surface` | `#F7F7F7` |
| ขอบมาตรฐาน | `--color-divider` | `#E5E7E9` |
| ตัวอักษรหลัก | `--color-ink` | `#1D1E20` |
| ตัวอักษรรอง | `--color-muted` | `#656A72` |
| primary | `--ui-primary` | `#F5B32B` |
| sidebar | `--color-sidebar` | `#1D1E20` |
| sidebar hover | `--color-sidebar-hover` | `#2A2B2E` |
| control radius | `--radius-control` | `0.625rem` |
| panel radius | `--radius-panel` | `0.875rem` |
| panel shadow | `--shadow-panel` | token เดิม |

`success`, `info`, `warning`, `error` คง semantic color ของ Nuxt UI ใน phase แรก; soft backgrounds
ต้องสอดคล้องกับ `--color-*-soft` ที่ reference ใช้ โดยไม่เปลี่ยนความหมายของ status ที่หน้าปัจจุบันส่งมา

## 4. ลำดับการทำงาน

```text
Phase 0  baseline + screenshot matrix
  ↓
Phase 1  รวม app-shell token scope ทุก role
  ↓
Phase 2  กำหนด Nuxt UI component theme ที่มีผลต่อ form/action
  ↓
Phase 3  กำหนด surface, feedback, table และ overlay theme
  ↓
Phase 4  แก้ local overrides ที่ขัดกับ theme กลางแบบเจาะจง
  ↓
Phase 5  เทียบ `/dev/ui`, ตรวจ role/state/responsive และตัดสินใจเรื่อง dev-ui components
```

ห้ามข้ามจาก Phase 1 ไปแก้ทุก page: ต้องให้ global component theme ผ่าน representative pages ก่อน

## 5. แผนราย phase และรายไฟล์

### Phase 0 — เก็บ baseline ก่อนเปลี่ยน theme

เป้าหมาย: มีหลักฐานเทียบ before/after และรู้ว่า state ใดต้องไม่พัง

| ไฟล์ | การเปลี่ยน | เหตุผล |
| --- | --- | --- |
| ไม่มี | ไม่แก้โค้ด | phase นี้เป็นการสำรวจและเก็บ screenshot เท่านั้น |
| `docs/nuxt-ui-theme-alignment-plan.md` | อัปเดต checklist เมื่อจบแต่ละ phase | เก็บการตัดสินใจและผลตรวจไว้ที่เดียว |

ให้เก็บ screenshot ที่ viewport desktop และ narrow viewport ของอย่างน้อย:

- staff: `/staff`, `/staff/students`, `/staff/cooperative-cycles/:cycleId/students`
- teacher: `/teacher`, `/teacher/visits`, `/teacher/evaluations/students`
- student: `/student`, `/student/applications`, `/student/requests`
- `/dev/ui`: button ทุก variant, form error, select open, table state, modal และ tabs

ตรวจ browser console, keyboard focus, collapsed/mobile sidebar, loading/disabled/error state ก่อนเริ่มแก้

**เกณฑ์ผ่าน:** ระบุได้ว่าหน้าใดเข้าถึงไม่ได้เพราะ fixture/role และไม่นำการไม่มีข้อมูลมาแปลว่า theme ถูกต้อง

### Phase 1 — รวม app-shell theme ให้ครอบคลุมทุก role

เป้าหมาย: staff, teacher และ student ได้ token ของ dashboard เดียวกัน แต่ sidebar ยังมี dark scope ของตัวเอง

| ไฟล์ | การแก้ละเอียด |
| --- | --- |
| `app/layouts/dashboard.vue` | เปลี่ยน class บน `UDashboardGroup` จาก condition ที่มีเฉพาะ `student-ui-theme`/`staff-ui-theme` เป็น shared class เช่น `app-ui-theme` สำหรับทุก dashboard route; คง class เฉพาะ role ได้เมื่อมีความต่างที่มี requirement จริงเท่านั้น. รักษา `UNavigationMenu` slot override ของ sidebar ไว้ เพราะเป็น dark-context override. ปรับ Design System link hover ให้ใช้ `bg-sidebar-hover` เช่นเดียวกับ menu ทั่วไป. |
| `app/assets/css/main.css` | ย้าย variables ปัจจุบันใต้ `:is(.student-ui-theme, .staff-ui-theme, ...)` ไปอยู่ใต้ `.app-ui-theme` และ `body:has(.app-ui-theme)` เพื่อให้ teacher ได้ชุดเดียวกัน. คง `.app-sidebar` เป็น scope เฉพาะ sidebar. อย่าประกาศ `--ui-primary` ซ้ำตาม role หากไม่มี design แตกต่าง. |
| `app/app.config.ts` | ยังไม่เพิ่ม component slots ใน phase นี้; คง palette semantic ปัจจุบันและยืนยันว่า shared scope มีผลกับ `--ui-primary` จริงก่อน. |

**สิ่งที่ต้องระวัง:** `.bg-primary { color: var(--color-ink) }` เป็น selector กว้างและอาจกระทบ badge, button หรือ element อื่นที่ต้องข้อความขาว; ใน phase นี้ให้บันทึก call sites ก่อน ยังไม่ลบจน Phase 2 กำหนด `UButton` variant แล้ว

**เกณฑ์ผ่าน:** หน้า teacher มี canvas/surface/border/text และ primary เดียวกับ staff/student โดยไม่ทำให้ sidebar หรือ login เปลี่ยน

### Phase 2 — กำหนด form และ action defaults ใน Nuxt UI

เป้าหมาย: component ที่ใช้มากที่สุดสะท้อน reference โดยไม่ต้องเติม raw class ทุกหน้า

| ไฟล์ | การแก้ละเอียด |
| --- | --- |
| `app/app.config.ts` | เพิ่ม `button`, `formField`, `input`, `select`, `textarea`, `checkbox` ผ่าน slots/compoundVariants ที่ยืนยันจาก `.nuxt/ui/*.ts`. กำหนด font, border, canvas background, `rounded-control`, focus outline และ disabled state. ใช้ compound variant แยก `xs` จาก `sm`/`md`/`lg` เพื่อไม่ทำให้ field budget เล็กลงหรือสูงเกิน. |
| `app/assets/css/main.css` | เพิ่มเฉพาะ custom CSS variables ที่ Nuxt UI slot config อ้างถึง; ห้ามเพิ่ม selector ที่พึ่ง DOM structure ของ Nuxt UI. ย้าย `.bg-primary` broad selector ออกหลังจาก `UButton` primary solid กำหนด `text-ink` โดยตรงแล้ว. |
| `app/components/UI/ButtonRefresh.vue` | ตรวจว่า neutral outline มีขนาด, radius และ hover ตาม theme ใหม่; แก้เฉพาะเมื่อ prop/component theme ไม่ได้ inherit ตามต้องการ. |
| `app/components/UI/AccountPasswordModal.vue` | ตรวจ UFormField/UInput/error/disabled เพื่อยืนยัน shared form theme กับ modal จริง; ไม่เปลี่ยน API หรือ state. |
| `app/components/Company/Form.vue` | ใช้เป็น representative form ที่มี field, select, textarea, validation และ action หลายแบบ; ลด local style เฉพาะที่ซ้ำกับ global theme เฉพาะหลังเทียบภาพ. |
| `app/components/Student/ApplicationForm.vue` | ใช้เป็น representative form ที่มี select, location input และ primary/secondary action; เก็บ style ที่เป็น domain-specific ไว้. |
| `app/pages/account/password.vue` | ตรวจ password inputs ใน modal/page context; ไม่เพิ่ม raw color override เว้นแต่ login requirement. |

**Button mapping ที่ต้องรักษา:**

| Reference `UiButton` | Nuxt UI target |
| --- | --- |
| `primary` | `color="primary" variant="solid"`, amber + `text-ink` |
| `secondary` | `color="neutral" variant="outline"`, canvas + divider border + surface hover |
| `ghost` | `color="neutral" variant="ghost"`, ink + surface hover |
| `danger` | `color="error" variant="solid"`, ข้อความขาว |
| `success` | `color="success" variant="solid"`, ข้อความขาว |

**เกณฑ์ผ่าน:** ตรวจ create/edit form 1 หน้าต่อ role แล้ว normal, invalid, disabled, loading, focus-visible และ `size="xs"` ถูกต้อง

### Phase 3 — กำหนด surface, feedback, table และ overlay defaults

เป้าหมาย: card, feedback และ operational table มี hierarchy เดียวกับ reference โดยไม่เปลี่ยน data behavior

| ไฟล์ | การแก้ละเอียด |
| --- | --- |
| `app/app.config.ts` | เพิ่ม `card`, `badge`, `alert`, `table`, `modal`, `dropdownMenu`, `pagination` theme. Card outline ใช้ canvas/divider/radius panel/shadow panel; table header ใช้ surface และ rows hover เบา; modal ใช้ radius panel, divider และ surface-consistent overlay. Badge/alert map semantic colors ไป soft backgrounds ของ reference. |
| `app/assets/css/main.css` | หลัง table/card slots ใช้งานได้ ย้าย selector `.staff-ui-theme :is(table, ...)` และ selector ที่อิง `rounded-lg`/`rounded-xl` ออก เพื่อให้ทั้งสาม role รับ behavior จาก config เดียว. คง only-browser concern เช่น `scrollbar-gutter` หากยังจำเป็น. |
| `app/components/UI/ConfirmModal.vue` | ตรวจว่า modal base theme ไม่ทำให้ confirmation icon, footer, loading และ focus behavior เสีย; ปรับเฉพาะ spacing/radius ที่ component theme ไม่ครอบ. |
| `app/pages/staff/students.vue` | representative staff table: selection, bulk delete confirm, pagination และ UTable. ลบเฉพาะ local table class ที่ซ้ำกับ global slots; คง `overflow-x-auto`/`min-w-full`. |
| `app/pages/teacher/visits/index.vue` | representative teacher table: filter controls, status badge, pagination และ modal. ยืนยัน teacher ได้ global theme จาก Phase 1. |
| `app/pages/student/applications/index.vue` | representative student table/card/modal: ตรวจ local `:ui` 3 จุดและ row hover override. แทนที่เฉพาะ style ที่ global theme ครอบ; คง modal width และ layout-specific spacing. |
| `app/pages/staff/index.vue` | representative dashboard/card/combobox surface; เทียบ panel shadow/radius กับ reference. |

**เกณฑ์ผ่าน:** table ทุก representative page ยังค้นหา/กรอง/เลือก row/paginate ได้เหมือนเดิม, active/selected/hover ต่างกันชัดเจน และ modal ไม่ overflow บน mobile

### Phase 4 — จัดการ local overrides และข้อยกเว้น

เป้าหมาย: ลดเฉพาะ overrides ที่ขัดกับ global theme โดยคงหน้าเฉพาะทางเป็น exception ที่ชัดเจน

| ไฟล์ | การแก้ละเอียด |
| --- | --- |
| `app/components/App/UserMenu.vue` | เปลี่ยน raw `gray-*`, `red-*`, `bg-white` และ dropdown `:ui` ที่เป็น presentation ทั่วไปเป็น semantic utility/slots เท่าที่ไม่ทำให้ user menu ต่างจาก reference. เก็บ dimension เฉพาะ (`46px`, `255px`) หากเป็น requirement ของ layout. ตรวจ hover, open, keyboard focus และ logout loading. |
| `app/pages/login.vue` | **ไม่เปลี่ยนในแผนนี้**; บันทึกว่าเป็น branded public screen ที่มี raw colors ตั้งใจใช้. หากจะ unify ต้องมี design decision แยกต่างหาก. |
| `app/components/UI/MapPicker.client.vue` | **ไม่เปลี่ยนในแผนนี้**; marker HTML/Leaflet ไม่ได้รับ Nuxt UI theme โดยตรง. |
| `app/pages/student/applications/index.vue` | ทบทวน local `hover:bg-gray-50/60` หลัง table theme เสร็จ; ลบได้เฉพาะเมื่อ global table hover ให้ผล visual เดียวกัน. |
| `app/pages/login.vue` และ `app/components/App/UserMenu.vue` | ระบุเป็น allowlist ของ raw palette ใน audit หลังงาน; ห้ามใช้เป็นข้ออ้างให้ raw palette กระจายเพิ่มในหน้าอื่น. |

**เกณฑ์ผ่าน:** เหลือ raw palette เฉพาะ allowlist ที่มีเหตุผลชัดเจน และไม่มี selector global ที่ต้องเดา DOM ภายในของ Nuxt UI

### Phase 5 — ตัดสินใจเรื่อง `/dev/ui` และ cleanup

เป้าหมาย: `/dev/ui` เป็น reference ที่ตรวจสอบได้ ไม่กลายเป็น design system ซ้ำสองชุด

| ไฟล์ | การแก้ละเอียด |
| --- | --- |
| `app/pages/dev/ui.vue` | เปลี่ยน preview ของ standard controls ไปใช้ Nuxt UI components ที่ได้รับ theme จริง หรือแสดง Nuxt UI และ custom reference แบบเทียบกันช่วงเปลี่ยนผ่าน. เก็บ fixture/table state และ accessibility examples. |
| `app/pages/dev/ui.vue` | ใช้ Nuxt UI และ shared production primitives โดยตรง; logic fixture ที่ใช้ครั้งเดียวให้อยู่ใกล้ showcase แทนการสร้าง utility/component layer เพิ่ม. |

**เกณฑ์ผ่าน:** `/dev/ui` แสดง component ที่ใช้ production จริงเป็นหลัก หรือระบุชัดเจนว่าส่วนใดยังเป็น prototype; ไม่มี component production สองชุดที่มี purpose ซ้ำโดยไม่จำเป็น

## 6. รายการไฟล์ที่ต้องตรวจ แต่ไม่ควรแก้แบบ bulk

ไฟล์เหล่านี้ใช้ Nuxt UI และต้องตรวจ visual regression หลัง global theme แต่ไม่ควรเปิด refactor ถ้าไม่มี discrepancy ที่พิสูจน์ได้:

| กลุ่ม | ไฟล์ |
| --- | --- |
| Staff management | `app/pages/staff/staffs.vue`, `teachers.vue`, `companies/index.vue`, `students.vue`, `notifications/index.vue` |
| Cooperative workspace | `app/pages/staff/cooperative-cycles/index.vue`, `[cycleId].vue`, `[cycleId]/students.vue`, `applications/index.vue`, `applications/[requestId].vue`, `placements.vue`, `supervisors.vue`, `visits.vue`, `evaluations.vue`, `budgets.vue` |
| Student | `app/pages/student/index.vue`, `profile/index.vue`, `placement.vue`, `company-review.vue`, `visits/index.vue`, `notifications/index.vue`, `requests/index.vue`, `requests/[id].vue`, `applications/new.vue`, `applications/[id]/edit.vue`, `applications/[id]/index.vue` |
| Teacher | `app/pages/teacher/index.vue`, `companies/index.vue`, `students/index.vue`, `notifications/index.vue`, `evaluations/companies/index.vue`, `evaluations/students/index.vue` |
| Shared | `app/components/Cycle/StudentsList.vue`, `app/components/UI/ButtonRefresh.vue`, `app/components/UI/ConfirmModal.vue`, `app/components/UI/AccountPasswordModal.vue`, `app/components/App/DashboardNavbar.vue` |

## 7. Verification matrix

หลังแต่ละ phase ให้รัน:

```bash
pnpm typecheck
pnpm build
```

ก่อน merge ของงานเต็ม ให้ตรวจ browser จริง:

| Surface | Staff | Teacher | Student |
| --- | --- | --- | --- |
| Dashboard canvas, navbar, sidebar | required | required | required |
| Button primary/neutral/error + disabled/loading | required | required | required |
| Form input/select/textarea/error/focus | required | required | required |
| Table hover/selected/empty/loading/pagination | required | required | required |
| Modal/confirm + keyboard Escape/focus | required | required | required |
| Narrow viewport sidebar | required | required | required |

สำหรับ screenshot comparison ให้ตรวจอย่างน้อย 1280px และ 390px; ตรวจ long Thai text, empty data,
permission state และ backend error โดยไม่แก้ fixture production เพื่อการทดสอบ UI

## 8. จุดตัดสินใจที่ต้องตอบก่อนเริ่ม Phase 5

1. `/dev/ui` ต้องกลายเป็นหน้า showcase ของ Nuxt UI ที่ใช้จริง หรือคง custom reference components ไว้เป็น prototype?
2. Primary amber ต้องใช้ `#F5B32B` ทุก context รวม login/public page หรือเฉพาะ dashboard?
3. User menu ควรปรับเข้า semantic theme หรือรักษา pixel-specific design ปัจจุบันเป็น exception?
4. ต้องการ dark mode จริงหรือไม่? แผนนี้รองรับ dark sidebar เท่านั้นและไม่เปิด color mode ทั่วแอป

## 9. Rollback และเกณฑ์หยุด

- แยก commit อย่างน้อยตาม Phase 1, 2, 3 และ 4 เพื่อ revert ได้เป็นหน่วย
- หาก representative page ของ role ใดมี contrast, focus, modal overflow, table selection หรือ form sizing regress ให้หยุด phase และแก้ global slot/variable แทนการเติม local override
- ห้ามแก้ business page มากกว่าสาม representative page ใน phase เดียวโดยไม่มี screenshot evidence ว่า global theme แก้ไม่ได้

## 10. สถานะการดำเนินงาน

### สถานะการพัฒนาโค้ด (Implementation)
- [x] สำรวจ token, Nuxt UI usage, local override และ role scope
- [x] ระบุ sidebar hover ต้อง override ผ่าน `UNavigationMenu` slots ไม่ใช่ stylesheet selector
- [x] Phase 1: รวม app-shell theme scope (`app-ui-theme` รองรับ staff, teacher, student เสมอกัน)
- [x] Phase 2: Form/action theme (UButton `rounded-[var(--radius-control)]`, Primary solid `text-ink`, form controls)
- [x] Phase 3: Surface/feedback/table/overlay theme (`card`, `table`, `modal`, `badge`, `alert`, `dropdownMenu`, `pagination`)
- [x] Phase 4: Local override cleanup (`UserMenu.vue` ปรับใช้ semantic tokens, คง layout dimensions, ยกเว้น login/MapPicker)
- [x] Phase 5: ปรับปรุง showcase บน `/dev/ui` ให้แสดง Nuxt UI components กลางสำหรับ production โดยใช้อ็อบเจกต์จำลองแบบ isolated (ไม่เขียน mock user ลงใน shared `useState('current-user')`) และระบุ `variant="solid"` ให้กับ `UAlert` ใน `/login` เพื่อคง branded appearance
- [x] Cleanup: ลบ prototype components ใต้ `app/components/dev-ui/` และ inline pagination fixture logic ที่เคยอยู่ใน `app/utils/dev-ui-table.ts`

### สถานะการตรวจสอบ (Verification Status)
- [x] Automated Typecheck (`pnpm typecheck` ผ่าน 100%)
- [x] Production Build Integration (`pnpm build` ผ่าน 100%)
- [x] Computed Style / Browser Evidence บน `/dev/ui` และ `/login` (ตรวจผ่าน Headless Chrome):
  - `UButton` (Primary, Neutral Outline, Neutral Ghost): คำนวณได้ `border-radius: 10px` (`--radius-control`), Primary solid เป็น amber `#F5B32B` พร้อมข้อความ `#1D1E20`
  - `UAlert`: คำนวณได้ `border-radius: 10px` พร้อม soft backgrounds บน dashboard theme; หน้า `/login` คง `variant="solid"` ชัดเจน
  - `UPagination`: แสดงปุ่มควบคุมที่ได้รับ `border-radius: 10px` จาก theme กลาง
  - `UDropdownMenu` Showcase: แสดงผลเมนูดรอปดาวน์จำลองแบบ isolated ได้ `border-radius: 14px` (`--radius-panel`) และ `shadow-panel` โดยไม่ผูกกับ auth session
- [ ] End-to-End Visual Verification ครบทุก Role-protected pages (`/staff/*`, `/teacher/*`, `/student/*`):
  - *ข้อจำกัดและแนวทางการทดสอบ:* หน้า `/dev/ui` จะไม่ inject session ปลอมลงใน `useState('current-user')` อีกต่อไปเพื่อตัดผลข้างเคียงต่อระบบ session รวม ดังนั้นการทดสอบคอมโพเนนต์ `AppUserMenu` ตัวจริงและหน้าแดชบอร์ดเฉพาะบทบาทต้องกระทำผ่าน authenticated session ที่เข้าสู่ระบบจริงด้วย credentials ของแต่ละ role พร้อมข้อมูล fixture ในฐานข้อมูล
