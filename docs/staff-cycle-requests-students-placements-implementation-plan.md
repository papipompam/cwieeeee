# แผนทำงาน: เจ้าหน้าที่จัดการคำร้อง รายชื่อนักศึกษา และสถานประกอบการรายรอบ

> **สำหรับ agent ที่รับงานต่อ:** อ่าน `AGENTS.md`,
> [`docs/cooperative-cycle-lifecycle-plan.md`](./cooperative-cycle-lifecycle-plan.md) และเอกสารนี้ก่อนแก้โค้ด
> แผนนี้เป็น implementation contract สำหรับงานสามเมนูแรกภายใต้รอบสหกิจ: คำร้อง,
> รายชื่อนักศึกษา และสถานประกอบการ ห้าม commit, push, deploy หรือขยายไปยังระบบลงทะเบียนเข้ารอบ
> โดยไม่มีคำสั่งเพิ่ม

## 1. เป้าหมายและขอบเขต

ทำให้เจ้าหน้าที่เลือกหนึ่งรอบสหกิจแล้วสามารถทำงานจริงกับข้อมูลของรอบนั้นได้จาก:

```text
/staff/cooperative-cycles/:cycleId/applications  คิวคำร้องและออกหนังสือ
/staff/cooperative-cycles/:cycleId/students      รายชื่อและประวัติการยื่นของนักศึกษา
/staff/cooperative-cycles/:cycleId/placements    สถานที่ฝึกงานที่ยืนยันแล้ว
```

ผลลัพธ์ต้องเป็น flow เดียวที่อ่านง่ายและใช้จำนวนปุ่มน้อย:

```text
นักศึกษายืนยันสถานประกอบการ
  → สร้าง CooperativeRequest: SUBMITTED
  → เจ้าหน้าที่เปิดคำร้องจากตาราง
  → แนบหนังสือในคอลัมน์ “หนังสือ” ของตาราง หรือทำจากหน้ารายละเอียด
  → LETTER_READY
  → นักศึกษาดาวน์โหลดหนังสือและส่งหนังสือตอบรับ
  → เจ้าหน้าที่ตรวจเอกสาร
  → PLACEMENT_CONFIRMED
  → แสดงในเมนู “สถานประกอบการ” ของรอบเดียวกัน
```

### อยู่ใน scope

- API และ UI ฝั่ง `STAFF` สำหรับ read/mutate คำร้องตาม `cycleId`
- แนบหนังสือขอความอนุเคราะห์จากตารางคำร้อง และดาวน์โหลดไฟล์ที่แนบแล้วจากตารางได้ทันที
- หน้ารายละเอียดคำร้องสำหรับการตัดสินใจที่ต้องมีเหตุผล/ยืนยัน
- รายชื่อนักศึกษาตามรุ่นของรอบ พร้อมสถานะการเข้าร่วมแบบ derived และประวัติการสมัคร/คำร้อง
- รายการสถานประกอบการที่ยืนยันแล้วจาก `PLACEMENT_CONFIRMED`
- ตัวเลขจริงใน overview ของรอบสำหรับสามเมนูนี้
- notification ที่เกิดจากการเปลี่ยนงานให้ผู้เกี่ยวข้อง
- validation, ownership/role guard, cycle isolation, file security และ tests ที่เหมาะกับโครงสร้าง repo

### นอก scope (ตัดสินแล้ว)

- **ไม่สร้าง `CycleEnrollment` หรือหน้าลงทะเบียนเข้ารอบ** ในงานนี้
- ไม่ทำอาจารย์นิเทศ ตารางนิเทศ การประเมิน งบประมาณ หรือเอกสารโมดูลอื่น
- ไม่ให้เจ้าหน้าที่แก้ snapshot บริษัท/ตำแหน่งที่มาจากคำร้องโดยอิสระ
- ไม่เพิ่ม library, upload provider, UI framework หรือ icon set
- ไม่เปลี่ยน flow นักศึกษาที่ส่งคำร้องแล้ว เว้นแต่จำเป็นเพื่อให้ notification/ดาวน์โหลดทำงานร่วมกัน

## 2. ข้อเท็จจริงที่ต้องยึด

| เรื่อง | สภาพที่ตรวจพบ | ผลต่อการทำงาน |
| --- | --- | --- |
| รอบสหกิจ | `CooperativeCycle` มี `cohortYear` และสถานะ `OPEN_FOR_APPLICATION`, `APPLICATION_CLOSED`, `IN_PROGRESS`, `CLOSED` | ทุก query/mutation ต้องเริ่มจาก `cycleId` ใน route และตรวจ relation ทาง server |
| ใบสมัคร | `CompanyApplication` ผูกนักศึกษา, บริษัท และรอบ พร้อมสถานะการสมัคร | ใช้เป็นประวัติทุกความพยายามของนักศึกษา รวม rejected/withdrawn |
| คำร้อง | `CooperativeRequest` ผูกกับ `CompanyApplication` แบบ 1:1 และเก็บ snapshot บริษัท, ตำแหน่ง, ที่อยู่, ผู้รับหนังสือ | ใช้เป็น source of truth ของงานเจ้าหน้าที่ ไม่อ่านข้อมูลบริษัทสดมาแทน snapshot |
| หนังสือ | `CooperativeRequest` มี `letterFilePath`, `letterOriginalName`, `letterIssuedAt`; ฝั่งนักศึกษามี endpoint ดาวน์โหลด letter แล้ว | endpoint staff ต้องเขียนข้อมูลชุดเดียวกันและไฟล์หนึ่งต้องอ่านได้ทั้ง staff/student ตามสิทธิ์ |
| เอกสารตอบรับ | `RequestDocument` เก็บ version/status ของไฟล์ที่นักศึกษาส่ง | staff ต้องเห็นฉบับล่าสุดและประวัติใน detail; ไม่เขียนทับไฟล์เดิม |
| UI ปัจจุบัน | workspace และ sidebar มี route แล้ว แต่ applications/placements เป็น placeholder; students แสดงทุกคนในรุ่นโดย filter ใน browser | ต้องแทนที่ด้วย server-filtered data และ `UTable` ตาม convention |
| การเข้ารอบ | ยังไม่มี membership/enrollment table | ใน scope นี้ “มีความเคลื่อนไหวในรอบ” derive จาก application/request; “มีสิทธิ์” คือ user รุ่นเดียวกับ cycle |

## 3. ข้อตัดสินด้านผลิตภัณฑ์

1. คำว่า “คำร้อง” ในเมนู staff หมายถึง `CooperativeRequest` เท่านั้น ไม่เอา `CompanyApplication`
   ทุกสถานะมาปนในคิวเดียวกัน
2. หน้ารายชื่อนักศึกษาแสดง **นักศึกษาที่มีสิทธิ์** ทั้งหมดของรุ่น และเพิ่มคอลัมน์
   `สถานะในรอบ` เพื่อแยก “ยังไม่ยื่น” ออกจาก “มีความเคลื่อนไหวแล้ว” อย่างชัดเจน
3. ประวัติที่เจ้าหน้าที่อยากดูว่า “เคยยื่นที่ไหนบ้าง” แสดงจาก `CompanyApplication`
   ทุก cycle ในหน้า/side panel นักศึกษาหนึ่งคน โดยมีรอบ, บริษัท, ตำแหน่ง, วันที่, สถานะ
   และ request ที่เกี่ยวข้องถ้ามี
4. การแนบหนังสือเป็น action เร็วในตารางคำร้อง เพราะเป็นงานซ้ำบ่อย แต่การส่งกลับแก้ไข,
   ปฏิเสธ และยืนยัน placement ทำจาก detail พร้อม confirmation/reason เพื่อไม่ให้ข้อมูลเสีย
5. เมื่อแนบหนังสือสำเร็จ ระบบเปลี่ยนคำร้องเป็น `LETTER_READY` ใน transaction เดียว และแจ้งนักศึกษา
6. ใช้ไฟล์จริงที่แนบแล้วเป็นต้นทางดาวน์โหลดเสมอ: table ไม่แสดงปุ่ม upload ซ้อนกับปุ่ม download
   ใน row เดียวกัน

## 4. Contract ของข้อมูลและ API

ให้สร้าง API ภายใต้ `server/api/staff/cooperative-cycles/[cycleId]/` เพื่อทำให้ cycle scope
ปรากฏใน contract ไม่ใช้ endpoint รวมแล้ว filter ใน client

### 4.1 Read endpoints

| Endpoint | Response/เงื่อนไข |
| --- | --- |
| `GET requests` | pagination server-side, search, status, classGroup; join request → application → student/company และ latest document |
| `GET requests/:requestId` | detail เต็มรูปแบบ, ตรวจ request อยู่ใน cycle; return snapshot, นักศึกษา, ไฟล์หนังสือ, document history, reasons/timestamps |
| `GET requests/:requestId/letter` | stream หนังสือที่ staff แนบ; staff role + cycle ownership + path safety |
| `GET students` | นักศึกษา active/inactive ของ `cycle.cohortYear`, pagination/search/class group; include derived current-cycle state only |
| `GET students/:studentId/history` | profile พื้นฐาน + application history ทุก cycle + request status/doc summary; ไม่เปิดข้อมูลนักศึกษาคนอื่นให้ STUDENT role |
| `GET placements` | เฉพาะ request `PLACEMENT_CONFIRMED` ใน cycle พร้อม student และ snapshot company/location |
| `GET summary` หรือ extend cycle detail | counts จริง: eligible, with application, submitted request, pending staff work, letter ready, document under review, confirmed placement |

กำหนด query parameter ที่จำเป็นเป็น typed/validated values; ปฏิเสธ `cycleId`, `requestId`, `studentId`,
`page`, `pageSize`, `status` ที่ไม่ถูกต้องด้วย 400 และใช้ default/page-size cap ที่ชัดเจน

### 4.2 Mutation endpoints

| Endpoint | ใช้เมื่อ | สิ่งที่ต้องทำ |
| --- | --- | --- |
| `POST requests/:requestId/letter` | staff แนบหนังสือขอความอนุเคราะห์ | multipart file validation → atomic write metadata/status → notification นักศึกษา |
| `POST requests/:requestId/start-processing` | ต้องการรับเรื่องก่อนออกหนังสือ | `SUBMITTED → STAFF_PROCESSING`; ไม่จำเป็นต้องมีปุ่มถ้า upload ทำ transition นี้ได้เอง |
| `POST requests/:requestId/return` | เอกสารต้องแก้ไข | `DOCUMENT_UNDER_REVIEW → RETURNED_FOR_REVISION`, บังคับ `reason` non-empty, notification |
| `POST requests/:requestId/reject` | คำร้องไม่สามารถดำเนินการต่อ | allowed staff state → `REJECTED`, บังคับ `reason`, confirmation, notification |
| `POST requests/:requestId/confirm-placement` | เอกสารครบและยืนยันสถานที่ | `DOCUMENT_UNDER_REVIEW → PLACEMENT_CONFIRMED`, confirmation, notification |

ห้ามทำ generic `PATCH { status }` ที่ client ส่ง enum ใดก็ได้ ต้องเป็น action endpoint หรือ
shared transition helper ที่ allowlist action ต่อ state อย่างชัดเจน

### 4.3 State policy

```text
SUBMITTED
  → STAFF_PROCESSING            (optional explicit action)
  → LETTER_READY                (เมื่อแนบหนังสือสำเร็จ; อาจข้าม STAFF_PROCESSING)

STAFF_PROCESSING → LETTER_READY
LETTER_READY → DOCUMENT_UNDER_REVIEW  (ฝั่งนักศึกษาอัปโหลด; existing flow)
DOCUMENT_UNDER_REVIEW → RETURNED_FOR_REVISION | PLACEMENT_CONFIRMED | REJECTED
RETURNED_FOR_REVISION → DOCUMENT_UNDER_REVIEW (ฝั่งนักศึกษาอัปโหลดฉบับใหม่)
```

- `DRAFT` ไม่ต้องมี UI/action ใน phase นี้ เพราะ current student flow สร้างคำร้องเป็น `SUBMITTED`
- terminal states: `PLACEMENT_CONFIRMED`, `REJECTED`, `CANCELLED`
- ระบบต้อง reject transition ที่ไม่ตรง state, request ที่อยู่นอกรอบ, และ mutation ของ `CLOSED`
- `APPLICATION_CLOSED` และ `IN_PROGRESS` ยังต้องให้ staff จัดการคำร้อง/เอกสารได้;
  ห้ามใช้ guard ที่อนุญาตเฉพาะ `OPEN_FOR_APPLICATION`

## 5. การออกแบบหน้าและ flow

### 5.1 คิวคำร้อง `/applications`

ใช้ `UTable` และ server pagination; ไม่โหลดทุกคำร้องมา filter ใน browser

คอลัมน์เรียงลำดับ:

| คอลัมน์ | แสดงผล |
| --- | --- |
| เลขที่คำร้อง | `#id`, monospace |
| นักศึกษา | รหัส, ชื่อ, หมู่เรียน; คลิกเปิด history/detail นักศึกษา |
| สถานประกอบการ | snapshot `companyName`, ตำแหน่ง, จังหวัด |
| วันที่ส่ง | `confirmedAt` |
| สถานะคำร้อง | semantic `UBadge` |
| เอกสารตอบรับ | สถานะ/เวอร์ชันล่าสุด หรือ `—` |
| หนังสือ | interaction ตามกติกาด้านล่าง |
| จัดการ | ปุ่ม `ดูคำร้อง` เท่านั้น |

#### คอลัมน์ “หนังสือ” (ข้อกำหนดจากผู้ใช้)

| กรณี | ต้องแสดง |
| --- | --- |
| `letterFilePath` ว่าง และ request อยู่ `SUBMITTED`/`STAFF_PROCESSING` | ปุ่ม `แนบหนังสือ` เปิด file picker โดยตรงใน table row |
| กำลังอัปโหลด | button loading และ disable เฉพาะ row นั้น |
| แนบสำเร็จ | เปลี่ยนเป็น `ดาวน์โหลด` (มีชื่อไฟล์แบบ truncate/tooltip) ทันที และ refresh row/status เป็น `LETTER_READY` |
| `LETTER_READY` ขึ้นไป และมีไฟล์ | ปุ่ม `ดาวน์โหลด` เท่านั้น; การแทนไฟล์ทำใน detail พร้อม confirmation ไม่ใช่ action ซ้อนในตาราง |
| terminal หรือ state ที่ไม่ควรมีไฟล์ | text `—` หรือ download หากมีไฟล์อยู่แล้ว; ไม่เสนอ upload ใหม่ |

การเลือกไฟล์ต้องใช้ input ที่มี label/accessibility name แม้ถูกซ่อน visually. ก่อนส่ง client
ตรวจเฉพาะ feedback เร็ว (PDF, max size) แต่ server เป็นผู้ตรวจจริง. ห้าม optimistic เปลี่ยนสถานะ
จน upload และ transaction สำเร็จ. หาก fail ให้คง row/state เดิมและ toast error ที่ actionable.

control row มี search, filter status, filter หมู่เรียน, clear filter, `UIButtonRefresh`; reset page
เมื่อ filter เปลี่ยน. Footer แสดง range/total และ `UPagination`.

### 5.2 รายละเอียดคำร้อง

route แนะนำ: `/staff/cooperative-cycles/:cycleId/applications/:requestId` หรือ detail modal
แบบ full-page. ให้เลือก full-page หากต้องแสดง file history/reasons/timeline มากกว่า table; ใช้ route
ชัดเจนและ backlink กลับคิวพร้อม filter ที่ยังใช้ได้.

ส่วนที่ต้องเห็น:

- header: รหัสคำร้อง, ชื่อนักศึกษา, badge status, action ที่ current state อนุญาต
- snapshot สถานประกอบการ/ตำแหน่ง/ผู้รับหนังสือ/ที่อยู่
- วันที่และหมายเหตุนักศึกษา
- หนังสือที่ staff แนบ: ชื่อ, วันที่, download
- หนังสือตอบรับของนักศึกษา: latest version, status, download, และ version history
- timeline จาก timestamps ที่มีจริง; ห้าม fabricate event ที่ schema ไม่เก็บ
- reason ของ returned/rejected

ใช้ `UIConfirmModal` สำหรับ confirm placement, reject และการแทนหนังสือ; validation reason
ให้แสดง inline ใกล้ textarea ไม่ใช้ toast แทน field error. action หนึ่งกำลังทำงานต้อง loading
และกันกดซ้ำ.

### 5.3 รายชื่อนักศึกษา `/students`

แสดง user ที่ `role = STUDENT` และ `cohortYear = cycle.cohortYear` จาก API server-side.
ไม่ได้หมายถึงคนที่ “ลงทะเบียน” และต้องใช้ label ที่ตรงว่า `นักศึกษาที่มีสิทธิ์ในรอบ`.

เพิ่มคอลัมน์:

| คอลัมน์ | Derived value ในรอบที่เลือก |
| --- | --- |
| สถานะในรอบ | `ยังไม่ยื่น`, `กำลังสมัคร`, `รอยืนยันสถานประกอบการ`, `ส่งคำร้องแล้ว`, `รอเอกสาร`, `ยืนยันสถานที่แล้ว`, `ไม่ดำเนินการต่อ` |
| สถานประกอบการล่าสุด | ชื่อจาก request snapshot ก่อน; ถ้าไม่มีใช้ application company; ถ้าไม่มีทั้งคู่เป็น `—` |
| การดำเนินการ | `ดูประวัติ` ปุ่มเดียว |

mapping ให้เขียนและใช้ร่วมกันใน server (ไม่ derive คนละแบบบนหน้า overview/table):

```text
ไม่มี application                         → ยังไม่ยื่น
application active                        → กำลังสมัคร
application ACCEPTED                      → รอยืนยันสถานประกอบการ
request SUBMITTED/STAFF_PROCESSING        → ส่งคำร้องแล้ว
request LETTER_READY/RETURNED...          → รอเอกสาร
request DOCUMENT_UNDER_REVIEW             → รอตรวจเอกสาร
request PLACEMENT_CONFIRMED               → ยืนยันสถานที่แล้ว
application REJECTED/WITHDRAWN และไม่มี request → ไม่ดำเนินการต่อ
```

เมื่อมีข้อมูลขัดกัน ให้ request ล่าสุดของ cycle มีลำดับสูงกว่า application เพราะเป็น snapshot
ที่เจ้าหน้าที่กำลังทำงานอยู่. ระบุ priority นี้ใน test.

### 5.4 ประวัตินักศึกษา

ทำ full page หรือ side panel ที่อ่านง่าย โดยแบ่งเป็น:

1. สรุปในรอบที่กำลังเลือก
2. ประวัติการสมัครทุก cycle: รอบ, บริษัท, ตำแหน่ง, วันที่สมัคร, badge สถานะ
3. คำร้องที่ผูกกับแต่ละ application: เลขที่คำร้อง, status, วันที่ยืนยัน และลิงก์เปิดคำร้อง

ลำดับ history: cycle ล่าสุดก่อน แล้ว application `updatedAt` ล่าสุดก่อน. แสดง empty state ว่า
`ยังไม่มีประวัติการยื่นสถานประกอบการ` ไม่สร้าง placeholder record.

### 5.5 สถานประกอบการ `/placements`

ใช้ request `PLACEMENT_CONFIRMED` เท่านั้น ไม่ให้ staff สร้าง placement record แยก.
ตารางมี: นักศึกษา, บริษัท/sาขาที่ฝึก, ตำแหน่ง, จังหวัด, วันที่ยืนยัน, การดำเนินการ `ดูคำร้อง`.
หน้าอ่านอย่างเดียวใน phase นี้ เพื่อส่งต่อ module อาจารย์นิเทศภายหลัง.

### 5.6 Overview รอบ

แทนตัวเลข hard-coded ด้วย API summary จริง และให้ card/task link ไปยัง route ที่มี filter
ตัวอย่าง `คำร้องรอตรวจสอบ` → `applications?status=DOCUMENT_UNDER_REVIEW`.
ห้ามแสดง `0` placeholder หาก API ยังไม่พร้อม; ให้ทำ API ก่อน UI metrics.

## 6. ความถูกต้อง ความปลอดภัย และ file handling

### Guard ที่ต้องมีทุก mutation/read sensitive

1. `requireRole(event, 'STAFF')`
2. parse/validate `cycleId` และ record ID
3. query request/application ผ่าน relation `application.cooperativeCycleId = cycleId` ใน server
4. ตรวจ cycle exists และไม่เป็น `CLOSED` ก่อน mutation
5. ตรวจ state transition ที่ action ขอทำ
6. read/write file ต้อง validate path อยู่ใต้ configured storage directory; ห้าม trust client path/name

### Upload หนังสือของ staff

- อนุญาต PDF เท่านั้น เว้นแต่ user เปลี่ยน requirement ภายหลัง
- จำกัดขนาดเดียวกับ policy เอกสารปัจจุบัน (10 MB) หรือทำ constant shared ใน server หากมีใช้ซ้ำจริง
- ตรวจ extension + MIME + PDF magic bytes `%PDF-`
- สร้างชื่อไฟล์ฝั่ง server; ไม่ใช้ filename จาก client เป็น path
- เขียน metadata และเปลี่ยน status ใน transaction; หาก DB transaction fail ต้องลบไฟล์ที่เพิ่งเขียน
- หากทดแทนไฟล์ใน detail ให้เก็บไฟล์เดิม/metadata หรือกำหนด deletion ที่ recoverable ก่อนลงมือ;
  phase แรกไม่ต้องรองรับการทดแทนจาก table
- download response ต้องส่ง content type, `Content-Disposition`, file-not-found handling และ role/cycle guard

### Concurrency

- upload ซ้ำจาก double-click ต้องถูกกันด้วย UI loading และ server state check
- status mutation ต้อง re-check state ใน transaction; ถ้า stale ให้ตอบ 409/400 ที่สื่อว่าให้ refresh
- ห้าม update file metadata หรือ status แบบแยก request ที่ทำให้ `LETTER_READY` แต่ไม่มีไฟล์ หรือมีไฟล์แต่ยังเป็น `SUBMITTED`

## 7. ลำดับ implementation ที่ agent ต้องทำ

### Phase 0 — สำรวจและกำหนด seam

1. อ่าน `AGENTS.md`, skill `web-ui-coding-standards`, `testing-standards`, และ Nuxt/Nuxt UI docs ตามความเกี่ยวข้อง
2. อ่าน student request upload/download handlers, schema และ workspace shell ก่อนเลือก API contract
3. ตรวจ `git status`; preserve shared dirty changes; จำกัด diff ใน staff-cycle scope
4. ตัดสินชื่อ route detail และเขียนลงใน implementation note/plan ก่อนทำ UI

**ผ่านเมื่อ:** agent ระบุ endpoint/file ที่ใช้ซ้ำได้ และไม่มี assumption เรื่อง storage/status โดยไม่ตรวจ code.

### Phase 1 — Shared server policy และ read APIs

1. สร้าง helper เล็กที่สุดที่ reuse จริงสำหรับ parse cycle, verify staff cycle scope และ request lookup
2. ทำ list/detail/history/placements/summary APIs พร้อม pagination/filter/role guard
3. ทำ state-to-display mapping server-side สำหรับ student list
4. ทำ response types ที่ public boundary; หลีกเลี่ยง `any`

**ผ่านเมื่อ:** direct API request ที่ cycle/record ไม่สัมพันธ์กันถูกปฏิเสธ และ counts/list ไม่ปนหลายรอบ.

### Phase 2 — คิวคำร้องและการแนบหนังสือ

1. แทน placeholder applications page ด้วย `UTable`, filters, pagination, loading/error/empty states
2. เพิ่ม table file action ตาม section 5.1 โดย reuse `UIButtonRefresh` และ `useNotify`
3. ทำ staff letter upload/download API พร้อม validation/cleanup/transaction
4. หลัง upload สำเร็จ refresh row/list และแจ้งนักศึกษา; ตรวจว่านักศึกษาดาวน์โหลดไฟล์เดียวกันได้

**ผ่านเมื่อ:** staff แนบ PDF จาก row ได้, row เปลี่ยนเป็นดาวน์โหลด, student เห็น `LETTER_READY` และดาวน์โหลดได้.

### Phase 3 — รายละเอียดและ transition ที่มีผลสำคัญ

1. ทำ detail view/link จาก table
2. แสดง snapshot/document history และ download ที่ role-appropriate
3. ทำ return/reject/confirm-placement actions พร้อม reason/confirmation/notification
4. ทำ cycle `CLOSED` read-only UI และ server guard

**ผ่านเมื่อ:** action ที่ไม่ถูก state, ไม่มี reason หรืออยู่คนละ cycle ทำไม่ได้ทั้ง UI และ API.

### Phase 4 — นักศึกษาและสถานประกอบการ

1. เปลี่ยน students page ให้ใช้ cycle-scoped API แทน client filter ทุก user
2. เพิ่ม derived state, latest company และ student history view
3. แทน placements placeholder ด้วย confirmed placement table/read-only detail link
4. เปลี่ยน overview counts/tasks เป็นข้อมูลจริงและ links ที่ filter ได้

**ผ่านเมื่อ:** staff เปลี่ยน cycle แล้วรายชื่อ, history context, คำร้อง, placements และ counts เปลี่ยนตามรอบ.

### Phase 5 — Quality pass

1. ตรวจ narrow/wide table overflow, empty/error/loading states, keyboard file picker, button labels และ focus
2. รัน tests ที่เพิ่ม, `pnpm typecheck`, `pnpm build`, `git diff --check`
3. ตรวจ final diff ว่าไม่มีการแก้ student flow/schema/migration ที่ไม่จำเป็น

**ผ่านเมื่อ:** checks ผ่านและ final handoff ระบุ flow ที่ทดสอบจริง รวมถึงข้อจำกัดที่ยังไม่ได้ทดสอบ.

## 8. Test matrix ขั้นต่ำ

ให้เลือก test seam ที่มีอยู่ใน repo; ถ้าไม่มี framework test ที่ปลอดภัย ให้เพิ่ม regression test
ขนาดเล็กที่สุดในระดับ server helper/handler หรือรายงานข้อจำกัดอย่างชัดเจน ห้ามใช้ script ที่ลบข้อมูลจริง

| กรณี | ผลที่ต้องตรวจ |
| --- | --- |
| list requests cycle A | ไม่มี request cycle B ปน |
| open request A ผ่าน URL cycle B | 404/403, ไม่คืนข้อมูล |
| staff upload PDF ถูกต้อง | มี metadata/file, status เป็น `LETTER_READY`, student notification เกิด |
| upload MIME/extension/magic bytes ไม่ตรง | 400, ไม่เหลือ file metadata หรือ orphan file |
| upload ซ้ำ/stale status | ไม่ทำให้ file/status ไม่สอดคล้อง และไม่เขียนผลลัพธ์ซ้ำ |
| download letter | เจ้าของ student และ staff ใน cycleเข้าถึงได้; role อื่น/record คนละ cycle ไม่ได้ |
| return/reject ไม่มี reason | validation error และ state เดิม |
| confirm placement | record เข้า list placements ของ cycle เดียวเท่านั้น |
| student derived state | request latest override application; ผู้ไม่เคยยื่นเป็น `ยังไม่ยื่น` |
| history | รวม application rejected/withdrawn และ request ที่เกี่ยวข้อง ข้ามหลาย cycleอย่างถูกต้อง |
| closed cycle mutation | server ปฏิเสธ; UI ไม่แสดง action mutation |

## 9. Code-quality checklist

- ใช้ Vue `<script setup lang="ts">`, Composition API, typed interfaces ที่ API boundary
- ใช้ `UTable`, `UDashboardNavbar`, `UIButtonRefresh`, `UIConfirmModal`, `useNotify`, semantic color/token ที่มีอยู่
- ห้าม raw palette, browser `confirm`, generic status editor, hidden-only action หรือ endpoint ที่ client ระบุ owner/cycle เอง
- user-triggered mutation ทุกตัวมี `try/catch`, loading state, duplicate-submit guard และ refresh/reconcile หลังสำเร็จ
- API ownership/role/cycle checks อยู่ server เสมอ; UI hiding ไม่ใช่ authorization
- ใช้ transaction เมื่อเปลี่ยน status พร้อม file metadata/notification; cleanup file เมื่อ transaction fail
- ไม่ refactor unrelated pages, ไม่เพิ่ม dependency, ไม่ commit generated `.output`/`.nuxt`
- ใช้ current official Nuxt/Nuxt UI/Prisma docs ก่อนเลือก API/component ที่ไม่แน่ใจ

## 10. Definition of done และ handoff

งานเสร็จเมื่อเจ้าหน้าที่สามารถ:

1. เลือกรอบแล้วเห็นเฉพาะคำร้องของรอบนั้น
2. แนบ PDF หนังสือจากคอลัมน์ในตาราง และดาวน์โหลดไฟล์ที่แนบได้ทันที
3. ส่งหนังสือให้นักศึกษาและให้นักศึกษาดาวน์โหลด/ส่งเอกสารตอบรับต่อใน flow เดียวกัน
4. ตรวจเอกสาร ส่งกลับแก้ไข ปฏิเสธ หรือยืนยันสถานที่ได้อย่างมี reason/confirmation ตามความเสี่ยง
5. ดูรายชื่อนักศึกษาของรุ่นพร้อมสถานะในรอบ และเปิดประวัติว่าเคยยื่นบริษัทใด/สถานะอะไรได้
6. ดู placements ที่ยืนยันแล้วโดยไม่สร้าง record ซ้ำ
7. เปลี่ยน cycle แล้วข้อมูลไม่ปน และ `CLOSED` เป็น read-only

handoff ต้องสรุปไฟล์ที่เปลี่ยน, flow ที่ทำจริง, commands/checks ที่รันและผล, migration (ถ้ามี),
รวมถึงสิ่งที่ยังไม่ทดสอบ. ห้ามกล่าวว่า browser/API integration ผ่านหากยังไม่ได้รันจริง.
