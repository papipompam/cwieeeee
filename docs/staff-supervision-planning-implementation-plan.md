# แผนทำงานเจ้าหน้าที่: กลุ่มนิเทศ ตารางนิเทศ และงบประมาณ

## วัตถุประสงค์

สร้าง workflow ฝั่งเจ้าหน้าที่ให้วางแผนงานนิเทศภายใต้รอบสหกิจได้ครบก่อน: เริ่มจากสถานที่ฝึกงานที่ยืนยันแล้ว, แบ่งเป็นกลุ่มนิเทศ, มอบหมายอาจารย์, สร้างและเผยแพร่ตาราง, และจัดทำแผนเดินทาง/งบประมาณประมาณการ. งานของอาจารย์ในการบันทึกผลนิเทศและประเมินจะเป็นระยะถัดไป โดย schema ที่ออกแบบต้องรองรับโดยไม่ต้องรื้อ flow ของเจ้าหน้าที่.

เอกสารอ้างอิงเชิงธุรกิจคือ `lecturer-supervision-evaluation-budget-scope-and-data.md` ที่ผู้ใช้แนบมา ไม่ใช่คำสั่งที่ให้ execute เพิ่มเติมนอกขอบเขตนี้.

## สัญญาสำหรับ agent

ก่อนแก้ไข ให้ agent อ่าน:

1. `AGENTS.md`
2. เอกสารอ้างอิงข้างต้น
3. `docs/cooperative-cycle-lifecycle-plan.md`
4. `docs/staff-cycle-requests-students-placements-implementation-plan.md`
5. `prisma/schema.prisma`, `server/utils/cycle.ts`, `app/pages/staff/cooperative-cycles/[cycleId].vue`
6. หน้าปัจจุบัน `supervisors.vue`, `visits.vue`, `budgets.vue`, `evaluations.vue`, `placements.vue` และ API placements/teacher ที่มีอยู่

ใช้ conventions เดิม: Nuxt 4, Vue Composition API + TypeScript, Nuxt UI, Prisma/PostgreSQL, `UTable`, `UIButtonRefresh`, `UIConfirmModal`, `useNotify`, semantic colors. ใช้ `web-ui-coding-standards`, `nuxt-ui`, `testing-standards`, และ `ponytail` ตาม AGENTS.md. ไม่เพิ่ม dependency, ไม่ commit/push/deploy, และไม่ลบข้อมูลจริงหรือ auto-merge บริษัทเก่า.

## ข้อเท็จจริงที่ตรวจพบ

- รอบสหกิจ (`CooperativeCycle`) มีสถานะ `OPEN_FOR_APPLICATION`, `APPLICATION_CLOSED`, `IN_PROGRESS`, `CLOSED` และหน้ารอบฝั่ง staff มี context/switcher อยู่แล้ว.
- สถานที่ที่นำไปจัดงานนิเทศได้ควรมาจาก `CooperativeRequest.status = PLACEMENT_CONFIRMED`; หน้าสถานประกอบการของรอบและ API listing มีอยู่แล้ว.
- ปัจจุบัน `SupervisionVisit` เป็น record ราย `studentUserId` ที่เก็บเพียงชื่อบริษัท/อาจารย์เป็นข้อความ จึงไม่รองรับกลุ่มนิเทศ, หลายอาจารย์, สถานะฉบับร่าง, การเผยแพร่, ผู้ร่วมจริง, travel plan หรือ evaluation.
- `supervisors.vue`, `visits.vue`, `budgets.vue`, และ `evaluations.vue` ยังเป็น placeholder; ไม่มี server API สำหรับ staff supervision management.
- `User` ที่เป็นอาจารย์มี `role = TEACHER` และมี API รายชื่ออาจารย์อยู่แล้ว.

## ขอบเขตระยะนี้: เจ้าหน้าที่มาก่อน

### ทำในระยะนี้

1. ครั้งที่นิเทศ, กลุ่มนิเทศ และการมอบหมายอาจารย์ประจำกลุ่ม
2. ตารางนิเทศระดับสถานประกอบการ พร้อมนักศึกษาที่เกี่ยวข้องและอาจารย์ตามแผน
3. draft/publish/reschedule/cancel สำหรับตาราง และ notification เมื่อเผยแพร่หรือเปลี่ยนแปลง
4. แผนเดินทางและงบประมาณประมาณการของกลุ่ม
5. dashboard/สถานะคงค้างของเจ้าหน้าที่ และหน้า evaluations แบบ read-only สำหรับติดตามความพร้อมในอนาคต
6. guard สิทธิ์ `STAFF`, cycle isolation, และ state transition ฝั่ง server

### ไม่ทำในระยะนี้

- หน้าอาจารย์, การบันทึกผลนิเทศ, การยืนยันผู้ร่วมจริง, การประเมินนักศึกษา, และการประเมินสถานประกอบการ
- เบิกจ่ายจริง, เอกสารการเงิน, approval chain, หรือเชื่อมระบบบัญชี
- การ optimize เส้นทางจากแผนที่อัตโนมัติ; staff ระบุลำดับ/ระยะทางเองก่อน
- การเพิ่ม/ลดนักศึกษาเข้ารอบแบบ `CycleEnrollment`
- การ auto-assign กลุ่มหรืออาจารย์โดยอัลกอริทึม

## แบบจำลองข้อมูลที่เสนอ

ใช้ชื่อที่สอดคล้องกับ schema เดิมได้ แต่รักษาความสัมพันธ์และ constraints ต่อไปนี้ไว้. ก่อน migration ให้ตรวจข้อมูล `SupervisionVisit` เดิม และเลือก migration ที่ preserve record เดิมหรือ backfill ได้อย่างชัดเจน; ห้าม drop table/ข้อมูลเงียบ ๆ.

### 1. `SupervisionRound`

แทน “ครั้งที่นิเทศ” และแยกจาก `CooperativeCycle`.

- `cooperativeCycleId`, `visitNo` (เริ่ม 1), `name?`, `status`, timestamps
- unique `(cooperativeCycleId, visitNo)`
- status อย่างน้อย `PLANNING`, `PUBLISHED`, `COMPLETED`; ระยะนี้ staff ใช้ `PLANNING`/`PUBLISHED` เป็นหลัก

### 2. `SupervisionGroup`

กลุ่ม/สายการนิเทศภายใน `SupervisionRound`.

- `supervisionRoundId`, `name`, `note?`, timestamps
- ห้ามมีชื่อกลุ่มซ้ำในครั้งเดียวกัน

### 3. สมาชิกสถานประกอบการของกลุ่ม

จัดกลุ่มจากสถานประกอบการของ placement ที่ยืนยันแล้ว ไม่ใช่จากนักศึกษารายคน.

- เก็บ `supervisionRoundId`, `supervisionGroupId`, `companyId`
- unique `(supervisionRoundId, companyId)` เพื่อบังคับว่า บริษัทหนึ่งอยู่ได้เพียงกลุ่มเดียวในครั้งที่นิเทศเดียวกัน
- แสดงนักศึกษาที่ `PLACEMENT_CONFIRMED` และชี้บริษัทเดียวกันแบบ derived จาก CooperativeRequest/CompanyApplication; ไม่ duplicate รายชื่อนักศึกษาใน group table
- ใช้ company master สำหรับชื่อ/ที่อยู่/พิกัด แต่ตอนสร้างนัดหมายต้องเก็บ snapshot ที่จำเป็นสำหรับประวัติ

### 4. อาจารย์ประจำกลุ่ม

- relation `SupervisionGroupTeacher(groupId, teacherUserId)`
- unique `(groupId, teacherUserId)`
- unique `(supervisionRoundId, teacherUserId)` หรือ validation เทียบ round ผ่าน group เพื่อบล็อกอาจารย์คนเดียวกันอยู่หลายกลุ่มในครั้งเดียวกัน ตามขอบเขตที่แนบ
- ใน UI แสดง workload: จำนวนกลุ่ม, บริษัท, และนักศึกษาที่รับผิดชอบ

### 5. `SupervisionAppointment` (ตารางนิเทศ)

เปลี่ยนแนวคิดจาก record ราย student เป็นนัดหมายหนึ่งแห่งต่อกลุ่ม/ครั้ง.

- `supervisionRoundId`, `supervisionGroupId`, `companyId`
- snapshot: company name/address/province/location/coordinate ที่ใช้งานในวันนัด
- `scheduledAt` และ `period` หรือ `startAt`/`endAt` เลือกเพียงรูปแบบเดียวและใช้ consistently
- `status`: `DRAFT`, `PUBLISHED`, `RESCHEDULED`, `COMPLETED`, `CANCELLED`
- `changeReason?`, `cancelReason?`, `publishedAt?`, timestamps
- unique `(supervisionRoundId, companyId)` เพื่อไม่ให้นัดบริษัทซ้ำในครั้งเดียวกัน
- relation `SupervisionAppointmentStudent` ผูกกับ student/confirmed placement ที่เข้ารับนิเทศ; unique `(appointmentId, studentUserId)`
- relation `SupervisionAppointmentTeacher` สำหรับ “อาจารย์ตามแผน” เท่านั้นในระยะนี้; unique `(appointmentId, teacherUserId)`

นัดหมายต้องเลือกได้เฉพาะบริษัทที่อยู่ใน group เดียวกัน และรายชื่อนักศึกษาต้องเป็นผู้ที่ยืนยัน placement ของบริษัท/รอบนั้น. ค่าเริ่มต้นอาจเสนอรายชื่อจาก group แต่ staff ปรับได้ก่อน publish.

### 6. `SupervisionTravelPlan` และงบประมาณประมาณการ

หนึ่งกลุ่มมีแผนเดินทางได้หลายวัน.

- plan: `supervisionRoundId`, `supervisionGroupId`, `travelDate`, `startLocation`, `fuelRate` default 4, `note?`
- stops: `travelPlanId`, `appointmentId`, `sequence`, `distanceKmFromPrevious`; unique `(travelPlanId, sequence)` และ `(travelPlanId, appointmentId)`
- traveller estimate: `travelPlanId`, `teacherUserId`, `perDiemRate`, `perDiemDays`, `lodgingRate`, `nights`, `personsPerRoom`; unique `(travelPlanId, teacherUserId)`
- คำนวณจากข้อมูลที่เก็บในแผน ไม่คำนวณจาก constant ฝั่ง UI:
  - fuel = total distance × fuel rate
  - per diem = sum(rate × days)
  - lodging = sum(rate × nights ÷ persons per room) ตามกติกาที่ user ยืนยัน; ถ้ากติกาการหารห้องยังไม่ชัด ให้เก็บยอดพักต่อคนที่ staff ระบุแทน และระบุ decision นี้ก่อน implement
  - total = fuel + per diem + lodging
- แสดงจำนวนห้องพักชาย/หญิงจาก gender ของผู้ร่วมทางที่เลือก แต่ไม่อนุมานหรือบังคับ room assignment ที่ละเอียดเกินขอบเขต

## Workflow เจ้าหน้าที่ที่ต้องเกิดจริง

```text
Placement confirmed
  → staff เลือกรอบและสร้าง “ครั้งที่นิเทศ 1”
  → ระบบแสดงบริษัทที่ยืนยันแล้วแต่ยังไม่มีกลุ่มในครั้งนี้
  → staff สร้างกลุ่มและเพิ่มบริษัท
  → staff มอบหมายอาจารย์ประจำกลุ่ม
  → staff สร้างนัดหมายบริษัทในกลุ่ม (draft)
  → staff สร้างแผนเดินทาง/ประมาณการงบ (ถ้าจำเป็น)
  → staff ตรวจ conflict และ publish ตาราง
  → อาจารย์/นักศึกษาเห็นตารางและรับ notification
  → ระยะถัดไป: อาจารย์บันทึกผลจริงและประเมิน
```

### Guards ฝั่ง server

- ทุก endpoint staff ต้อง `requireRole(event, 'STAFF')` และ verify `cycleId`/round/group/appointment อยู่ในสายสัมพันธ์เดียวกัน
- cycle `CLOSED` อ่านได้อย่างเดียว; mutation ถูกปฏิเสธ
- เริ่มสร้างกลุ่มเมื่อรอบมี placement แล้ว; อนุญาตใน `APPLICATION_CLOSED` และ `IN_PROGRESS`; อย่า block เพียงเพราะสถานะไม่ใช่ `IN_PROGRESS`
- ห้ามลบ group ที่มี appointment; ให้ย้าย/ลบนัดหมาย draft ก่อน
- ห้ามแก้/ลบ appointment ที่ `COMPLETED` หรือ `CANCELLED`; reschedule เฉพาะ record ที่ยังไม่ completed และต้องมีเหตุผล
- publish ต้องตรวจ: กลุ่มมีอาจารย์, นัดมีบริษัท/นักศึกษา/อาจารย์, ไม่มี teacher time overlap ใน appointment ที่ publish แล้ว, และไม่มี company ซ้ำ
- เมื่อแก้ appointment ที่ published ให้เก็บ reason + notification ใหม่; อย่าสร้าง record ใหม่จนกว่าจะมี requirement ด้าน audit history เพิ่ม

## หน้าจอ staff ที่ต้องทำ

ใช้ route เดิมใต้ `/staff/cooperative-cycles/:cycleId` เพื่อคง cycle context:

### `/supervisors` — กลุ่มนิเทศและอาจารย์

- navbar “กลุ่มนิเทศและอาจารย์”; primary action “สร้างกลุ่มนิเทศ”
- control row: ครั้งที่นิเทศ, search, จังหวัด, สถานะจัดกลุ่ม, refresh
- sidebar/section “บริษัทยังไม่จัดกลุ่ม” จาก confirmed placements และ table กลุ่มที่มีชื่อกลุ่ม/อาจารย์/บริษัท/นักศึกษา/พื้นที่/สถานะ
- detail drawer/page ของกลุ่ม: เพิ่ม-ย้ายบริษัท, มอบหมายอาจารย์, workload, และลิงก์ไปตาราง/แผนเดินทาง
- action ตรงแถว: “จัดการกลุ่ม”; destructive actions ใช้ `UIConfirmModal`

### `/visits` — ตารางนิเทศ

- control row: ครั้งที่นิเทศ, กลุ่ม, สถานะ, จังหวัด, search, refresh, primary action “สร้างนัดหมาย”
- `UTable`: วันเวลา, กลุ่ม, บริษัท, นักศึกษา, อาจารย์, สถานะ, จัดการ
- create/edit form เริ่มจาก group → company เพื่อไม่ให้เลือกข้อมูลผิด group
- action: บันทึกร่าง, publish, เลื่อนนัด, ยกเลิก, ดูรายละเอียด; ไม่ render action ที่ state ทำไม่ได้
- publish เป็น bulk ได้เฉพาะ draft ที่ผ่าน validation และต้องยืนยันด้วย `UIConfirmModal`

### `/budgets` — แผนเดินทางและงบประมาณ

- control row: ครั้งที่นิเทศ, กลุ่ม, วันที่, refresh, primary action “สร้างแผนเดินทาง”
- `UTable`: วันที่, กลุ่ม, จำนวนจุด, ระยะทางรวม, ค่าน้ำมัน, เบี้ยเลี้ยง, ที่พัก, ยอดรวม, จัดการ
- detail form จัดลำดับนัดหมาย, ระยะทางแต่ละช่วง, อาจารย์ผู้เดินทาง, และอัตราที่ใช้
- แสดง calculation breakdown โปร่งใสและใช้ tabular figures; ยังไม่เรียกว่า “เบิกจ่าย”

### `/evaluations` — ติดตามเท่านั้นในระยะนี้

- ปรับข้อความให้ชัดว่า “ติดตามการประเมิน”
- แสดง empty state ที่ถูกต้องจนกว่าจะทำ phase อาจารย์ หรือแสดง count `ยังไม่เริ่ม` จาก appointment published/completed เท่านั้น
- ไม่มี form กรอกคะแนนหรือ mutation คะแนนโดย staff

### `/` — ภาพรวมรอบ

- เปลี่ยน placeholder 0/0 เป็น summary จริงของ supervision: บริษัทที่ยืนยันแล้ว, ยังไม่จัดกลุ่ม, กลุ่ม, นัด draft/published/completed, แผนเดินทาง, งบประมาณประมาณการ
- ลิงก์ทุก card/filter ต้องพาไปหน้าที่มี filter ทำงานจริง

## Server API ที่เสนอ

วางใต้ `server/api/staff/cooperative-cycles/[cycleId]/supervision/` และใช้ pagination/query validation เสมอ.

```text
GET    summary
GET    rounds
POST   rounds
PATCH  rounds/:roundId

GET    rounds/:roundId/unassigned-companies
GET    rounds/:roundId/groups
POST   rounds/:roundId/groups
GET    rounds/:roundId/groups/:groupId
PATCH  rounds/:roundId/groups/:groupId
POST   rounds/:roundId/groups/:groupId/companies
DELETE rounds/:roundId/groups/:groupId/companies/:companyId
POST   rounds/:roundId/groups/:groupId/teachers
DELETE rounds/:roundId/groups/:groupId/teachers/:teacherId

GET    rounds/:roundId/appointments
POST   rounds/:roundId/appointments
GET    rounds/:roundId/appointments/:appointmentId
PATCH  rounds/:roundId/appointments/:appointmentId
POST   rounds/:roundId/appointments/:appointmentId/publish
POST   rounds/:roundId/appointments/:appointmentId/reschedule
POST   rounds/:roundId/appointments/:appointmentId/cancel
POST   rounds/:roundId/appointments/publish-batch

GET    rounds/:roundId/travel-plans
POST   rounds/:roundId/travel-plans
GET    rounds/:roundId/travel-plans/:planId
PATCH  rounds/:roundId/travel-plans/:planId
DELETE rounds/:roundId/travel-plans/:planId
```

หลีกเลี่ยง generic status endpoint. Endpoint action ต้อง validate transition และ reason ของ reschedule/cancel บน server. ส่ง notification ภายใน transaction เดียวกับ publish/reschedule/cancel เท่าที่ schema notification รองรับ.

## ลำดับ implementation สำหรับ agent

### Phase 0 — สำรวจและ migration design

1. ตรวจ schema/migration ปัจจุบัน, direct usages ของ `SupervisionVisit`, และข้อมูลจริงก่อนแตะ schema
2. สรุป migration path ของ SupervisionVisit เดิมใน PR/รายงาน; ถ้ามีข้อมูลที่ไม่ map ได้ ห้ามลบเอง
3. เพิ่ม enums/models/relations/indexes/constraints ตาม design ที่ยืนยัน และสร้าง migration
4. Verify: `pnpm exec prisma validate`; migration ใช้กับ local DB โดยไม่ทำลาย record เดิม

### Phase 1 — กลุ่มนิเทศและอาจารย์

1. สร้าง staff-only round/group/company/teacher APIs
2. ใช้ confirmed placements เป็น source และ enforce company one group per supervision round ที่ DB
3. ทำ `/supervisors` ให้ครบ create/edit/manage ด้วย UTable
4. Verify: cycle isolation, unauthorized 403, duplicate company/teacher 409, closed cycle mutation blocked

### Phase 2 — ตารางนิเทศและการเผยแพร่

1. สร้าง appointment API/state machine และ student/teacher relations
2. ทำ `/visits` draft/create/edit/publish/reschedule/cancel
3. ตรวจ schedule conflicts และ notification recipient ก่อน publish
4. Verify: publish ปฏิเสธข้อมูลไม่ครบ, overlapping teacher, cancelled visit; student/teacher ที่เกี่ยวข้องเท่านั้นได้รับ notification

### Phase 3 — แผนเดินทางและงบประมาณ

1. สร้าง travel-plan APIs/calculation ฝั่ง server
2. ทำ `/budgets` พร้อม breakdown และ route stop order
3. Verify: อัตรา fuel ถูก snapshot, total calculation ถูกต้อง, plan ไม่ข้าม cycle/group, closed cycle read-only

### Phase 4 — ภาพรวมและ hardening

1. ต่อ summary จริงเข้าหน้ารอบและหน้าติดตาม evaluation
2. ทำ empty/error/loading/pagination/filter/reset ตาม conventions
3. ตรวจ all staff mutation ใช้ server role/state guards และ no client-only assumptions

### Phase 5 — handoff อาจารย์ (ไม่ implement ในงานนี้)

เมื่อ phase เจ้าหน้าที่ใช้งานได้ ค่อยสร้าง teacher APIs/pages สำหรับ actual participants, visit results, completion และ evaluation. ใช้ appointment ที่ completed เป็น permission gate; staff evaluations page เป็น monitoring/export only.

## Test matrix

- บริษัท confirmed เดียวกันถูกเพิ่มสองกลุ่มใน supervision round เดียวกัน → 409 และไม่เกิด membership ซ้ำ
- บริษัทเดียวกันถูกเพิ่มในคนละ supervision round → ได้
- อาจารย์เดียวกันถูกมอบหมายสองกลุ่มใน round เดียวกัน → 409
- group/appointment/travel plan ของ cycle อื่น → 404 ไม่เปิดข้อมูลข้ามรอบ
- publish appointment โดยไม่มี group/company/student/teacher หรือมี time conflict → 400
- publish สำเร็จ → status/notification ถูกต้อง; repeat publish ไม่แจ้งซ้ำ
- reschedule/cancel ไม่มีเหตุผล → 400; completed/cancelled mutate → 400/409 ตาม state
- travel total: distance × stored fuel rate, per diem, lodging และ grand total ถูกต้อง
- `CLOSED` mutation ทุก endpoint → ถูกปฏิเสธ
- UI filter, pagination, clear filter, refresh, loading/error state และ action column ทำงานกับ API จริง

ใช้ test records เฉพาะและ cleanup ใน `finally`; ห้าม script ลบ application/user/company ที่ไม่ใช่ test fixture.

## Definition of done

- เจ้าหน้าที่สามารถทำ flow ตั้งแต่ confirmed placement → group → teacher assignment → draft appointment → publish → travel/budget estimate ได้โดยไม่พึ่งหน้าหรือสิทธิ์อาจารย์
- ทุกข้อมูลอยู่ใต้ cycle + supervision round และ API ป้องกัน cross-cycle access
- ไม่มี placeholder ที่หลอกว่า action ใช้งานได้; ตาราง operational ใช้ `UTable`
- มี migration ที่ตรวจผ่านและไม่ได้ทำลายข้อมูลเดิมเงียบ ๆ
- `pnpm exec prisma validate`, test ใหม่/เดิมที่เกี่ยวข้อง, `pnpm typecheck`, `pnpm build`, และ `git diff --check` ผ่าน

## จุดที่ต้องยืนยันก่อนลงมือ Phase 3

1. ค่าที่พัก “จำนวนคนต่อห้อง” ต้องหารยอดแบบใดเมื่อมีห้องหลายประเภทหรือยอดหารไม่ลงตัว; ระยะนี้ควรใช้ยอดต่อคนที่ staff กำหนด หากยังไม่มีนโยบาย
2. ต้องการให้ teacher เดียวอยู่ได้หลายกลุ่มในครั้งเดียวกันแต่คนละวันหรือไม่; เอกสารปัจจุบันบอกให้ป้องกัน จึงใช้ block ทั้ง round เป็น default
3. คำว่า “สถานประกอบการเดียวกัน” ในการจัดกลุ่มหมายถึง Company master เดียวกัน หรือแยกตามสาขา/สถานที่ปฏิบัติงาน; default ของแผนนี้คือ Company master เดียวกันจนกว่าจะมี branch model ชัดเจน
