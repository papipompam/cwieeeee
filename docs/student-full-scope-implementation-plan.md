# แผนดำเนินงานฝั่งนักศึกษาแบบครบขอบเขต

> **สำหรับ agent ที่รับงานต่อ:** อ่านเอกสารนี้พร้อม `AGENTS.md` ก่อนเริ่มงานเสมอ เอกสารนี้เป็น
> implementation contract ของงานฝั่งนักศึกษา โดยยึด requirement จาก
> [`student-scope-and-data.md`](/Users/jirayu/Downloads/student-scope-and-data.md) เป็นหลัก
> ไม่ยึดข้อจำกัดของ implementation, schema, route หรือสถานะที่มีอยู่ในปัจจุบัน

## 1. เป้าหมายและอำนาจของแผน

สร้างพื้นที่นักศึกษาที่รองรับวงจรสหกิจศึกษาตั้งแต่การเข้าสู่ระบบ การสมัครสถานประกอบการ
การยืนยันสถานที่ การจัดการเอกสาร จนถึงการดูตารางนิเทศและการแจ้งเตือน โดยนักศึกษาเห็นและ
จัดการได้เฉพาะข้อมูลของตนเอง

แผนนี้อนุญาตให้ agent ปรับ UI, route, API, Prisma schema, migration และ test ที่จำเป็นเพื่อให้
บรรลุผลลัพธ์นี้ได้ และ **อนุญาตให้ลบ/แทนที่ flow นักศึกษาปัจจุบันทั้งหมด** รวมถึงข้อมูลทดลอง,
route contract, enum, API และ component ที่ใช้เฉพาะ flow เดิม ไม่ต้องทำ data migration หรือ
backward-compatible adapter ให้ของเดิม เว้นแต่ code/ตารางนั้นถูกใช้ร่วมกับ staff หรือ teacher;
ต้องตรวจ usage ก่อนลบและเปลี่ยนเฉพาะ dependency ร่วมนั้นอย่างปลอดภัย ห้าม commit, push, deploy,
หรือเปลี่ยนความหมายของสิทธิ์ staff/teacher โดยไม่มีคำสั่งเพิ่มเติม

## 2. แหล่งความจริงและข้อขัดกันที่ตัดสินแล้ว

ลำดับความสำคัญคือ:

1. `AGENTS.md` และคำสั่งล่าสุดของผู้ใช้
2. เอกสารขอบเขตนักศึกษาใน Downloads ที่ระบุด้านบน
3. เอกสารนี้
4. โค้ดและแผนเดิมใน repository

`docs/student-application-plan.md` เป็นแผนระยะแรกที่ตั้งใจจำกัด workflow ไว้เพียงสมัคร,
คำร้อง และเอกสารหนึ่งชุด จึง **ไม่ใช่** specification หลักของงานนี้อีกต่อไป ให้ใช้เป็นข้อมูล
ประกอบเฉพาะเพื่อค้นหา code เก่าที่ต้องลบ ไม่ใช่เพื่อรักษา behavior เดิม

### ข้อตัดสินเชิงผลิตภัณฑ์

- ใช้ full-page form สำหรับเพิ่ม/แก้ไขรายการสมัครที่ `/student/applications/new` และ
  `/student/applications/:id/edit` เพื่อรองรับข้อมูลจำนวนมากและ mobile ได้ชัดเจน
- หน้า detail ของ application, request, document, placement และ visit แยกหน้าที่ชัดเจน
  แต่ cross-link หากันได้; ไม่รวมทุก action ในตารางเดียว
- หน้าสมัครหนึ่งรายการยังคงเป็นต้นทางของคำร้อง แต่เมื่อยืนยันข้อมูลและสร้างคำร้องแล้ว
  application จะถูกล็อกเพื่อรักษา snapshot ที่ส่งให้เจ้าหน้าที่
- นักศึกษาลบได้เฉพาะ application ที่ `REJECTED` ตาม scope ที่แนบ; การลบต้องยืนยัน
  และไม่มี action delete สำหรับสถานะอื่น
- การยืนยัน application ที่ได้รับตอบรับต้องสร้าง request และ notification ให้เจ้าหน้าที่ใน
  transaction เดียวกัน หรือ rollback ทั้งหมด

## 3. ผลลัพธ์ที่ผู้ใช้ต้องเห็น

นักศึกษาที่ผ่านการเข้าสู่ระบบสามารถ:

1. ดูงานถัดไปและสถานะทั้งหมดจากหน้า overview
2. สร้าง application ที่กำลังดำเนินการได้ครั้งละหนึ่งรายการ
3. ติดตาม/แก้ไข/ยกเลิก application ได้ตามสถานะ
4. ยืนยันสถานประกอบการที่ตอบรับเพื่อส่งต่อให้เจ้าหน้าที่
5. ติดตาม request, ดาวน์โหลดหนังสือ, และอัปโหลดเอกสารฉบับใหม่เมื่อถูกส่งกลับ
6. ดู placement ที่เจ้าหน้าที่รับรองแล้ว, ตารางนิเทศ, และ notifications
7. ดูข้อมูลบัญชีของตนและเปลี่ยนรหัสผ่านตามนโยบายบัญชี

## 4. สถาปัตยกรรมข้อมูลและ route เป้าหมาย

### เมนูนักศึกษา

| ลำดับ | เมนู | Route | หน้าที่ |
| --- | --- | --- | --- |
| 1 | ภาพรวม | `/student` | สรุปงานและลิงก์ไป action ถัดไป |
| 2 | การสมัครสถานประกอบการ | `/student/applications` | ค้นหา กรอง และจัดการประวัติ application |
| 3 | คำร้องสถานที่ฝึกงาน | `/student/requests` | ติดตามสถานะ request ทั้งหมด |
| 4 | เอกสาร | `/student/documents` | เอกสารที่รอดำเนินการ/ประวัติเอกสาร |
| 5 | สถานที่ฝึกงาน | `/student/placement` | ข้อมูล placement ที่ยืนยันแล้ว |
| 6 | ตารางนิเทศ | `/student/visits` | ตารางนิเทศที่เผยแพร่แล้ว แบบอ่านอย่างเดียว |
| 7 | การแจ้งเตือน | `/student/notifications` | ข้อความที่เกี่ยวข้องและสถานะการอ่าน |

เมนูผู้ใช้ต้องมีอย่างน้อย “ข้อมูลส่วนตัว”, “เปลี่ยนรหัสผ่าน” และ “ออกจากระบบ” โดยใช้ route
`/student/profile` และ `/account/password` หรือ route ที่ project ใช้อยู่จริง ห้ามเพิ่ม navigation
ไปยังพื้นที่ staff/teacher

### Route ที่ต้องมี

| Route | สถานะ | ความรับผิดชอบ |
| --- | --- | --- |
| `/student` | ต้องสร้าง/ปรับ | overview และ next action |
| `/student/applications` | ต้องปรับ | table ประวัติ application |
| `/student/applications/new` | ต้องสร้าง/ปรับ | ฟอร์มสร้าง application |
| `/student/applications/:id` | ต้องปรับ | รายละเอียดและ action ตาม state |
| `/student/applications/:id/edit` | ต้องสร้าง | แก้ไขก่อนยืนยันเท่านั้น |
| `/student/requests` | ต้องสร้าง | table/list ของ request |
| `/student/requests/:id` | ต้องสร้าง | detail, timeline, document actions |
| `/student/documents` | ต้องสร้าง | งานเอกสารของนักศึกษา |
| `/student/placement` | ต้องสร้าง | placement ที่ยืนยันแล้ว |
| `/student/visits` | ต้องสร้าง | ตารางนิเทศแบบ read-only |
| `/student/notifications` | ต้องสร้าง | list/read state ของ notification |
| `/student/profile` | ต้องสร้าง/เชื่อม | profile ส่วนตัว |

## 5. วงจรงานหลัก

```text
เข้าสู่ระบบ / เปลี่ยนรหัสผ่านครั้งแรก
  → Overview แสดงงานถัดไป
  → สร้าง application หนึ่งรายการ
  → รอผล / สัมภาษณ์ / ระบุผล
  → บริษัทตอบรับ
  → นักศึกษายืนยันข้อมูล
  → สร้าง request + แจ้งเจ้าหน้าที่
  → เจ้าหน้าที่ออกหนังสือ
  → นักศึกษาดาวน์โหลดและอัปโหลดหนังสือตอบรับ
  → เจ้าหน้าที่ตรวจเอกสาร
  → placement ได้รับการยืนยัน
  → นักศึกษาดูตารางนิเทศและ notifications
```

### กฎสำคัญตลอดวงจร

- ทุก query และ mutation ต้อง derive student owner จาก session เท่านั้น ห้ามรับ `studentId` หรือ
  `studentUserId` จาก client เพื่อระบุเจ้าของข้อมูล
- นโยบาย “หนึ่งรายการกำลังดำเนินการ” ต้องบังคับใน server transaction ไม่ใช่เพียง disable button
- การเปลี่ยนสถานะทำผ่าน explicit action และ transition ที่อนุญาตเท่านั้น ห้ามให้ client update
  enum สถานะแบบอิสระ
- เมื่อข้อมูลเข้าสู่ request/placement ที่เจ้าหน้าที่กำลังดำเนินการ ต้อง snapshot field สำคัญ
  (ชื่อบริษัท/สาขา, ตำแหน่ง, ที่อยู่, จังหวัด, พิกัด, ผู้รับหนังสือ, ที่อยู่หนังสือ) ไว้กับ
  record ปลายทาง และล็อกการแก้ไขต้นทาง
- file download/upload ทุกจุดตรวจ session, role, ownership, request/document state, MIME,
  extension และ size ทาง server

## 6. State machine ที่ต้องส่งมอบ

ชื่อ enum จริงใน database อาจต่างได้ แต่ต้องมี mapping ที่ชัดเจนและผ่าน transition ด้านล่าง
ห้ามส่งข้อความภาษาไทยจาก client เพื่อเป็นค่า state

### 6.1 Application

| State เชิงระบบ | label นักศึกษา | นักศึกษาทำได้ | เปลี่ยนไปได้ |
| --- | --- | --- | --- |
| `SUBMITTED` | ส่งข้อมูลการสมัครแล้ว | ดู, แก้ไข, ระบุรอผล/นัดสัมภาษณ์, ระบุรับ/ไม่รับ, ยกเลิก | `AWAITING_RESPONSE`, `INTERVIEW`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `AWAITING_RESPONSE` | รอผลตอบกลับ | ดู, แก้ไข, ระบุผล, ยกเลิก | `INTERVIEW`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `INTERVIEW` | รอสัมภาษณ์ | ดู, แก้ไข, ระบุผล, ยกเลิก | `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `ACCEPTED` | บริษัทตอบรับ | ดู, ยืนยันข้อมูลและส่งคำร้อง | `CONFIRMED` |
| `REJECTED` | บริษัทปฏิเสธ | ดู, ลบ | terminal |
| `WITHDRAWN` | ยกเลิกการสมัคร | ดู | terminal |
| `CONFIRMED` | ยืนยันข้อมูลและส่งคำร้องแล้ว | ดูและไปยังคำร้อง | terminal; field หลักล็อก |

หมายเหตุ: “บริษัทตอบกลับแล้ว” เป็น event หรือ note ที่แสดงใน timeline ได้ ไม่จำเป็นต้องเป็น
state ถาวรแยกหากไม่มี action ที่ต่างจาก `AWAITING_RESPONSE`/`INTERVIEW`

**Active application** คือ `SUBMITTED`, `AWAITING_RESPONSE`, `INTERVIEW` และ `ACCEPTED`.
ห้ามสร้างรายการใหม่ตราบใดที่มี active application ในรอบเดียวกัน การมี `CONFIRMED` หมายถึง
นักศึกษาเข้าสู่ flow placement แล้ว; ห้ามเปิด application ใหม่ในรอบเดิม เว้นแต่เจ้าหน้าที่/กฎ
business กำหนดว่าคำร้องไม่ผ่านแล้วให้เริ่มใหม่ได้

### 6.2 Cooperative request

| State เชิงระบบ | label นักศึกษา | ผู้ทำงานถัดไป | action ฝั่งนักศึกษา |
| --- | --- | --- | --- |
| `DRAFT` | แบบร่าง | นักศึกษา | ดู/แก้เฉพาะ field ที่เปิดให้แก้ หรือยกเลิก |
| `SUBMITTED` | ส่งคำร้องแล้ว | เจ้าหน้าที่ | ดูสถานะ |
| `STAFF_PROCESSING` | รอเจ้าหน้าที่ดำเนินการ | เจ้าหน้าที่ | ดูสถานะ |
| `LETTER_READY` | มีหนังสือพร้อมดาวน์โหลด | นักศึกษา | ดาวน์โหลดหนังสือ, อัปโหลดหนังสือตอบรับ |
| `DOCUMENT_UNDER_REVIEW` | รอตรวจสอบเอกสาร | เจ้าหน้าที่ | ดูสถานะ/เอกสาร |
| `RETURNED_FOR_REVISION` | ถูกส่งกลับให้แก้ไข | นักศึกษา | ดูเหตุผล, อัปโหลดฉบับใหม่ |
| `PLACEMENT_CONFIRMED` | ยืนยันสถานที่ฝึกงานแล้ว | ระบบ/เจ้าหน้าที่ | ดู placement และตารางนิเทศ |
| `REJECTED` | ไม่ผ่านการยืนยัน | เจ้าหน้าที่ | ดูเหตุผล; ให้ next action ที่เจ้าหน้าที่กำหนด |
| `CANCELLED` | ยกเลิกคำร้อง | นักศึกษา/เจ้าหน้าที่ตาม policy | ดูเหตุผล |

`ACCEPTED → CONFIRMED + request` ต้องใช้ confirmation UI เพราะล็อกข้อมูล application หลัก
และมีผลสร้างงานให้ staff

### 6.3 Document

| State | ความหมาย | action นักศึกษา |
| --- | --- | --- |
| `WAITING_UPLOAD` | มีหนังสือแล้ว รอส่งเอกสาร | อัปโหลด |
| `UPLOADED` | ส่งไฟล์แล้ว | ดู/ดาวน์โหลด รอผล |
| `UNDER_REVIEW` | เจ้าหน้าที่กำลังตรวจ | ดูสถานะ |
| `APPROVED` | เอกสารผ่าน | ดู/ดาวน์โหลด |
| `RETURNED_FOR_REVISION` | ต้องส่งฉบับใหม่ | ดูเหตุผลและอัปโหลดใหม่ |
| `SUPERSEDED` | เป็นฉบับเก่าที่ถูกแทนที่ | ดูเป็นประวัติเท่านั้น |

ทุกการอัปโหลดใหม่ต้องรักษาประวัติฉบับเดิม กำหนดฉบับใหม่เป็น current version และสร้าง
notification ให้ผู้เกี่ยวข้องตามความเหมาะสม

## 7. สเปกหน้าจอ

### 7.1 `/student` — Overview

แสดงเฉพาะข้อมูลของผู้ใช้ที่ login:

- การ์ด profile สั้น: ชื่อ, รหัสนักศึกษา, รุ่น, หมู่เรียน, สถานะบัญชี
- current cycle และสถานะเข้าร่วมรอบ
- “งานถัดไป” หนึ่ง action ที่ชัดที่สุด เช่น เริ่มสมัคร, ระบุผล, ยืนยันบริษัท, ดาวน์โหลดหนังสือ,
  อัปโหลดเอกสาร หรือดูตารางนิเทศ
- สถานะ application ล่าสุดและ request ล่าสุด พร้อม link ไป detail
- placement ที่ยืนยันแล้วเมื่อมี
- ตารางนิเทศถัดไปเมื่อเผยแพร่แล้ว
- notifications ที่ยังไม่อ่านล่าสุด 3–5 รายการ พร้อมจำนวนรวมและ link ไปหน้าทั้งหมด
- loading, error/retry, no-cycle และ no-data state ที่แยกกัน

ไม่ทำ dashboard graph หรือ card ซ้ำจำนวนมาก; หน้านี้ต้องตอบคำถามว่า “ตอนนี้ต้องทำอะไรต่อ”
ภายในหนึ่งหน้าจอ

### 7.2 `/student/applications` — รายการสมัคร

ใช้ `UTable` และมาตรฐาน data table ใน `AGENTS.md`:

- ปุ่ม primary “เพิ่มการสมัคร” แสดงได้เฉพาะเมื่อ business rule อนุญาต
- search ชื่อบริษัท/ตำแหน่ง และ filter สถานะ/จังหวัด
- control row มี `<UIButtonRefresh>` และ clear filters เมื่อมี filter active
- columns: เลขที่, สถานประกอบการ, จังหวัด, ตำแหน่ง, วันที่สมัคร, สถานะ, อัปเดตล่าสุด,
  จัดการ
- action ในคอลัมน์จัดการต้องเห็นโดยตรง: ดูรายละเอียด, แก้ไข, ระบุผล, ยืนยัน, ยกเลิก หรือ
  ลบ เฉพาะ action ที่ state นั้นทำได้
- pagination, loading, empty, no-results และ error state ครบ
- การลบ `REJECTED` ต้องใช้ `<UIConfirmModal>` และ refresh data หลังสำเร็จ

### 7.3 `/student/applications/new` และ edit

ใช้ form เดียวที่ share ได้ระหว่าง create/edit แต่ form ownership ต้องชัดเจน ไม่ทำ watcher
sync ซับซ้อนโดยไม่จำเป็น

ข้อมูลที่ต้องรองรับ:

1. ค้นหาและเลือกสถานประกอบการเดิม หรือเลือก “กรอกสถานประกอบการใหม่”
2. ชื่อสถานประกอบการ, ที่อยู่, จังหวัด, ข้อมูลติดต่อเท่าที่ requirement บริษัทกำหนด
3. ตำแหน่งฝึกงาน
4. ชื่อหรือหน่วยงานผู้รับหนังสือ
5. ที่อยู่สำหรับออกหนังสือ พร้อมปุ่มคัดลอกจากที่อยู่บริษัทและแก้ไขต่อได้
6. ชื่อสถานที่ฝึก, พิกัด latitude/longitude ผ่าน map picker หรือ manual entry
7. วันที่สมัคร และรายละเอียดเพิ่มเติม

ข้อกำหนด interaction:

- ใช้ tab/segmented control ที่ keyboard-accessible ระหว่าง “เลือกสถานประกอบการเดิม” กับ
  “กรอกสถานประกอบการใหม่”
- form มี visible labels, inline validation, loading และไม่ทิ้งค่าที่กรอกเมื่อ API ล้มเหลว
- ปุ่มบันทึกไม่ disable เพียงเพราะ form invalid; กดแล้วแสดง error ที่ field ที่แก้ได้
- edit ทำได้ก่อน `CONFIRMED` เท่านั้น; ข้อมูลที่ snapshot ไปแล้วต้องแสดงแบบ read-only
- create สำเร็จ redirect ไป detail ของรายการใหม่, update สำเร็จกลับ detail พร้อม toast

### 7.4 Application detail

ต้องแสดงข้อมูล application ทั้งหมด, timeline, สถานะล่าสุด, เหตุผล/หมายเหตุ และ action
เฉพาะที่อนุญาต:

- `SUBMITTED/AWAITING_RESPONSE/INTERVIEW`: แก้ไข, เปลี่ยน milestone, ยกเลิก
- `ACCEPTED`: เปิด confirmation ก่อน “ยืนยันข้อมูลและส่งคำร้องสถานที่ฝึกงาน”
- `REJECTED`: ลบผ่าน confirmation หรือกลับไปสร้างรายการใหม่
- `CONFIRMED`: link ไป request detail เท่านั้น; ห้ามแก้ field หลัก

### 7.5 Requests, documents, placement, visits และ notifications

**Requests list/detail**

- list แสดงเลขที่คำร้อง, บริษัท, ตำแหน่ง, สถานะ, วันที่ส่ง, อัปเดตล่าสุด และ action ดูรายละเอียด
- detail แสดง snapshot ของบริษัท/ตำแหน่ง/ที่อยู่/พิกัด/ผู้รับหนังสือ/เหตุผลตีกลับ/timeline
- action ดาวน์โหลดหรืออัปโหลดต้องแสดงเฉพาะ state ที่ถูกต้อง

**Documents**

- แสดงงานเอกสารทั้งหมด grouped ตาม request; ไม่เปิด public URL ที่เดาได้
- แสดงชนิดเอกสาร, version, สถานะ, วันที่ส่ง/ตรวจ, reviewer note และ action download/upload
- upload รองรับ file policy ที่กำหนดโดยระบบ; แสดง validation ของขนาด/ชนิดไฟล์ใกล้ field

**Placement**

- เมื่อ request เป็น `PLACEMENT_CONFIRMED` แสดงบริษัท/สาขา/ที่อยู่/จังหวัด/พิกัด/ตำแหน่ง,
  วันที่ยืนยัน, สถานะการปฏิบัติงาน และเอกสารที่เกี่ยวข้อง
- หากยังไม่ยืนยัน ให้เป็น empty state ที่ชี้ไป request ปัจจุบัน

**Visits**

- list หรือ calendar ที่อ่านได้ แสดงเลขที่, ครั้งที่นิเทศ, วันเวลา, เช้า/บ่าย, บริษัท/ที่อยู่,
  นักศึกษาที่อยู่ในรายการเดียวกัน, อาจารย์นิเทศ, สถานะ และผล/หมายเหตุที่เผยแพร่แล้ว
- ไม่มี create, edit, move, delete หรือ action เปลี่ยนอาจารย์สำหรับ role student

**Notifications**

- list เรียงใหม่สุดก่อน, badge unread count, mark one/read all และ deep link ไป resource ที่เกี่ยวข้อง
- รองรับ: ส่งคำร้อง, หนังสือพร้อม, เอกสารถูกส่งกลับ/ผ่าน, placement ยืนยัน, ตารางนิเทศเผยแพร่
  และสถานะคำร้องเปลี่ยน

## 8. API และข้อมูลเชิงหน้าที่

agent ออกแบบ path/shape ได้ตาม convention ของ repo แต่ต้องครอบคลุม capability ต่อไปนี้และ
วางใต้ `/api/student/` เพื่อสื่อ ownership:

| Capability | ตัวอย่าง endpoint |
| --- | --- |
| context overview | `GET /api/student/context` |
| profile/password | `GET/PATCH /api/student/profile`, ใช้ endpoint password ของ project |
| applications list/create | `GET/POST /api/student/applications` |
| application detail/edit/delete | `GET/PATCH/DELETE /api/student/applications/:id` |
| application milestone/confirm | `POST /api/student/applications/:id/actions` |
| requests list/detail | `GET /api/student/requests`, `GET /api/student/requests/:id` |
| request action/history | `GET /api/student/requests/:id/history`, action ตาม state ที่อนุญาต |
| document list/download/upload | `/api/student/documents/*` หรือ nested request routes |
| placement | `GET /api/student/placement` |
| visits | `GET /api/student/visits` |
| notifications/read state | `GET /api/student/notifications`, `POST/PATCH` read actions |

API ทุก mutation ต้อง validate body ที่ server, ตรวจ role `STUDENT`, ตรวจ ownership และ state
transition ก่อนเปลี่ยนข้อมูล response ของ list/detail ต้องมีข้อมูลพอให้ UI แสดงโดยไม่ต้อง fetch
N+1 รายการต่อแถว

### ข้อมูลขั้นต่ำที่ต้อง preserve เป็น snapshot

เมื่อ application ยืนยันเป็น request ต้อง copy อย่างน้อย:

- ชื่อสถานประกอบการ/สาขาหรือชื่อสถานที่ฝึก
- ตำแหน่งฝึกงาน
- ที่อยู่และจังหวัด
- latitude/longitude
- ผู้รับหนังสือ และที่อยู่สำหรับออกหนังสือ
- วันที่สมัคร/วันที่ยืนยัน

หลัง request ยืนยัน placement ต้องใช้ snapshot นั้นเป็น source สำหรับ placement และ scheduling
ไม่ reference field บริษัทกลางอย่างเดียวจนประวัติเปลี่ยนตามการแก้ไขภายหลัง

## 9. แผนเคลียร์ implementation ปัจจุบัน

นี่เป็นการ **replace ทั้งหมด** ไม่ใช่ refactor เพื่อรักษา behavior เดิม ห้ามสร้าง compatibility
layer, feature flag, redirect เพื่อรองรับ API เก่า หรือ fallback ไปใช้ modal/route เก่า

### สิ่งที่ต้องถือว่าเลิกใช้

- flow สมัครแบบ modal (`StudentApplicationModal`) และ state/modal opener ทั้งหมด
- สถานะ application/request แบบย่อเดิม และ endpoint action ที่ผูกกับสถานะนั้น
- หน้า overview ที่แสดงเฉพาะการสมัครแบบเดิม
- table/detail ที่รวม application, request และเอกสารแบบจำกัดระยะแรก
- API response shape, type และ test fixture ของ flow นักศึกษาเดิมที่ไม่ตรงกับ contract ใหม่
- migration/seed/test data ของ feature นักศึกษาเดิมที่ไม่มีผู้ใช้อื่นอ้างอิง

### วิธีลบและแทนที่

1. สำรวจ `app/pages/student`, `app/components/Student`, `server/api/student`, Prisma schema,
   auth middleware และ route ฝั่ง staff/teacher แล้วทำ usage map ก่อนลบ
2. ลบ `StudentApplicationModal.vue` และทุก import, event handler, ref และ template usage ของมัน
   ไม่ย้าย logic เดิมไปคงไว้; เขียน form ใหม่ตามข้อ 7.3
3. เขียนทับ page เดิมที่ใช้ path เดียวกัน (`/student`, `/student/applications`,
   `/student/applications/:id`) ด้วยหน้าตาม contract ใหม่ และเพิ่ม route ที่ระบุในข้อ 4
4. ลบหรือเขียนทับ endpoint ใต้ `/api/student/` ที่ response/state ไม่ตรง contract ใหม่ รวมถึง
   client types/composables/test fixture ที่อ้างถึงมัน ห้ามคง alias route ไว้รองรับ flow เดิม
5. แทนที่ model/enum/relation ของ feature นักศึกษาเดิมตาม data model ที่จำเป็นต่อ scope ใหม่
   สามารถ drop ตาราง/enum/ข้อมูลเดิมได้หลังยืนยันว่าไม่ใช่ dependency ร่วมของ staff/teacher
6. ปรับ navigation เป็นเมนูเป้าหมายในตารางข้อ 4 พร้อม page ที่ใช้งานจริงครบทุก link
7. หลังแต่ละ phase ใช้ `rg` ตรวจว่าไม่มี import, endpoint call, enum label, route หรือ component
   ของ flow เดิมเหลืออยู่ แล้วลบ dead code ใน phase เดียวกัน

**เกณฑ์สำเร็จของการเคลียร์:** ไม่มี UI หรือ API path ของนักศึกษาที่พาไป behavior เดิม, ไม่มี
duplicate form/modal, ไม่มี enum transition เดิมถูกเรียกใช้ และ typecheck/build ผ่านหลังลบ

## 10. ลำดับการพัฒนาและเกณฑ์ผ่านแต่ละระยะ

### P0 — Foundation และ contract

1. ตรวจ auth/account policy, Prisma schema, migration ล่าสุด, current role middleware,
   existing upload storage และ staff workflow
2. ทำ usage map ของ flow เดิม แล้วลบ component/route/API/type/test ที่ใช้เฉพาะ flow เดิม
3. เขียน shared types และ state-transition guard ชุดใหม่ให้ server เป็น authority
4. ทำ decision log สั้น ๆ หาก naming หรือ file storage ต้องเลือกจากข้อมูลที่ repo ไม่มี

**เสร็จเมื่อ:** flow เดิมถูกลบแล้ว, state map/ownership rule/route map ชุดใหม่ถูกยืนยันจาก
code/tests และไม่มีการเดา public contract ของ API หรือ component

### P1 — Account, navigation และ overview

1. ตรวจ first-login password flow และ account status ให้ role student เข้าใช้งานตาม policy
2. สร้าง navigation/page shells ครบทุกเมนูที่ implement แล้ว
3. ทำ context API และ overview ที่ให้ next action จาก state จริง

**เสร็จเมื่อ:** นักศึกษาเห็นเฉพาะเมนูของตน, account ที่ไม่พร้อมใช้งานถูกป้องกัน, overview
นำไป action ต่อไปได้จริง

### P2 — Application lifecycle

1. สร้าง/ปรับ data model และ API create/list/detail/edit/delete/action ตาม state machine
2. ทำ page list, new, detail, edit พร้อม company search/new company, address, map and coordinates
3. บังคับ one active application ใน transaction และทดสอบ concurrent create
4. เพิ่ม timeline/status labels, confirmation สำหรับ irreversible actions, และ rejected delete

**เสร็จเมื่อ:** นักศึกษาสมัคร ติดตาม แก้ไข ระบุผล ยกเลิก และลบรายการที่ปฏิเสธแล้วได้ โดย
ไม่สามารถทำ transition/ownership ผิดกฎ

### P3 — Confirm application และ request lifecycle

1. ทำ action confirm ที่ snapshot application, สร้าง request, ล็อก application และแจ้ง staff
2. ทำ request list/detail และ state timeline/returned reason
3. เชื่อม overview และ application detail ไป request detail

**เสร็จเมื่อ:** accepted application ยืนยันได้เพียงครั้งเดียว และ application ที่ยืนยันแล้วแก้
ข้อมูลหลักไม่ได้

### P4 — Document workflow

1. เลือก file storage ที่ persistent และปลอดภัยสำหรับ deployment ก่อน implement upload
2. ทำ document/version/history, secure download/upload, server file validation และ returned revision
3. ทำ document hub และ action ใน request detail พร้อม notifications

**เสร็จเมื่อ:** นักศึกษาดาวน์โหลดหนังสือ อัปโหลดไฟล์ ดูผลตรวจ และส่งฉบับใหม่ได้ โดยไฟล์เดิม
ยังดูเป็นประวัติและผู้ใช้คนอื่นเข้าถึงไม่ได้

### P5 — Placement, visits และ notifications

1. สร้าง placement read model เมื่อ request ได้รับการยืนยัน
2. ทำ visits API/page แบบ read-only และแสดงเฉพาะรายการเผยแพร่
3. ทำ notification creation/read/deep-link และ unread badge
4. เติม overview ด้วย placement/visit/notification summary

**เสร็จเมื่อ:** flow หลังการยืนยันมีปลายทางที่นักศึกษาดูข้อมูลสำคัญทั้งหมดได้โดยไม่แก้ข้อมูล
ที่ staff ควบคุม

### P6 — Hardening และ handoff

1. ตรวจ UI ทุกหน้า: loading, empty, no-results, error/retry, narrow viewport, keyboard และ
   long Thai text
2. เพิ่ม test ที่ stable seam สำหรับ ownership, transition, one-active rule, snapshot และ upload
3. รัน quality gates และ browser test ตาม checklist ข้อ 11
4. ทบทวน diff เพื่อลบ dead code จาก flow เก่า และอัปเดตเอกสาร API/plan เมื่อ implementation
   เบี่ยงจากแผนด้วยเหตุผลที่ยืนยันได้

## 11. Checklist การทดสอบและเกณฑ์รับงาน

### Authorization และ data isolation

- account นักศึกษาเข้าถึง record, request, document, placement, visit และ notification ของ
  นักศึกษาคนอื่นไม่ได้ (`404` หรือ `403` ตาม convention เดียวกัน)
- client ไม่สามารถส่ง owner ID เพื่อยึดหรือแก้ข้อมูลคนอื่น
- route/API ของ staff และ teacher ไม่ถูกเปิดกว้างจากการเพิ่ม role student

### State และ business rules

- สร้าง active application พร้อมกันสอง request ไม่ทำให้เกิดสองรายการ
- transition ที่ไม่อยู่ในตารางข้อ 6 ถูก reject ที่ server
- rejected application ลบได้เท่านั้น; state อื่นไม่แสดงหรือรับ delete action
- confirm สร้าง request/notification/snapshot เพียงครั้งเดียวและ atomic
- application ที่ confirm แล้วแก้ข้อมูลหลักไม่ได้
- upload/reupload ได้เฉพาะ request/document state ที่อนุญาตและสร้าง version history ถูกต้อง

### UI และ accessibility

- ทุก mutation มี loading, ป้องกัน duplicate click, success/error feedback และ refresh state
- form ใช้ visible label, inline error, keyboard navigation, focus state และยังเก็บค่าหลัง API error
- table ใช้ `UTable`, filter reset pagination, มี clear filters และ action ที่มองเห็นได้โดยตรง
- file controls บอกชนิด/ขนาดที่รองรับก่อนเลือกไฟล์
- ไม่มี route/เมนู/link ที่นำไปหน้าไม่พร้อมใช้งาน

### Quality gates

รันอย่างน้อย:

```bash
pnpm exec prisma validate
pnpm typecheck
pnpm build
git diff --check
```

เพิ่มและรัน automated tests ที่เหมาะกับ project โดยเฉพาะ transition, ownership, transaction และ
upload policy แล้วทำ browser verification อย่างน้อยหนึ่ง happy path และหนึ่ง returned-document
path ต่อ role ที่ได้รับผลกระทบ

## 12. สิ่งที่ยังต้องตัดสินใจโดยผู้มีอำนาจ

agent ทำงานระยะ P0–P3 ต่อได้โดยใช้ defaults ในเอกสารนี้ แต่ต้องหยุดถามผู้ใช้ก่อนทำเรื่องต่อไปนี้
หาก repository ไม่มีคำตอบที่ชัดเจน:

1. persistent file storage สำหรับ production และขนาด/ชนิดไฟล์สูงสุด
2. ผู้ใดมีสิทธิ์เปลี่ยน application เป็น `ACCEPTED`/`REJECTED` ในระบบจริง หากไม่ใช่นักศึกษา
3. เมื่อ request `REJECTED` หรือ `CANCELLED` นักศึกษาสมัครใหม่ใน cycle เดิมได้หรือไม่
4. policy การยกเลิก request หลังเจ้าหน้าที่เริ่มทำหนังสือ
5. รูปแบบ/ผู้สร้างหนังสือขอความอนุเคราะห์ PDF และ integration การแจ้งเตือนภายนอก (email/LINE)

ห้ามแก้ด้วยการสมมติแบบเงียบ ๆ เพราะคำตอบเหล่านี้กระทบ workflow และข้อมูลย้อนหลัง

## 13. รูปแบบรายงานส่งมอบของ agent

รายงานทุก phase ต้องระบุสั้นและตรวจสอบได้:

1. phase/route/API/state ที่ทำเสร็จ
2. กฎ business และ authorization ที่ server บังคับจริง
3. migration หรือ external dependency ที่เพิ่ม (ถ้ามี)
4. commands/tests/browser flows ที่รัน พร้อมผลจริง
5. งานที่ยังค้าง, decision ที่ต้องผู้ใช้ตอบ, และข้อจำกัดที่จงใจไม่ทำ
6. รายชื่อไฟล์ที่เปลี่ยน และยืนยันว่าไม่ได้ commit/push หากไม่ได้รับคำสั่ง
