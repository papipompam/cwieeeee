# แผนส่งมอบการปรับ UI ทั้งระบบ

เอกสารชุดนี้ใช้ส่งงานให้ AI agent ปรับ UI ของระบบ CWIE ให้ยึด `app/pages/dev/ui.vue` เป็น baseline และใช้ Nuxt UI v4 เป็นหลัก โดยรักษา route, API, permission และ business workflow เดิม

ทุกแผนต้องอ่านและผ่าน [`UI-CONTRACT.md`](./UI-CONTRACT.md) ก่อนส่งมอบ Contract นี้กำหนด component sizes, table anatomy, form/overlay patterns และ browser verification ที่ใช้ร่วมกันทั้งสาม actor

## วิธีใช้เอกสารชุดนี้

ทำตามลำดับต่อไปนี้ทีละแผน ห้ามเปิด migration หลาย actor พร้อมกัน:

1. [`01-staff.md`](./01-staff.md) — ล็อก shared foundation และปรับ Staff ซึ่งมี surface มากที่สุด
2. [`02-teacher.md`](./02-teacher.md) — ใช้ foundation ที่ผ่าน Staff แล้วกับ workflow การนิเทศของ Teacher
3. [`03-student.md`](./03-student.md) — ปรับ Student หลัง shared form, table, modal และ shell มีเสถียรภาพแล้ว

แต่ละแผนเป็น delivery gate ของแผนถัดไป Agent ต้องทำเฉพาะแผนที่ผู้ใช้มอบหมาย และหยุดส่งมอบผลเมื่อ checklist ของแผนนั้นครบ ห้ามเริ่มไฟล์ถัดไปหรือ actor ถัดไปเอง

สถานะเริ่มต้นของแผนส่งมอบ:

- [ ] Plan 1 — Staff UI และ Shared Foundation
- [ ] Plan 2 — Teacher UI
- [ ] Plan 3 — Student UI และ Final Cross-role Cleanup

ให้เปลี่ยนสถานะเฉพาะเมื่อผู้ใช้ยืนยันผลส่งมอบของแผนนั้นแล้ว ไม่ถือว่าการแก้โค้ดเสร็จเท่ากับผ่าน delivery gate โดยอัตโนมัติ

## ข้อเท็จจริงจากการสำรวจ

- Stack: Nuxt 4.5.2, Vue 3, TypeScript, Nuxt UI 4.11.1 และ Tailwind CSS 4.3.3
- Staff มี 19 page files, Teacher 7 page files และ Student 12 page files
- Staff มีทั้ง `app/pages/staff/cooperative-cycles/[cycleId].vue` และ `app/pages/staff/cooperative-cycles/[cycleId]/index.vue`; ต้องตรวจ generated Nuxt routes ว่าไฟล์ใดเป็นเจ้าของ route จริงก่อนแก้ ห้ามสมมติจากชื่อไฟล์
- `app/app.config.ts` มี theme กลางสำหรับ button, form controls, card, table, modal, badge, alert, dropdown และ pagination แล้ว แต่ต้องตรวจ contrast, size และ behavior กับหน้าจริง
- `app/assets/css/main.css` มี semantic tokens และ app theme scope แต่ยังมี selector ที่ดัก utility-class combinations เพื่อจำลอง card styling
- prototype components เดิมใน `app/components/dev-ui/` ถูกลบแล้วหลังยืนยันว่าไม่มี runtime consumer; ห้ามสร้าง component layer ชุดนี้กลับมา
- `app/components/Student/ApplicationForm.vue` ยังมี native date input และ local CSS override ขนาดตัวอักษร
- หน้าตารางจำนวนมากใช้ `UTable` แล้ว แต่ card wrapper, empty/error state, control size และ pagination ยังไม่สม่ำเสมอ
- Working tree มีงานค้างอยู่หลายไฟล์ ทุก agent ต้องตรวจ `git status` และ preserve งานเดิมก่อนแก้

## Contract กลางสำหรับทุกแผน

### เป้าหมาย

- ใช้ visual language เดียวกับ `/dev/ui`: Prompt, amber primary, dark ink, semantic surface/divider, control radius และ panel radius
- ใช้ Nuxt UI เป็น primitive หลักและ reuse `UIButtonRefresh`, `UIConfirmModal`, `UIAccountPasswordModal`, `UIMapPicker` และ `useNotify`
- ทำให้ happy, loading, empty, filtered-empty, error, forbidden และ mutation feedback ชัดเจนตามข้อมูลจริงของหน้า
- รองรับ keyboard, focus-visible, accessible names, long Thai text, desktop และ narrow viewport

### ขอบเขตที่ห้ามเปลี่ยนโดยอัตโนมัติ

- ห้ามเปลี่ยน API payload, Prisma schema, auth, permissions, route names หรือ business rules
- ห้ามเพิ่ม dependency หรือสร้าง component system ชุดที่สอง
- ห้ามเพิ่ม row selection หรือ bulk action หากไม่มี mutation จริงรองรับ
- ห้ามสร้าง wrapper component ใหม่ที่ทำหน้าที่ซ้ำกับ Nuxt UI เพียงเพื่อใช้ใน showcase
- ห้ามลบ CSS compatibility selector ก่อนย้าย call sites ที่พึ่ง selector นั้นและตรวจครบทุก actor
- หน้า login และ Leaflet internals ของ MapPicker อยู่นอก role migration เว้นแต่ผู้ใช้ระบุเพิ่ม

## ลำดับการทำงานภายในแต่ละแผน

1. **Preflight** — อ่าน `AGENTS.md`, `docs/fix-ui/UI-CONTRACT.md`, แผน actor ปัจจุบัน, `git status`, diff ที่เกี่ยวข้อง และ official/generated Nuxt UI API ที่ต้องใช้
2. **Baseline** — เปิดหน้าจริงด้วย authenticated role เก็บหลักฐาน desktop/narrow และ console; ระบุ state ที่ข้อมูลทดสอบยังเข้าไม่ถึง
3. **Shared change first** — หากต้องแก้ theme/shared component ให้แก้ขั้นต่ำและตรวจ representative page ก่อนกระจายผล
4. **Migrate by workflow** — ทำไฟล์ตามลำดับในแผน ไม่แก้ทุกหน้าแบบ bulk และไม่เปลี่ยน behavior พร้อม visual structure ในก้าวเดียว
5. **Narrow checks** — ตรวจ interaction ของไฟล์ที่แก้ทันที รวม loading/error/modal/focus/overflow
6. **Actor gate** — รัน automated checks และ visual matrix ของ actor ให้ผ่านก่อนปิดแผน

## มาตรฐาน visual/interaction ที่ต้องรักษา

| Surface | มาตรฐาน |
| --- | --- |
| Page shell | `UDashboardPanel` + `AppDashboardNavbar`; title และ action ใช้งานได้จริง |
| Control row | ใช้ size ตาม `UI-CONTRACT.md`, borderless, responsive, control ที่อยู่แถวเดียวกันสูงเท่ากัน, มี clear filter เมื่อกรองได้ |
| Form | `UForm`/`UFormField`, visible label, inline error, loading/duplicate-submit guard |
| Date | ใช้ Nuxt UI date control เมื่อรองรับ requirement; มี accessible label/name และ format ที่ชัดเจน |
| Table | ใช้ anatomy ใน `UI-CONTRACT.md`: `UCard`, `UTable`, full width, overflow, semantic status และ action column |
| Pagination | แสดงช่วงและจำนวนผลลัพธ์; reset หน้าเมื่อ filter/page size เปลี่ยน; page-size และ pagination ใช้ `md` |
| Overlay | `UModal` ใช้ body/footer slots; destructive/consequential mutation ใช้ `UIConfirmModal` |
| Feedback | `useNotify` สำหรับผล action; validation อยู่ใกล้ field; error state มี retry เมื่อทำได้ |
| Empty state | แยก no-data จาก no-results และใช้ข้อความตาม domain จริง |

## Definition of Done ของทุก actor

- ไม่มี raw palette ใหม่หรือ global selector ที่อิง class combination/DOM ภายใน
- ไม่มี native form control ใหม่โดยไม่มีเหตุผลและ accessibility เทียบเท่า
- ไม่มี action จำลองหรือ UI ที่กดแล้วไม่ทำงานใน production page
- หน้าและ component ที่แก้ผ่าน `pnpm typecheck`, `pnpm build` และ `git diff --check`
- ตรวจ browser console หลัง initial load, interaction และ HMR ของไฟล์ที่แก้
- เปรียบเทียบ rendered page กับ `/dev/ui` และตรวจ dimensions ตาม `UI-CONTRACT.md`
- ตรวจ authenticated desktop อย่างน้อย 1280px และ narrow viewport ประมาณ 390px
- สรุปไฟล์ที่แก้, behavior ที่ยืนยัน, state ที่ทดสอบไม่ได้ และความเสี่ยงที่เหลือ

## การจัดการข้อค้นพบระหว่างทำแผน

- ถ้าพบปัญหา shared ที่บล็อก actor ปัจจุบัน ให้แก้ขั้นต่ำในแผนนั้นและบันทึกผลกระทบต่อ actor ถัดไป
- ถ้าพบปัญหานอก scope ที่ไม่บล็อก ให้บันทึกไว้ใน handoff ห้ามแทรกแก้
- ถ้าแก้ global theme แล้ว representative page ถดถอย ให้หยุดกระจายและแก้ root cause ที่ global config ก่อนเพิ่ม local override
- ถ้าต้องตัดสินใจเรื่อง UX หรือ business meaning ให้หยุดถามผู้ใช้ ห้ามเดาจาก `/dev/ui` ซึ่งเป็นเพียง showcase
