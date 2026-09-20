# แผนที่ 2 — Teacher UI

## เงื่อนไขก่อนเริ่ม

- แผน Staff ผ่าน Definition of Done ใน `01-staff.md`
- shared theme, `UIButtonRefresh`, modal, table และ app shell ไม่มี blocker ค้าง
- อ่าน handoff จาก Staff และห้ามย้อนเปลี่ยน shared default เพื่อแก้ Teacher หน้าเดียว หาก local layout แก้ได้อย่างเหมาะสม

## เป้าหมายการส่งมอบ

ทำให้ workflow ของอาจารย์ตั้งแต่ดูงานนิเทศ ไปตารางนิเทศ ประเมินนักศึกษา/สถานประกอบการ และดูข้อมูลประกอบ ใช้ pattern กลางเดียวกัน โดยคง assignment, permissions, scoring และ submit behavior เดิม

ทุก phase ต้องใช้ `docs/fix-ui/UI-CONTRACT.md` เป็น acceptance contract และเปรียบเทียบ rendered patterns กับ `/dev/ui`

## ขอบเขตไฟล์

- `app/pages/teacher/index.vue`
- `app/pages/teacher/visits/index.vue`
- `app/pages/teacher/evaluations/students/index.vue`
- `app/pages/teacher/evaluations/companies/index.vue`
- `app/pages/teacher/students/index.vue`
- `app/pages/teacher/companies/index.vue`
- `app/pages/teacher/notifications/index.vue`
- shared components แก้ได้เฉพาะเมื่อพบ regression ที่เกิดจาก contract กลางและมีผลมากกว่าหนึ่งหน้า

## ลำดับการแก้

### Phase 2.0 — Authenticated baseline

1. เปิดทั้ง 7 routes ด้วย Teacher session จริง
2. เก็บ states ที่มี/ไม่มี assignment, scheduled/completed visit และ submitted/unsubmitted evaluation
3. ตรวจ API errors, hydration, console, narrow layout และ long Thai names
4. เทียบ control sizes และ states กับ Staff foundation ไม่เทียบ pixel รายหน้าแบบไร้บริบท

**Checkpoint:** ระบุ Teacher data states ที่ทดสอบได้จริงและ blocker จาก shared foundation

### Phase 2.1 — Landing และ supervision schedule

1. `app/pages/teacher/index.vue`
   - ปรับ filter/refresh และ appointment cards ให้ใช้ semantic surfaces
   - ใช้ `UEmpty` แยกไม่มี assignment จากผลกรองว่าง
2. `app/pages/teacher/visits/index.vue`
   - เป็น representative operational table ของ Teacher
   - ทำ control row, table width/overflow, status badge, pagination และ row actions ให้สอดคล้อง
   - ตรวจ modal บันทึกการนิเทศ, date/time fields, notes, loading และ submit errors
   - native detail table ภายใน modal เปลี่ยนเป็น Nuxt UI เมื่อเป็น tabular data จริงและไม่ทำ behavior หาย

**Checkpoint:** อาจารย์กรอง เปิด และบันทึกงานนิเทศได้ด้วย keyboard/desktop/narrow โดย state ไม่สูญหายเมื่อ mutation ล้ม

### Phase 2.2 — Evaluation workflows

ทำ `students` ก่อน `companies` เพื่อใช้ pattern เดียวกันโดยไม่สร้าง abstraction ก่อนรู้ความต่าง:

1. `app/pages/teacher/evaluations/students/index.vue`
   - ตรวจ list/table, selection target, rubric fields, score calculation, textarea และ submit modal
   - ใช้ `UFormField` เชื่อม label/error; checkbox ต้องมี accessible label
2. `app/pages/teacher/evaluations/companies/index.vue`
   - นำ pattern ที่พิสูจน์แล้วมาใช้ แต่คง rubric/domain labels ของสถานประกอบการ
3. หลังสองหน้าผ่าน ค่อยพิจารณา extraction เฉพาะ markup/logic ที่เหมือนจริงและมี typed contract

**Checkpoint:** score/validation/submission เหมือนเดิม, ไม่มี submit ซ้ำ และสถานะประเมินแสดงด้วยข้อความร่วมกับ semantic color

### Phase 2.3 — Reference data tables

1. `app/pages/teacher/students/index.vue`
   - search/group filter/refresh/table/loading/error/no-results
   - เพิ่ม pagination/page size เฉพาะเมื่อ dataset/API รองรับและมีความจำเป็นจริง
2. `app/pages/teacher/companies/index.vue`
   - ใช้ control/table pattern เดียวกันและ modal detail ที่เป็นมาตรฐาน
3. ทั้งสองหน้าต้องมี action column เฉพาะ action ที่ทำงานจริง ห้ามเพิ่ม placeholder actions

**Checkpoint:** table เต็มพื้นที่, horizontal overflow ปลอดภัย, filters reset/clear ถูกต้อง และไม่มี feature จำลองจาก `/dev/ui`

### Phase 2.4 — Notifications และ consistency pass

1. `app/pages/teacher/notifications/index.vue`
   - ให้สอดคล้องกับ notification pattern ที่ Staff ผ่านแล้ว
2. ค้น raw palettes, native controls และ incidental card wrappers เฉพาะ Teacher
3. แก้เฉพาะ discrepancy ที่มีหลักฐานภาพหรือ accessibility issue

## Verification matrix

- Automated: `pnpm typecheck`, `pnpm build`, `git diff --check`
- Dashboard: assignment filters, empty/error/loading
- Visits: filtering, pagination, modal, mutation feedback, status transitions
- Evaluations: rubric input, validation, computed score, submit/retry, already-submitted state
- Data tables: students/companies search, group filter, detail modal, overflow
- Notifications: unread/read behavior และ keyboard
- Viewports: desktop 1280px และ narrow ประมาณ 390px; ตรวจ browser console หลัง HMR

## เกณฑ์ส่งมอบแผนที่ 2

- Teacher routes ทั้ง 7 ไฟล์ได้รับการตรวจและมีผลการตัดสินใจรายไฟล์
- ไม่มี Teacher-only workaround หลุดเข้า global theme โดยไม่มีเหตุผลร่วม
- workflow นิเทศและประเมินครบตาม behavior เดิม
- ส่ง handoff ระบุ pattern ที่ Student ใช้ต่อได้และ unresolved fixture/data states
- หยุดหลังส่งมอบ ห้ามเริ่ม `03-student.md` โดยอัตโนมัติ
