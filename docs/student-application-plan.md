# แผนพัฒนาส่วนของนักศึกษา: สมัครสถานประกอบการและคำร้องเอกสาร

## เป้าหมาย

ให้นักศึกษาบันทึกประวัติการสมัครสถานประกอบการของตนใน **รอบสหกิจที่กำลังเปิดรับคำร้อง**
ติดตามผลด้วยตนเอง ส่งคำร้องเมื่อบริษัทตอบรับ ดาวน์โหลดหนังสือ PDF ที่เจ้าหน้าที่ออกให้
และอัปโหลดเอกสารที่บริษัทลงนามกลับมาได้ โดยงานทั้งหมดของแต่ละบริษัทติดตามได้จาก
**หนึ่งแถวในตารางเดียว**

ผลลัพธ์ระยะนี้คือ vertical slice ที่ใช้ข้อมูลจริงครบฐานข้อมูล, API และหน้า `/student`
ไม่ใช่ mockup และยังไม่รวมการจัดอาจารย์นิเทศ ตารางนิเทศ การประเมิน งบประมาณ
หรือระบบจัดทำ PDF ของเจ้าหน้าที่

## ข้อกำหนดก่อนเริ่ม

ต้องทำตาม [user-unification-plan.md](user-unification-plan.md) จนถึงระยะ U5 ก่อนเริ่ม
feature นี้: `User` ต้องเป็น source of truth ของข้อมูลนักศึกษาและบัญชีแล้ว

ห้ามสร้าง `Student` model/table ใหม่ หรือเพิ่ม relation อ้อมจาก `User.loginId` เพื่อ
ชดเชยการรวมข้อมูล เจ้าของการสมัครต้องอ้าง `User.id` โดยตรง

## วิธีใช้แผนนี้กับ agent

มอบหมายงานเป็นระยะตามหัวข้อด้านล่างเท่านั้น ห้ามข้ามไปสร้าง feature ถัดไปล่วงหน้า
ก่อนเริ่มทุกครั้งให้:

1. อ่าน `AGENTS.md`, เอกสารนี้ และโค้ด/route ที่เกี่ยวข้อง รวมถึง `git status`
2. รักษาการแก้ไขเดิมที่ไม่เกี่ยวข้อง และตรวจ schema/migration/API ที่มีอยู่ก่อนเพิ่มของใหม่
3. ใช้ Prisma migration, Nitro API และ Nuxt UI ตาม convention เดิม; ห้ามเพิ่ม dependency
   หรือ commit/push โดยไม่ได้รับคำสั่งตรง
4. ทำ validation และ authorization ใน API/ฐานข้อมูล ไม่พึ่งการซ่อนปุ่มบนหน้าเว็บ
5. ทำเฉพาะ endpoint และ UI ที่ถูกเรียกใช้จริงในระยะที่ได้รับมอบหมาย
6. ก่อนส่งงาน รัน check ตามหัวข้อการตรวจรับ และตรวจ final diff ว่าไม่ขยาย scope

## ขอบเขตและศัพท์

ใช้ศัพท์สองชุดนี้แยกกันเสมอ:

- **การสมัครสถานประกอบการ** (`CompanyApplication`): บันทึกว่านักศึกษาเคยส่งอีเมล,
  เรซูเม่ หรือสมัครไปที่ใด และบริษัทตอบรับหรือไม่
- **คำร้อง** (`CooperativeRequest`): งานที่เริ่มได้หลังบริษัทตอบรับ เพื่อให้เจ้าหน้าที่
  ออกหนังสือ แล้วนักศึกษาส่งเอกสารที่บริษัทลงนามกลับเข้าระบบ

ห้ามใช้ model/สถานะเดียวแทนทั้งสองเรื่อง เพราะผลการสมัครและการออกเอกสารเป็นคนละ
กระบวนการและมีผู้รับผิดชอบคนละฝ่าย

## กติกาธุรกิจที่ยืนยันแล้ว

### รอบที่นักศึกษาใช้งานได้

- นักศึกษาทำรายการได้เฉพาะรอบที่ `OPEN_FOR_APPLICATION` และมี `cohortYear`
  ตรงกับข้อมูลนักศึกษา
- หากไม่พบรอบที่เข้าเงื่อนไข หน้า `/student` ต้องแสดง empty state อธิบายเหตุผล
  โดยไม่แสดงปุ่มเริ่มสมัคร
- หลังรอบเปลี่ยนเป็น `APPLICATION_CLOSED`, `IN_PROGRESS` หรือ `CLOSED` API ต้องปฏิเสธ
  การสร้าง/แก้การสมัครและส่งคำร้อง แม้ผู้ใช้เปิดหน้าเดิมค้างไว้

### การสมัครสถานประกอบการ

- หนึ่งนักศึกษามีการสมัครที่สถานะ `PENDING` ได้ **ไม่เกินหนึ่งรายการต่อรอบ**
- นักศึกษาเปลี่ยนผลของรายการตนเองได้เป็น `REJECTED`, `ACCEPTED` หรือ `WITHDRAWN`
- เมื่อเป็น `REJECTED` หรือ `WITHDRAWN` จึงเริ่มรายการสมัครใหม่ได้
- เมื่อเป็น `ACCEPTED` จะเริ่มรายการสมัครใหม่ไม่ได้ และเปิดให้ส่งคำร้องได้
- รายการที่มีผลแล้วเป็นประวัติ: ห้ามลบ; ให้ใช้ `WITHDRAWN` ก่อนบริษัทตอบรับหากต้องการยกเลิก
- ห้ามเปลี่ยน `ACCEPTED` กลับเป็นสถานะอื่นหลังสร้างคำร้องแล้ว เพื่อไม่ให้คำร้องสูญเสียต้นทาง

### สถานประกอบการ

- นักศึกษาค้นหาและเลือกสถานประกอบการเดิมที่ใช้งานได้ หรือกรอกข้อมูลบริษัทใหม่ในฟอร์ม
  การสมัครเดียวกันได้
- ฟอร์มบริษัทใหม่ใช้ข้อมูลและ validation เดียวกับฟอร์มเจ้าหน้าที่: ชื่อบริษัท, ผู้ติดต่อหลัก,
  โทรศัพท์/อีเมล (ไม่บังคับ), ที่อยู่, จังหวัด, รหัสไปรษณีย์, พิกัด และหมายเหตุการเดินทาง
- หากสร้างบริษัทใหม่ ให้สร้าง `Company` จริงและผูกกับ `CompanyApplication` ใน transaction
  เดียวกัน เพื่อให้เจ้าหน้าที่นำข้อมูลเดียวกันไปออกหนังสือได้
- ค้นหาบริษัทก่อนและเตือนเมื่อชื่อกับจังหวัดใกล้เคียงกัน แต่ไม่ห้ามสร้าง เพราะอาจเป็นคนละสาขา
- นักศึกษาแก้ข้อมูลบริษัทจากรายการสมัครได้เฉพาะก่อนส่งคำร้อง; การแก้ต้องมีผลต่อ
  `Company` กลางตามความต้องการปัจจุบัน จึงควรมีข้อความแจ้งว่าเป็นการแก้ข้อมูลส่วนกลาง
  ของสถานประกอบการ

### คำร้องและเอกสาร

- หนึ่ง `CompanyApplication` ที่ `ACCEPTED` มี `CooperativeRequest` ได้หนึ่งรายการ
- นักศึกษาส่งคำร้องได้เมื่อบริษัทตอบรับและรอบยังเปิดรับคำร้อง
- เมื่อเจ้าหน้าที่ออกหนังสือ ระบบเก็บ PDF กับคำร้องและนักศึกษาดาวน์โหลดได้
- นักศึกษาอัปโหลดเอกสารที่บริษัทลงนามแล้วจากแถวเดิมในตาราง ไม่สร้างหน้าหรือเมนู
  `เอกสาร` แยก
- หลังส่งเอกสารยืนยันแล้ว งานของนักศึกษาสิ้นสุด แต่รายการยังแสดงเพื่อดูประวัติ
- ระยะนี้ให้รองรับไฟล์ PDF และรูปภาพ (`jpg`, `jpeg`, `png`) เท่านั้น; กำหนดขนาดสูงสุด
  ตาม runtime/deployment ที่ตรวจพบก่อน implement และตรวจชนิดไฟล์ที่ server

## State machine

ใช้ enum ชื่อจริงที่อ่านความหมายได้ใน Prisma และ map label ภาษาไทยที่ UI/API boundary
อย่าทำให้ client ส่งข้อความภาษาไทยเป็นค่า enum โดยตรง

### `CompanyApplicationStatus`

| ค่า | ข้อความ | เปลี่ยนไปได้ | ผล |
| --- | --- | --- | --- |
| `PENDING` | รอผลตอบรับ | `REJECTED`, `ACCEPTED`, `WITHDRAWN` | เป็นรายการ active หนึ่งเดียว |
| `REJECTED` | ไม่ได้รับคัดเลือก | ไม่มี | เริ่มการสมัครใหม่ได้ |
| `ACCEPTED` | บริษัทตอบรับ | ไม่มีหลังมีคำร้อง | ส่งคำร้องได้ |
| `WITHDRAWN` | ยกเลิกการสมัคร | ไม่มี | เริ่มการสมัครใหม่ได้ |

การเปลี่ยนสถานะทั้งหมดต้องเป็น action ที่มีข้อความอธิบายชัดเจน ไม่ใช้ dropdown
ที่แก้ค่าโดยไม่ยืนยันผล การเลือก `ACCEPTED` ควรใช้ `UIConfirmModal` เพราะจะปิดโอกาส
เริ่มสมัครบริษัทอื่น

### `CooperativeRequestStatus`

| ค่า | ข้อความ | ผู้ดำเนินการต่อ |
| --- | --- | --- |
| `SUBMITTED` | รอเจ้าหน้าที่ออกหนังสือ | เจ้าหน้าที่ |
| `LETTER_ISSUED` | ออกหนังสือแล้ว | นักศึกษา |
| `SIGNED_DOCUMENT_SUBMITTED` | ส่งเอกสารยืนยันแล้ว | งานนักศึกษาจบ |

ยังไม่เพิ่มสถานะ “ร่าง”, “อนุมัติ”, “ตรวจรับแล้ว”, “ตีกลับ” หรือ workflow ลายเซ็น
จนกว่าจะมีข้อกำหนดจริง ฝั่งเจ้าหน้าที่ใช้ `SUBMITTED` เป็นคิวงาน และระบบ PDF
ของเจ้าหน้าที่เป็นระยะถัดไป

## รูปแบบหน้าและ route

### `/student`

เป็นหน้าเดียวหลักของนักศึกษา ใช้ layout ของ role นักศึกษา และประกอบด้วย:

1. ชื่อหน้า `การสมัครสหกิจศึกษา` และ context ของรอบ เช่น `ภาคเรียนที่ 2/2569 · รุ่น 2566`
2. ข้อความสั้นบอกงานถัดไปจากรายการ active; ไม่ต้องมี dashboard/กราฟ
3. ปุ่ม primary `บันทึกการสมัครสถานประกอบการ` เมื่อไม่มี `PENDING` หรือ `ACCEPTED`
   เปิด popup form บนหน้านี้; ห้ามพาไปหน้า form แยก
4. ตาราง `ประวัติการสมัครและเอกสาร` เป็นเนื้อหาหลัก

ตารางต้องใช้ `UTable`, `UBadge`, search/filter/refresh/pagination ตามมาตรฐานใน
`AGENTS.md` และ table pattern ของโปรเจกต์ ไม่ทำ mobile card table ในระยะนี้

| คอลัมน์ | รายละเอียด |
| --- | --- |
| สถานประกอบการ | ชื่อบริษัท, จังหวัด และข้อมูลผู้ติดต่อสั้น ๆ |
| วันที่สมัคร | วันที่นักศึกษาบันทึกว่ายื่นสมัคร |
| สถานะสมัคร | `UBadge` พร้อมข้อความ |
| คำร้อง | ไม่มี / รอเจ้าหน้าที่ออกหนังสือ / ออกหนังสือแล้ว / ส่งเอกสารยืนยันแล้ว |
| หนังสือจากเจ้าหน้าที่ | `—` หรือปุ่มดาวน์โหลด PDF |
| เอกสารลงนาม | `—`, รออัปโหลด หรือชื่อไฟล์/ปุ่มดูไฟล์ |
| จัดการ | ปุ่มที่มองเห็นโดยตรงตาม state เช่น แก้ไข, ระบุผล, ส่งคำร้อง, อัปโหลดเอกสาร, ดูรายละเอียด |

- ไม่ใช้ menu `...` สำหรับ action หลัก
- ไม่เสนอ action ที่ทำไม่ได้ใน state นั้น และแสดงข้อความสั้นหากนักศึกษาต้องรอเจ้าหน้าที่
- filter เริ่มจาก: ค้นหาชื่อบริษัท, สถานะสมัคร, สถานะคำร้อง; ไม่เพิ่ม filter อื่นจนมีข้อมูลจริง
- แยก loading, error, empty state (ยังไม่มีประวัติ) และ no-results state ให้ชัด

### Popup: บันทึกการสมัครสถานประกอบการ

ใช้ `UModal`/`UModal` fullscreen บน narrow viewport ตาม component pattern ของโปรเจกต์
form ต้องเลื่อนภายใน modal ได้และปุ่มยกเลิก/บันทึกอยู่ใน footer ที่เข้าถึงด้วย keyboard ได้
ห้ามสร้าง route `/student/applications/new` หรือ full-page form สำหรับงานนี้

ลำดับและข้อมูลใน popup:

1. **ชื่อสถานประกอบการ** — search-as-you-type ในบริษัทที่ใช้งานได้ในระบบ
   - เมื่อเลือกบริษัทเดิม ให้แสดงข้อมูลบริษัทที่เลือกอย่างย่อ
   - เมื่อไม่พบ ให้เปิดส่วน `กรอกสถานประกอบการใหม่` ใน popup เดิม ไม่เปลี่ยนหน้า
2. **ตำแหน่งที่สมัคร** — บันทึกกับการสมัครนี้ เช่น `นักพัฒนาซอฟต์แวร์ฝึกหัด`
3. **ที่อยู่บริษัท** และ **จังหวัด** — ใช้ข้อมูลบริษัทเดิมเมื่อเลือกจากผลค้นหา; เมื่อกรอกบริษัทใหม่
   ต้องเก็บลง `Company` กลางด้วยตาม validation ของบริษัท
4. **เรียน (ชื่อผู้รับหนังสือ)** — ชื่อหรือหน่วยงานที่หนังสือควรเรียนถึง
5. **ที่อยู่สำหรับออกหนังสือ** — เป็นข้อความ snapshot ของการสมัครนี้ และมีปุ่ม
   `ใช้ที่อยู่บริษัท` เพื่อคัดลอกที่อยู่บริษัทที่จัดรูปแบบแล้ว โดยนักศึกษาแก้ไขต่อได้
6. **สถานที่ฝึก** — ช่องค้นหาสถานที่ผ่าน `UIMapPicker` ที่มีอยู่แล้ว; เลือกผลค้นหาแล้วเก็บ
   ชื่อสถานที่และพิกัด
   - หากไม่พบสถานประกอบการ/สถานที่จากการค้นหา ให้แสดงข้อความ
     `ไม่พบสถานประกอบการจากการค้นหา กรุณาระบุค่าละติจูดและลองจิจูดด้วยตนเอง (ไม่บังคับ)`
   - แสดงช่องละติจูดและลองจิจูดแบบ optional ใต้ช่องค้นหา; reuse validation พิกัดจาก
     `readCompanyInput` (`latitude -90..90`, `longitude -180..180`)

ต้องมี label, inline validation, loading state และเก็บค่าที่กรอกไว้เมื่อ API ตอบ error
ไม่ disable ปุ่มบันทึกเพียงเพราะ form ยัง invalid; เมื่อกดให้แจ้ง error ใกล้ field ที่ต้องแก้

ข้อมูล method และวันที่สมัครเดิมยังเก็บได้ แต่ให้อยู่ในส่วน `รายละเอียดเพิ่มเติม` ที่พับได้
ไม่แย่งความสำคัญจากข้อมูลที่จำเป็นสำหรับบริษัทและเอกสาร

### `/student/applications/:id`

หน้า detail เฉพาะรายการ ใช้เพื่อแสดงข้อมูลเต็มของบริษัทและรายการสมัคร พร้อม action
ตามสถานะ ไม่แยกหน้าคำร้องหรือเอกสารออกมา:

- `PENDING`: แก้ข้อมูล, ระบุไม่ได้รับคัดเลือก, ระบุบริษัทตอบรับ, ยกเลิก
- `ACCEPTED` และยังไม่มีคำร้อง: ส่งคำร้องขอหนังสือ
- `SUBMITTED`: แสดงว่ารอเจ้าหน้าที่ดำเนินการ
- `LETTER_ISSUED`: ดาวน์โหลด PDF และอัปโหลดเอกสารลงนาม
- `SIGNED_DOCUMENT_SUBMITTED`: แสดงไฟล์และข้อความว่างานนักศึกษาเสร็จแล้ว

การกด action จากตารางสามารถเปิด modal เล็กเฉพาะการระบุผลหรืออัปโหลดไฟล์ได้ แต่
ฟอร์มบริษัทและรายละเอียดที่ยาวต้องใช้ route นี้

## โครงสร้างข้อมูลและ migration

ก่อนลงมือ agent ต้องตรวจ migration ล่าสุดและชื่อ model ที่มีอยู่จริง ห้ามแก้ `User`,
`Company` หรือ `CooperativeCycle` แบบ destructive หากเพิ่ม relation ได้โดยไม่กระทบ
ข้อมูลเดิม

### `CompanyApplication`

เพิ่ม model ใหม่โดยมีอย่างน้อย:

- `id`
- `studentUserId` เป็น foreign key ไป `User.id` ของ role `STUDENT`
- `cooperativeCycleId` เป็น foreign key ไป `CooperativeCycle.id`
- `companyId` เป็น foreign key ไป `Company.id`
- `status` (`CompanyApplicationStatus`) ค่าเริ่มต้น `PENDING`
- `applicationPosition` ข้อความตำแหน่งที่สมัคร
- `applicationMethod` เป็นข้อความสั้น เช่น `EMAIL`, `IN_PERSON`, `WEBSITE`, `OTHER`
  หรือ enum เฉพาะเมื่อ UI ต้องใช้ filter/label ที่ตายตัวจริง
- `appliedAt` เป็นวันที่ยื่นสมัคร
- `note` ไม่บังคับ
- `outcomeAt` ไม่บังคับ
- `recipientName` ข้อความผู้รับหนังสือ
- `letterAddress` ข้อความที่อยู่สำหรับออกหนังสือ (snapshot)
- `internshipLocationName` ชื่อสถานที่ฝึก ไม่บังคับ
- `internshipLatitude`, `internshipLongitude` พิกัดสถานที่ฝึก ไม่บังคับ
- `createdAt`, `updatedAt`

เพิ่ม index อย่างน้อยบน `(studentUserId, cooperativeCycleId)` และ relation ที่จำเป็นสำหรับ query
ของนักศึกษา/เจ้าหน้าที่ ห้ามสร้าง partial unique index ด้วย Prisma schema โดยเดา provider
support; ให้ enforce active-application rule ใน transaction ของ API และเพิ่ม database
constraint เฉพาะเมื่อ migration ที่ตรวจสอบแล้วรองรับจริง

### `CooperativeRequest`

เพิ่ม model ใหม่โดยมีอย่างน้อย:

- `id`
- `companyApplicationId` unique foreign key ไป `CompanyApplication.id`
- `status` (`CooperativeRequestStatus`) ค่าเริ่มต้น `SUBMITTED`
- `recipientName` และ `recipientPosition` เป็น optional snapshot ของผู้รับหนังสือ
- `studentNote` ไม่บังคับ
- `letterFilePath`, `letterOriginalName`, `letterIssuedAt` สำหรับ PDF ที่เจ้าหน้าที่ออก
- `signedDocumentPath`, `signedDocumentOriginalName`, `signedDocumentSubmittedAt`
- `createdAt`, `updatedAt`

เริ่มจากเก็บหนังสือหนึ่งไฟล์และเอกสารลงนามหนึ่งไฟล์ก่อน เพราะ requirement ปัจจุบันมี
เอกสารละหนึ่งชุด ห้ามสร้าง generic document vault, versioning หรือ polymorphic attachment
model ล่วงหน้า

`recipientName` และ `letterAddress` ของ `CompanyApplication` เป็นข้อมูลที่นักศึกษากรอก
ตั้งแต่บันทึกการสมัคร เมื่อสร้าง `CooperativeRequest` ให้คัดลอกไปเป็น snapshot ของคำร้อง
โดยไม่บังคับให้นักศึกษากรอกซ้ำใน popup ส่งคำร้อง ส่วน `internshipLocation*` ไม่ใช่พิกัด
สำนักงานของ `Company`: เก็บกับการสมัครเพราะสถานที่ฝึกอาจเป็นอีกสาขาหรือพื้นที่ปฏิบัติงาน

### ความเป็นเจ้าของและสิทธิ์

หลังรวมข้อมูลแล้ว endpoint ของนักศึกษาต้องใช้ user ใน session เป็นเจ้าของข้อมูลโดยตรง:

```text
session user.role === STUDENT
CompanyApplication.studentUserId === session user.id
```

ห้ามรับ `studentUserId` หรือ `studentId` จาก client เพื่อเลือกเจ้าของข้อมูล ทุก query
detail/mutation ต้องมีเงื่อนไข ownership จาก `session user.id` และตรวจว่า record อยู่ใน
cycle ที่ถูกต้อง

ต้องปรับ `server/middleware/auth.ts` อย่างระมัดระวัง: API ฝั่ง staff เดิมต้องยังจำกัด
`STAFF`, API ใหม่ใต้ `/api/student/` ต้องยอมให้เฉพาะ `STUDENT` และ endpoint auth/health/geo
ต้องยังเข้าถึงได้ตามเดิม ห้ามเปลี่ยน middleware แบบเปิด API ทั้งหมดเพียงเพื่อให้ student
เรียกใช้งานได้

## API ที่ต้องมีในระยะแรก

ใช้ path ใต้ `/api/student/` เพื่อแสดง ownership ชัดและลดความเสี่ยงที่ client ส่ง ID ของ
นักศึกษาคนอื่นมาเอง:

| Endpoint | หน้าที่ |
| --- | --- |
| `GET /api/student/context` | profile นักศึกษาและรอบที่ใช้งานได้ปัจจุบัน |
| `GET /api/student/applications` | รายการ table ของนักศึกษาที่ login อยู่ พร้อม company/request/file metadata |
| `POST /api/student/applications` | สร้างการสมัคร โดยเลือก company เดิมหรือสร้าง company ใหม่ใน transaction |
| `GET /api/student/applications/:id` | detail ที่ตรวจ ownership |
| `PUT /api/student/applications/:id` | แก้ข้อมูลที่อนุญาตใน `PENDING` เท่านั้น |
| `POST /api/student/applications/:id/outcome` | เปลี่ยนเป็น rejected/accepted/withdrawn ด้วย transition ที่กำหนด |
| `POST /api/student/applications/:id/request` | สร้างคำร้องจากรายการ accepted หนึ่งครั้ง |
| `POST /api/student/requests/:id/signed-document` | อัปโหลดเอกสารลงนามเมื่อ `LETTER_ISSUED` |
| `GET /api/student/requests/:id/letter` | ดาวน์โหลด PDF เมื่อเป็นเจ้าของคำร้อง |
| `GET /api/student/requests/:id/signed-document` | ดู/ดาวน์โหลดเอกสารลงนามเมื่อเป็นเจ้าของคำร้อง |

ห้ามสร้าง public static URL ของเอกสารที่เดา path ได้โดยไม่มี authorization; endpoint
download ต้องตรวจ session และ ownership ก่อน stream ไฟล์

การสร้างบริษัทใหม่และ application ต้องอยู่ใน transaction เดียวกัน หาก company creation
หรือ active-application check ล้มเหลว ต้องไม่มี company กำพร้าเหลืออยู่

## ลำดับการพัฒนา

### ระยะ S1: schema และ API การสมัคร

1. ตรวจว่า [user-unification-plan.md](user-unification-plan.md) ระยะ U5 เสร็จแล้ว จากนั้น
   ตรวจ auth middleware, `User`, `Company`, `CooperativeCycle`, `UIMapPicker` และ API ฝั่ง staff
2. เพิ่ม enum/model/relation/migration สำหรับ `CompanyApplication` และ `CooperativeRequest`
   โดยไม่เพิ่มระบบไฟล์จริงก่อนถึง S3
3. ใช้ `requireRole(event, 'STUDENT')` และ `user.id` จาก session; เพิ่ม helper เฉพาะเมื่อ
   มี API หลายจุดใช้ query ownership เดียวกันจริง
4. ทำ context/list/create/detail/update/outcome APIs พร้อม validation, ownership,
   transaction และ state transition
5. ตรวจกรณี active application พร้อมกัน, company เดิม/ใหม่, record ของผู้อื่น และ cycle ปิด

**จบระยะ S1:** API ผ่านการตรวจ และไม่มี UI mock ที่แกล้งสำเร็จ

### ระยะ S2: หน้า student และตารางรวม

1. ตรวจ layout/navigation สำหรับ role student ที่มีอยู่ แล้วเพิ่มเมนูเท่าที่ route ใช้จริง
2. ทำ `/student` พร้อม context, table รวม, filter, refresh, pagination และ states ครบ
3. ทำ popup บันทึกการสมัครตามหัวข้อด้านบน และ detail `/student/applications/:id`; ไม่มี route
   `/student/applications/new`
4. ต่อ action เปลี่ยนผลและส่งคำร้องกับ API จริง; refresh table หลัง mutation สำเร็จ
5. ใช้ `<UIButtonRefresh>`, `<UIConfirmModal>`, `useNotify()` และ semantic color จาก
   `app/app.config.ts`; ไม่สร้าง notification/modal/button ซ้ำ

**จบระยะ S2:** นักศึกษาที่มีข้อมูลจริงบันทึกและติดตามการสมัครได้ครบ แต่ยังอัปโหลดไฟล์ไม่ได้

### ระยะ S3: ไฟล์เอกสารและจุดเชื่อมเจ้าหน้าที่

1. ตรวจวิธีเก็บไฟล์และ deployment ของโครงการก่อนเลือก local storage; ถ้ายังไม่มี persistent
   storage ที่ production ใช้ได้ ให้หยุดและรายงาน decision นี้ ไม่เก็บไฟล์สำคัญไว้ใน filesystem
   ชั่วคราวแบบเงียบ ๆ
2. เพิ่ม endpoint upload/download ที่ตรวจ MIME, extension, size, ownership และ state
3. ทำปุ่มดาวน์โหลดหนังสือ/อัปโหลดเอกสารในแถวเดิมของตารางและ detail route
4. เพิ่มหรือปรับคิวคำร้องฝั่ง staff เท่าที่จำเป็นเพื่อให้เจ้าหน้าที่เห็น `SUBMITTED` และกำหนด
   หนังสือ PDF ได้; ไม่ทำ PDF generator หากยังไม่มี requirement รูปแบบเอกสาร

**จบระยะ S3:** เมื่อเจ้าหน้าที่แนบ/ออก PDF แล้ว นักศึกษาดาวน์โหลดและส่งเอกสารลงนามกลับได้

## ข้อจำกัดที่ตั้งใจยังไม่ทำ

- สมัครหลายบริษัทพร้อมกัน
- email notification, reminder หรือ integration ส่งอีเมล
- OCR, ลายเซ็นดิจิทัล, version history และหลายไฟล์ต่อเอกสารชนิดเดียว
- PDF generator และ template หนังสือราชการ
- การตรวจรับ/ตีกลับเอกสารโดยเจ้าหน้าที่
- การแบ่งสาขาหรือการ merge บริษัทซ้ำโดยอัตโนมัติ
- การแก้ข้อมูลบริษัทเฉพาะคำร้องแบบ snapshot (ใช้ข้อมูลบริษัทกลางตาม requirement ปัจจุบัน)

หากต้องการข้อใด ให้กำหนดเป็น feature แยก เพราะเปลี่ยน data model และสิทธิ์การทำงานอย่างมีนัยสำคัญ

## เกณฑ์ตรวจรับ

- นักศึกษาที่ login อยู่เห็นเฉพาะข้อมูลของตนเอง และเรียก record/ไฟล์ของคนอื่นได้ `403` หรือ `404`
- นักศึกษานอก cohort หรือเมื่อไม่มีรอบ `OPEN_FOR_APPLICATION` ไม่สร้าง/แก้/ส่งคำร้องได้
- นักศึกษาสร้าง `PENDING` ได้หนึ่งรายการต่อรอบ แม้ยิง request พร้อมกัน
- เลือกบริษัทเดิมได้ และกรอกบริษัทใหม่ตาม validation ของข้อมูลบริษัทเดิมได้ โดย operation
  สำเร็จ/ล้มเหลวแบบ atomic
- `PENDING → REJECTED|ACCEPTED|WITHDRAWN` ทำได้ตามกฎ; transition ข้ามหรือย้อนกลับถูกปฏิเสธ
- สร้างคำร้องได้หนึ่งครั้งจาก application ที่ `ACCEPTED` เท่านั้น
- ตารางเดียวแสดงสถานะสมัคร, สถานะคำร้อง, PDF และเอกสารลงนาม โดยไม่มีหน้าเอกสารแยก
- API ปฏิเสธ upload ใน state ผิด, file type/size ผิด และ request ที่ไม่ใช่เจ้าของ
- หน้า UI มี loading, empty, no-result, validation และ error/retry state; action mutation มี
  loading และไม่กดซ้ำได้
- รัน `pnpm exec prisma validate`, `pnpm exec prisma migrate status`, `pnpm typecheck`,
  `pnpm build` และ `git diff --check` ก่อนส่งงาน
- ทดสอบด้วย browser อย่างน้อย: สร้างบริษัทใหม่+สมัคร, เปลี่ยนผลเป็นไม่รับแล้วสมัครใหม่,
  บริษัทตอบรับ+ส่งคำร้อง, และตรวจว่า account นักศึกษาอื่นเข้าถึงไม่ได้

## รูปแบบรายงานส่งมอบของ agent

รายงานเป็นหัวข้อสั้น ๆ:

1. สิ่งที่ทำ (schema/migration, API, UI)
2. กฎธุรกิจและ authorization ที่บังคับได้จริง
3. การตรวจที่รัน พร้อมผลจริง
4. งานที่จงใจยังไม่ทำ/ข้อจำกัด เช่น persistent file storage หรือ PDF generator
5. รายการไฟล์ที่เปลี่ยน และยืนยันว่าไม่ได้ commit/push หากไม่ได้รับคำสั่ง
