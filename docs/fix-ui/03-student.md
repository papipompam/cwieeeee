# แผนที่ 3 — Student UI

## เงื่อนไขก่อนเริ่ม

- แผน Staff และ Teacher ผ่าน Definition of Done
- shared theme/control/modal/table patterns เสถียรและไม่มี global regression ค้าง
- มี Student session และข้อมูลที่ครอบคลุมก่อนสมัคร, draft, submitted, confirmed/rejected/cancelled เท่าที่ระบบรองรับ

## เป้าหมายการส่งมอบ

ทำให้เส้นทางของนักศึกษาตั้งแต่ดูภาพรวม สมัครสถานประกอบการ ติดตามคำร้อง ดูสถานที่/ตารางนิเทศ และรีวิว ใช้ Nuxt UI และ semantic theme อย่างสม่ำเสมอ โดยรักษาข้อมูลที่ผู้ใช้กรอกและ state machine เดิม

ทุก phase ต้องใช้ `docs/fix-ui/UI-CONTRACT.md` เป็น acceptance contract และเปรียบเทียบ rendered patterns กับ `/dev/ui`

## ขอบเขตไฟล์

### Shared Student workflow components

- `app/components/Student/ApplicationForm.vue`
- `app/components/UI/MapPicker.client.vue` เฉพาะ Nuxt UI wrapper/accessibility; ไม่ refactor Leaflet internals
- `app/components/App/StudentProfileModal.vue`

### Student pages

- `app/pages/student/index.vue`
- `app/pages/student/applications/index.vue`
- `app/pages/student/applications/new.vue`
- `app/pages/student/applications/[id]/index.vue`
- `app/pages/student/applications/[id]/edit.vue`
- `app/pages/student/requests/index.vue`
- `app/pages/student/requests/[id].vue`
- `app/pages/student/placement.vue`
- `app/pages/student/visits/index.vue`
- `app/pages/student/company-review.vue`
- `app/pages/student/profile/index.vue`
- `app/pages/student/notifications/index.vue`

## ลำดับการแก้

### Phase 3.0 — Student state baseline

1. เปิดทั้ง 12 routes ด้วย Student session
2. ระบุ state machine ของ application/request จาก source/API ก่อนเปลี่ยน UI
3. เก็บ baseline: ไม่มีรอบ, สมัครได้/ไม่ได้, draft, pending, confirmed, rejected, cancelled, no placement, no visits
4. ตรวจว่าหน้าใดเป็น alias/legacy flow และห้ามรวม route โดยไม่มี requirement

**Checkpoint:** มี mapping ระหว่างสถานะจริงกับ label/badge/action ที่หน้าแสดง และรู้ state ที่ fixture ยังไม่ครอบคลุม

### Phase 3.1 — Shared application form ก่อน pages

1. `app/components/Student/ApplicationForm.vue`
   - เปลี่ยน sections เป็น Nuxt UI form/card primitives โดยคง form model และ submit payload
   - ใช้ `UFormField` กับทุก field ที่แก้; visible label/help/error เชื่อมกับ control
   - เปลี่ยน native date input เป็น Nuxt UI date control เมื่อรองรับค่าที่ API ต้องการ; ตรวจ timezone/serialization ก่อนและหลัง
   - ลบ broad scoped typography overrides ทีละส่วนหลัง components แสดงขนาดถูกต้อง
   - native company-option buttons คงได้ถ้าเป็น accessible listbox/selection ที่ behavior ครบ หรือเปลี่ยนเป็น Nuxt UI componentที่เหมาะสม
2. `UIMapPicker.client.vue`
   - ตรวจ label, coordinates input, geolocation/loading/error และ keyboard ของ wrapper
   - ไม่เปลี่ยน Leaflet marker/icon implementationเพียงเพื่อ visual alignment
3. ตรวจ form ใน embedded modal, new page และ edit pageทั้งสาม context

**Checkpoint:** input values, validation, date, map coordinates, cancel/submit และ retry ไม่สูญหาย; ไม่มี CSS override กว้างที่บิด typography

### Phase 3.2 — Application workflow

1. `app/pages/student/applications/index.vue`
   - เป็นหน้าหลักของ flow: ลด raw gray/white palette เป็น semantic tokens
   - ใช้ Nuxt UI card/table/modal ตามชนิดข้อมูลโดยไม่ฝืนทุก section ให้เป็น table
   - รักษา featured application, documents, status actions และ embedded form modal
2. `app/pages/student/applications/new.vue`
   - page shell + eligibility warning + shared form
3. `app/pages/student/applications/[id]/edit.vue`
   - permission/can-edit state + shared form
4. `app/pages/student/applications/[id]/index.vue`
   - detail/status timeline/documents/actions/confirm modals
   - เปลี่ยน incidental rounded wrappers เป็น `UCard` เมื่อ slot structure ช่วยจริง

**Checkpoint:** create/edit/view/cancel/confirm workflow ทำงานครบ, action visibility ตรง permission/status และ modal ไม่ overflow บน narrow viewport

### Phase 3.3 — Request workflow

1. `app/pages/student/requests/index.vue`
   - search/filter/refresh/table/full width/status badges/actions
   - native file input คงได้เมื่อ upload requirement ต้องใช้ พร้อม label, accept และ feedback
2. `app/pages/student/requests/[id].vue`
   - detail state, documents/upload, timeline และ modal interactions
3. ตรวจความซ้ำกับ Applications ในระดับ UX เท่านั้น ห้ามรวม data model หรือ routes ใน UI migration

**Checkpoint:** list/detail/upload/action states ใช้งานเดิมครบและ filtered-empty แตกต่างจาก no-data

### Phase 3.4 — Student dashboard และ supporting pages

ทำตามลำดับ:

1. `app/pages/student/index.vue`
   - dashboard cards, next action, loading/error และ status summary
2. `app/pages/student/placement.vue`
   - placement summary และ no-placement/error states
3. `app/pages/student/visits/index.vue`
   - `UTable`, status/date display, empty/error และ refresh
4. `app/pages/student/company-review.vue`
   - rating control ต้องรักษา radio semantics, keyboard และ selected state
   - textarea validation/loading/submit feedback
5. `app/pages/student/profile/index.vue`
   - profile fields, edit/save state, validation และ loading skeleton
6. `app/components/App/StudentProfileModal.vue`
   - ใช้ normal UModal body/footer structure; ตรวจ global modal styling, loading/error และ update action
7. `app/pages/student/notifications/index.vue`
   - ใช้ notification pattern ที่ Staff/Teacher ผ่านแล้ว

**Checkpoint:** supporting routes ใช้ shared states/patterns โดยไม่มี duplicate visual system และ critical action ทุกจุดมี feedback

### Phase 3.5 — Final cross-role cleanup

1. ค้น raw palette, native controls, local style blocks และ compatibility selectors ในไฟล์ที่ครบทั้งสามแผน
2. ลบ `main.css` monkey-patch เฉพาะเมื่อทุก call site ถูกย้ายและ visual regression ผ่าน
3. ยืนยันว่าไม่มีการสร้าง prototype wrapper ใต้ `app/components/dev-ui/` กลับมา
4. ทำ cross-role screenshot comparison ของ shell, forms, tables, overlays และ feedback

## Verification matrix

- Automated: `pnpm typecheck`, `pnpm build`, `git diff --check`
- Application form: normal/invalid/company select/date/map/loading/server error/new/edit/embedded
- Application/request: empty/data/filter/detail/documents/actions/confirm/error
- Student dashboard/placement/visits: loading/error/empty/data
- Review: keyboard rating, validation, duplicate-submit guard, success/error feedback
- Profile/modal/notifications: focus, responsive overflow, unread/update behavior
- Viewports: desktop 1280px และ narrow ประมาณ 390px; browser console และ HMR

## เกณฑ์ส่งมอบแผนที่ 3

- Student routes ทั้ง 12 ไฟล์และ shared Student componentsได้รับการตรวจรายไฟล์
- status/action mapping ตรงกับ business state เดิมและไม่มีข้อมูลที่กรอกสูญหาย
- ทั้งสาม actor ผ่าน cross-role visual/interaction verification
- compatibility CSS หรือ cleanup ที่ยังเหลือมี evidence และ next action ชัดเจน
- ส่ง final handoff สรุปไฟล์ที่แก้, checks, screenshots/states, unresolved risks และสิ่งที่ตั้งใจไม่แก้
