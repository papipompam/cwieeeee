# แผนพัฒนาระบบสร้างหนังสือขอความอนุเคราะห์

## สถานะเอกสาร

- เอกสารนี้เป็นแผนส่งมอบให้ AI coding agent ทำงานต่อใน repository นี้
- ขอบเขตระยะแรกคือหนังสือขอความอนุเคราะห์รับนักศึกษาฝึกประสบการณ์วิชาชีพ/สหกิจเท่านั้น
- ยังไม่รวม `Template เอกสารหนังสือส่งตัว.docx` และ `รูปแบบเอกสารหนังสือส่งตัว.pdf`
- ต้องทำตามลำดับ Phase และ completion gate ในเอกสารนี้ ห้ามเริ่ม Phase ถัดไปก่อน Phase ก่อนหน้าผ่าน
- การอ่านและทำตามแผนนี้ไม่ให้อำนาจ commit, push, deploy, ลบข้อมูลจริง หรือเปลี่ยนนโยบายเอกสารแทนผู้ใช้

## Prompt สำหรับเริ่มงานกับ AI agent

```text
ทำระบบสร้างหนังสือขอความอนุเคราะห์ตามแผน
docs/request-letter-generation-implementation-plan.md

ก่อนเริ่ม:
1. อ่าน AGENTS.md และ instruction ที่ใกล้ไฟล์ที่จะเปลี่ยนทั้งหมด
2. อ่าน .agents/skills ที่ถูก trigger โดยงานนี้ โดยเฉพาะ web-ui-coding-standards,
   testing-standards และ diagnosing-bugs เมื่อพบปัญหาที่ทำซ้ำได้
3. ตรวจ git status และรักษาไฟล์/การแก้ไขเดิมของผู้ใช้ทั้งหมด
4. อ่านไฟล์ต้นฉบับทั้ง DOCX และ PDF ใน docs/doc-template/ แต่ห้ามแก้ ย้าย หรือลบ
5. ไล่ data flow ปัจจุบันจากหน้า staff ไป API, Prisma, storage และ student download

ทำเฉพาะ Phase 0 ก่อน สร้าง prototype PDF จาก fixture โดยยังไม่แก้ Prisma, API หรือ UI จริง
render PDF ทุกหน้าเป็น PNG และตรวจด้วยสายตา เปรียบเทียบกับ PDF ต้นฉบับ
เมื่อ Phase 0 ผ่าน ให้รายงานผล ความต่างที่ยังเหลือ และรายการข้อมูลที่ต้องให้ผู้ใช้ยืนยัน
แล้วหยุดรออนุมัติก่อนเริ่ม Phase 1

หลังผู้ใช้อนุมัติ ให้ทำ Phase 1-8 ตามลำดับ ตรวจ narrow check ก่อน broad check
และหยุดทันทีเมื่อ completion gate ของ Phase ใดไม่ผ่าน ห้ามแก้ด้วยการสร้างระบบใหม่ที่อยู่นอกแผน

ข้อห้าม:
- ห้ามใช้ LibreOffice หรือ DOCX conversion ใน production runtime
- ห้ามสร้าง generic document-template engine หรือ coordinate editor
- ห้าม commit ลายเซ็นจริงหรือ secret เข้า Git
- ห้ามเชื่อข้อมูลนักศึกษา บริษัท รอบสหกิจ หรือผู้ลงนามจาก client
- ห้ามลบ fallback การอัปโหลด PDF เดิม
- ห้ามเปลี่ยน workflow ของหนังสือตอบรับจากสถานประกอบการ
- ห้ามทำหนังสือส่งตัวในงานนี้
```

## 1. เป้าหมายที่ตรวจสอบได้

ที่หน้า:

```text
/staff/cooperative-cycles/:cycleId/applications/:requestId
```

เจ้าหน้าที่ต้องสามารถ:

1. เปิด Modal จัดทำหนังสือขอความอนุเคราะห์
2. ตรวจข้อมูลเอกสารจากคำร้องและรอบสหกิจ
3. ระบุเฉพาะข้อมูลที่ระบบยังไม่มี เช่น เลขที่หนังสือและวันที่ออกหนังสือ
4. ดูตัวอย่าง PDF A4 จำนวน 2 หน้า โดย preview ไม่เปลี่ยนข้อมูลหรือสถานะ
5. ยืนยันออกเอกสาร แล้วระบบสร้าง PDF ใหม่จากข้อมูลฝั่ง server
6. บันทึกไฟล์และ metadata ของเอกสารอย่างปลอดภัย
7. เปลี่ยนสถานะเป็น `LETTER_READY` ตามเงื่อนไขเดิม
8. ให้นักศึกษาดาวน์โหลดเอกสารผ่าน endpoint ที่ตรวจ ownership เดิม
9. ยังคงอัปโหลด PDF ที่เจ้าหน้าที่จัดทำนอกระบบได้เป็น fallback

เอกสารที่สร้างต้องรักษาหน้าตา PDF อ้างอิงและใช้ภาษาไทยได้ถูกต้อง โดยหน้า 2 เติมเฉพาะระยะเวลาฝึก ช่องอื่นทั้งหมดคงว่างให้สถานประกอบการกรอก ลงนาม และประทับตรา

## 2. ข้อเท็จจริงที่ตรวจพบ

### 2.1 เอกสารต้นฉบับ

ไฟล์อ้างอิง:

- `docs/doc-template/เอกสารขอความอนุเคราะห์.docx`
- `docs/doc-template/รูปแบบเอกสารขอความอนุเคราะห์.pdf`

ผลตรวจ:

- PDF เป็น A4 ขนาดประมาณ `595.32 × 841.92 pt` จำนวน 2 หน้า
- PDF สร้างจาก Microsoft Word และไม่มี AcroForm field
- DOCX มี 58 paragraphs, ไม่มี table และมี 1 section
- DOCX ไม่มี field หรือ content control สำหรับ template
- ใช้ฟอนต์ `TH Sarabun New`, `TH SarabunIT๙` และ `TH SarabunPSK`
- DOCX ใช้ direct formatting จำนวนมากและมี floating/anchored images 6 รายการ
- ภายใน DOCX มีตราครุฑหนึ่งภาพ และภาพสแกนหน้ารวมลายเซ็นหลายตำแหน่งหนึ่งภาพ
- PDF มีตราครุฑและลายเซ็นคณบดีที่ถูก crop แยกเป็นภาพในหน้า 1
- PDF ฝัง subset ของ `THSarabunNew` และ `THSarabunNew-Bold` บางส่วน
- เมื่อ render DOCX ด้วย LibreOffice ใน environment ปัจจุบัน เอกสารกลายเป็น 3 หน้าและข้อความไทยสูญหาย เพราะฟอนต์เฉพาะและ layout แบบ Word ไม่เหมือนต้นฉบับ

ข้อสรุป: DOCX ใช้เป็นแหล่งอ้างอิงข้อความและ layout เท่านั้น ห้ามใช้เส้นทาง DOCX → LibreOffice → PDF ใน production

### 2.2 ระบบปัจจุบัน

ระบบปัจจุบัน:

- เจ้าหน้าที่อัปโหลด PDF ผ่าน
  `server/api/staff/cooperative-cycles/[cycleId]/requests/[requestId]/letter.post.ts`
- รับเฉพาะ PDF ขนาดไม่เกิน 10 MB
- เก็บไฟล์ใต้ `PERSISTENT_STORAGE_DIR/letters`
- บันทึก `letterFilePath`, `letterOriginalName`, `letterIssuedAt`
- เปลี่ยนสถานะจาก `SUBMITTED` หรือ `STAFF_PROCESSING` เป็น `LETTER_READY`
- ส่ง notification ให้นักศึกษา
- staff เปิดเอกสาร inline ผ่าน `letter.get.ts`
- student ดาวน์โหลดผ่าน `server/api/student/applications/[id]/letter.get.ts`
- Docker mount `/app/uploads` เป็น persistent volume อยู่แล้ว

ข้อมูลที่มีอยู่แล้ว:

| ข้อมูล | แหล่งข้อมูล |
|---|---|
| ภาคเรียน | `CooperativeCycle.term` |
| ปีการศึกษา | `CooperativeCycle.academicYear` |
| วันเริ่มฝึก | `CooperativeCycle.internshipStartDate` |
| วันสิ้นสุดฝึก | `CooperativeCycle.internshipEndDate` |
| ชื่อนักศึกษา | `User.prefix`, `firstName`, `lastName` |
| รหัสนักศึกษา | `User.loginId` |
| สถานประกอบการ | `CooperativeRequest.companyName` |
| ผู้รับหนังสือ | `CooperativeRequest.recipientName` |
| ตำแหน่งผู้รับ | `CooperativeRequest.recipientPosition` |
| ที่อยู่หนังสือ | `CooperativeRequest.letterAddress` |

ข้อมูลที่ยังไม่มี:

- จำนวนชั่วโมงฝึกประจำรอบ
- เลขที่หนังสือ
- วันที่ออกหนังสือที่เจ้าหน้าที่เลือก
- ชื่อ/ตำแหน่ง/ไฟล์ลายเซ็นผู้ลงนามที่ระบบใช้
- template version
- hash ของไฟล์
- ผู้สร้างเอกสาร
- นโยบายเก็บฉบับเก่าเมื่อออกหรืออัปโหลดฉบับใหม่

### 2.3 ปัญหาที่พบในไฟล์ UI ที่เกี่ยวข้อง

ใน `app/pages/staff/cooperative-cycles/[cycleId]/applications/[requestId].vue` มี `<h2>` เปิดซ้อนกันซ้ำตรงหัวรายละเอียดคำร้อง ให้แก้เมื่อเริ่มแตะไฟล์นี้ใน Phase UI โดยไม่ขยายเป็นงาน refactor อื่น

## 3. การตัดสินใจทางสถาปัตยกรรม

### 3.1 Renderer

ใช้:

```bash
pnpm add pdf-lib @pdf-lib/fontkit
```

เหตุผล:

- โหลดและแก้ PDF เดิมได้โดยไม่ต้องรัน office suite
- ฝัง TTF/OTF และวาง PNG ได้
- ทำงานใน Node/Nitro ได้
- ผลลัพธ์เป็น `Uint8Array` เขียนลง storage เดิมได้
- dependency เพิ่มเพียงเท่าที่งานต้องใช้

ยังไม่ใช้ `@cantoo/pdf-lib` ในรุ่นแรก แม้จะ active กว่า เพราะความสามารถเพิ่มของ fork ยังไม่จำเป็นกับ overlay แบบคงที่ ให้เปลี่ยนเฉพาะเมื่อ prototype แสดงปัญหาที่ upstream แก้ไม่ได้

### 3.2 Template strategy

สร้าง PDF master ที่สะอาดหนึ่งครั้งจากเอกสารต้นฉบับ แล้วเก็บเป็น server-only asset ห้ามใช้ screenshot เป็น template และห้ามสร้างเอกสารทั้งหน้าจาก HTML

PDF master ต้องลบเฉพาะข้อมูลที่เปลี่ยนได้:

- เลขที่หนังสือ
- วันที่ออกหนังสือ
- ผู้รับหนังสือ
- ภาคเรียนและปีการศึกษา
- จำนวนชั่วโมง
- ระยะเวลาฝึก
- ชื่อสถานประกอบการ
- จำนวนคน
- ชื่อนักศึกษา
- ชื่อและลายเซ็นคณบดี
- ระยะเวลาฝึกหน้า 2

ส่วน static เช่น ตราครุฑ ที่อยู่คณะ หัวเรื่อง เนื้อหาคงที่ แบบตอบรับ เส้นประ เบอร์โทร และโทรสารต้องคงเดิม

### 3.3 Font

ใช้ `TH Sarabun New` ให้ตรงต้นฉบับ โดยเก็บอย่างน้อย:

- `THSarabunNew.ttf`
- `THSarabunNew-Bold.ttf`
- license ของฟอนต์

ห้ามใช้ฟอนต์ UI เช่น Prompt ในเอกสารราชการ

### 3.4 ลายเซ็น

รุ่นแรกใช้ภาพลายเซ็นอิเล็กทรอนิกส์ PNG ที่ได้รับอนุญาต ไม่เรียกว่า cryptographic digital signature

- ห้าม commit ลายเซ็นจริงเข้า Git
- ห้ามเก็บไว้ใต้ `public/`
- ให้ renderer อ่านจาก protected path ที่กำหนดด้วย server environment
- ต้อง snapshot ชื่อและตำแหน่งผู้ลงนามตอนออกเอกสาร
- หาก config หรือไฟล์หาย ให้ generate ไม่ได้และคืน error ที่ควบคุมได้

PAdES/PKI, certificate P12/PFX, timestamping และ CA ไม่อยู่ใน scope นี้ หากองค์กรต้องการลายมือชื่อดิจิทัลที่ตรวจสอบเชิง cryptography ให้สร้างแผนใหม่หลังฝ่ายสารบรรณ/กฎหมายกำหนดนโยบาย

### 3.5 วันที่และตัวเลข

ใช้ `Intl.DateTimeFormat` พร้อมกำหนด calendar, numbering system และ timezone ชัดเจน เช่น:

```ts
new Intl.DateTimeFormat('th-TH-u-ca-buddhist-nu-thai', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Bangkok'
})
```

- `academicYear` ในฐานข้อมูลเป็น พ.ศ. อยู่แล้ว ห้ามบวก 543 ซ้ำ
- วันที่ Prisma เป็นวันที่สากล ให้ formatter แปลงเป็นพุทธศักราช
- ต้องมี test ป้องกันวันที่เปลี่ยนวันเพราะ timezone

### 3.6 Scope control

อย่าสร้าง:

- generic document engine
- template marketplace
- coordinate editor
- drag-and-drop document designer
- abstraction สำหรับเอกสารชนิดที่ยังไม่มี requirement
- service ภาษา Python แยกจาก Nuxt

พิกัดของ template v1 ใช้ typed constants ใน renderer ไฟล์เดียวเพียงพอ

## 4. Data contract ของเอกสาร

### 4.1 หน้า 1

| ช่อง | แหล่งข้อมูล | Required |
|---|---|---|
| เลขที่หนังสือ | staff input หรือระบบเลขสารบรรณภายหลัง | รอยืนยัน |
| วันที่ออกหนังสือ | staff input; default วันนี้ | ใช่ |
| ผู้รับหนังสือ | request snapshot | ใช่ |
| ภาคเรียน | cycle | ใช่ |
| ปีการศึกษา | cycle | ใช่ |
| จำนวนชั่วโมง | cycle field ใหม่ | ใช่ |
| วันเริ่มฝึก | cycle | ใช่ |
| วันสิ้นสุดฝึก | cycle | ใช่ |
| สถานประกอบการ | request snapshot | ใช่ |
| จำนวนคน | `1` ตาม schema ปัจจุบัน | ใช่ |
| ชื่อนักศึกษา | user snapshot ณ เวลาสร้าง | ใช่ |
| รหัสนักศึกษา | user | รอยืนยันว่าต้องพิมพ์หรือไม่ |
| ชื่อผู้ลงนาม | server-only config และ snapshot | ใช่ |
| ตำแหน่งผู้ลงนาม | server-only config และ snapshot | ใช่ |
| ภาพลายเซ็น | protected PNG | ใช่ หากใช้ automatic signature |

### 4.2 หน้า 2

เติมเฉพาะ:

```text
ระหว่างวันที่ [วันเริ่มฝึก] ถึงวันที่ [วันสิ้นสุดฝึก]
```

ห้ามเติม:

- หน่วยงานและที่อยู่บริษัท
- วันที่ตอบกลับ
- ช่องยินดีรับ/ไม่รับ
- จำนวนที่บริษัทรับได้
- รายชื่อนักศึกษา 2.1–2.4
- ข้อกำหนดเพิ่มเติม
- ลายเซ็น ชื่อ ตำแหน่ง และตราประทับของบริษัท

## 5. คำถามที่ต้องให้ผู้ใช้หรือเจ้าของงานยืนยัน

AI agent ต้องรวบรวมคำตอบก่อนทำ Phase schema/API/UI:

1. เลขที่หนังสือให้เจ้าหน้าที่กรอกเองหรือระบบรันเลข
2. จำนวนชั่วโมงของรอบปัจจุบันและค่าเริ่มต้นสำหรับรอบใหม่
3. หนังสือหนึ่งฉบับมีนักศึกษาหนึ่งคนเสมอหรือไม่
4. ชื่อและตำแหน่งผู้ลงนามที่ถูกต้องทุกบรรทัด
5. ไฟล์ลายเซ็นใดได้รับอนุญาตให้ใช้จริง
6. ต้องพิมพ์รหัสนักศึกษาหรือเฉพาะชื่อ
7. เมื่อออกฉบับใหม่ ต้องเก็บฉบับเก่าหรือแทนที่ถาวร
8. อนุญาตให้ออกฉบับใหม่หลังนักศึกษาดาวน์โหลดแล้วหรือไม่
9. เลขที่หนังสือ วันที่ และจำนวนคนต้องเป็นเลขไทยทั้งหมดหรือไม่
10. วันที่ออกหนังสือต้องจำกัดให้อยู่ในรอบสหกิจหรือไม่

หากยังไม่ได้คำตอบ ให้ใช้เฉพาะ assumption ที่ย้อนกลับง่ายใน prototype ห้ามฝัง assumption ลง schema หรือ public behavior

## 6. แผนดำเนินงานตาม Phase

## Phase 0 — Prototype และ visual proof

### งาน

1. ตรวจ hash และ render ต้นฉบับทั้ง DOCX/PDF โดยไม่แก้ source
2. สร้าง working copy ใน temp directory
3. จัดทำ PDF master ที่ล้างข้อมูล dynamic
4. เพิ่ม `pdf-lib` และ `@pdf-lib/fontkit` เฉพาะเมื่อเริ่ม prototype จริง
5. สร้าง script fixture ชั่วคราวหรือถาวรตามความเหมาะสม
6. เติมข้อมูลตัวอย่างทั้งสองหน้า
7. render output เป็น PNG ทุกหน้า
8. เทียบกับ PDF ต้นฉบับที่ scale เดียวกัน

### Fixtures ขั้นต่ำ

- ชื่อนักศึกษาปกติ
- ชื่อนักศึกษายาว
- ชื่อบริษัทยาวสองบรรทัด
- ผู้รับหนังสือยาว
- วันที่ข้ามปี พ.ศ.
- ข้อความที่มีสระบน/ล่างและวรรณยุกต์หลายตำแหน่ง
- เลขที่หนังสือความยาวสูงสุดที่ยอมรับ

### ตรวจ

- PDF magic ถูกต้อง
- มี 2 หน้า
- ทุกหน้าเป็น A4
- ภาษาไทยไม่เป็นสี่เหลี่ยมหรืออักขระหาย
- สระและวรรณยุกต์ไม่ทับผิด
- ข้อความไม่ล้นหรือทับ static content
- หน้า 2 เติมเฉพาะช่วงวันที่
- เปิดได้ใน Chrome, macOS Preview และ Adobe Reader อย่างน้อยตาม environment ที่เข้าถึงได้

### Completion gate

ส่งภาพ render ทั้งสองหน้าและรายงานความต่างให้ผู้ใช้ตรวจ แล้วหยุดรออนุมัติ ห้ามเริ่ม Prisma/API/UI ก่อน gate นี้ผ่าน

## Phase 1 — Assets และ renderer

### ไฟล์ใหม่ที่คาดหมาย

```text
server/assets/request-letter/v1/template.pdf
server/assets/request-letter/v1/THSarabunNew.ttf
server/assets/request-letter/v1/THSarabunNew-Bold.ttf
server/assets/request-letter/v1/LICENSE.txt
server/utils/requestLetter.ts
server/utils/requestLetter.test.ts
```

ต้องตรวจเส้นทาง server asset กับ Nitro production bundle จริง อย่าสมมติว่าไฟล์ arbitrary จะถูก copy เข้า `.output` โดยอัตโนมัติ หากจำเป็นให้กำหนด Nitro server assets ใน `nuxt.config.ts` และตรวจจาก build output/container

### `server/utils/requestLetter.ts`

กำหนด data type ที่ไม่ผูก Prisma:

```ts
interface RequestLetterData {
  letterNumber: string
  issueDate: Date
  term: number
  academicYear: number
  internshipHours: number
  internshipStartDate: Date
  internshipEndDate: Date
  recipientName: string
  companyName: string
  studentName: string
  studentId: string
  studentCount: number
  signerName: string
  signerTitleLines: string[]
  signature: Uint8Array
}
```

หน้าที่:

- โหลด template และ font จาก server-only assets
- ตรวจ input boundary
- จัดรูปแบบวันที่และตัวเลขไทย
- ฝัง font
- วาดข้อความตาม typed coordinate constants
- fit ข้อความยาวโดยลดขนาดได้ถึง minimum ที่กำหนด
- wrap เฉพาะ field ที่อนุญาตและจำกัดจำนวนบรรทัด
- ปฏิเสธข้อความที่ยังล้นแทนการย่อจนอ่านไม่ได้
- วาง PNG signature โดยรักษา aspect ratio
- คืน `Uint8Array`

renderer ห้าม query database, อ่าน session หรือเขียนไฟล์

### Completion gate

- unit tests ผ่าน
- fixtures ทุกชุด render ผ่าน
- production build หา template/font เจอ
- visual comparison ผ่าน

## Phase 2 — Schema และข้อมูลรอบสหกิจ

### `prisma/schema.prisma`

เพิ่มที่ `CooperativeCycle`:

```prisma
internshipHours Int? @map("internship_hours")
```

เริ่มเป็น nullable เพื่อรองรับข้อมูลเก่า แล้วให้ API generate ตรวจ required ก่อนออกเอกสาร

เพิ่ม metadata ที่ `CooperativeRequest` อย่างน้อย:

```prisma
letterNumber          String?   @map("letter_number")
letterIssueDate       DateTime? @map("letter_issue_date") @db.Date
letterTemplateVersion String?   @map("letter_template_version")
letterSha256          String?   @map("letter_sha256")
letterIssuedByUserId  Int?      @map("letter_issued_by_user_id")
letterSignerName      String?   @map("letter_signer_name")
letterSignerTitle     String?   @map("letter_signer_title")
```

ถ้าผู้ใช้ยืนยันให้เก็บประวัติทุกฉบับ ให้เพิ่ม model `RequestLetterVersion` แทนการยัด metadata หลายฉบับไว้ใน request เดียว โดยแต่ละ record ควรมี:

- request relation
- version
- source (`GENERATED`/`UPLOADED`)
- file name/path/size/hash
- letter number/issue date
- template version
- signer snapshot
- issued/uploaded by user
- created timestamp
- superseded timestamp หรือ active marker

ห้ามสร้างทั้งสองแนวพร้อมกัน เลือกตามนโยบายที่ผู้ใช้ยืนยัน

### API รอบสหกิจ

แก้ create/update cycle ให้รองรับ `internshipHours` พร้อม validation:

- integer บวก
- required สำหรับรอบใหม่เมื่อ requirement ยืนยันแล้ว
- ไม่คำนวณชั่วโมงจากช่วงวันที่ เพราะไม่ทราบวันทำงาน วันหยุด และชั่วโมงต่อวัน

### ตรวจ

```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm db:generate
pnpm typecheck
```

ตรวจ migration กับฐานข้อมูลที่มี cycle เดิม ห้ามใช้ default ที่เดาเองกับข้อมูลย้อนหลัง

## Phase 3 — Signer configuration

กำหนด server environment โดยใช้ชื่อที่ชัดเจน เช่น:

```env
DOCUMENT_SIGNER_NAME=
DOCUMENT_SIGNER_TITLE=
DOCUMENT_SIGNER_SIGNATURE_PATH=
```

แก้:

- `.env.example` ใส่เฉพาะ key และคำอธิบาย ห้ามใส่ข้อมูลจริง
- `docker-compose.yml` ส่งผ่านค่า config และ mount path ที่จำเป็น
- `nuxt.config.ts` เฉพาะเมื่อใช้ `runtimeConfig`; ห้าม expose ใน `public`

ให้มี utility อ่าน config และ validate ครั้งเดียวต่อ operation ถ้าข้อมูลไม่ครบให้คืนข้อความสำหรับ staff ว่า “ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร” โดยไม่เปิดเผย filesystem path หรือ secret

## Phase 4 — Storage และ file safety

### ไฟล์ใหม่

```text
server/utils/letterStorage.ts
```

หน้าที่เฉพาะงานหนังสือ:

- resolve storage root
- สร้าง directory `letters`
- สร้าง storage filename จาก request ID/version/timestamp
- ตรวจ path containment ด้วย `path.relative()` ไม่ใช้ `startsWith()` อย่างเดียว
- เขียน temp file และ rename บน filesystem เดียวกัน
- คำนวณ SHA-256 ด้วย `node:crypto`
- cleanup ไฟล์ใหม่เมื่อ mutation ล้ม
- ลบ/mark ฉบับเก่าหลัง DB transaction สำเร็จตามนโยบายเท่านั้น

ปรับ endpoint staff/student download ให้ใช้ containment rule เดียวกัน โดยยังรักษา authorization และ disposition เดิม

ตั้ง response header ของเอกสารที่มีข้อมูลส่วนบุคคล:

```text
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
Content-Type: application/pdf
```

## Phase 5 — API preview และ generate

### `preview.post.ts`

Request body ที่ client ส่งได้:

```ts
{
  letterNumber: string
  issueDate: string
}
```

ขั้นตอน:

1. `getStaffCycle()` และ `getStaffCycleRequest()` เพื่อตรวจ staff/cycle/request
2. ตรวจ cycle ไม่ปิดและ request ไม่ terminal
3. อ่าน cycle/request/student/signer จาก server
4. validate ทุก field และความยาว
5. render PDF ใน memory
6. ส่ง PDF พร้อม no-store headers
7. ไม่เขียนไฟล์ ไม่แก้ DB ไม่ส่ง notification

### `generate.post.ts`

1. ตรวจ role/input ใหม่ทั้งหมด ห้ามเชื่อ preview
2. อ่านข้อมูลล่าสุดจาก DB
3. render ใหม่ฝั่ง server
4. คำนวณ hash
5. เขียนไฟล์ใหม่ด้วย unique filename
6. ใช้ transaction/concurrency guard ป้องกัน double submit
7. บันทึก active letter หรือ version record ตาม schema ที่เลือก
8. เปลี่ยนสถานะเป็น `LETTER_READY` เฉพาะเมื่อเดิมเป็น `SUBMITTED`/`STAFF_PROCESSING`
9. ถ้าเป็นการออกฉบับใหม่ในสถานะอื่น ให้รักษาสถานะเดิม
10. ส่ง notification หลัง mutation สำเร็จ
11. cleanup ไฟล์เมื่อ transaction ล้ม
12. จัดการฉบับเก่าตาม policy หลัง commit เท่านั้น

อย่าเปิด DB transaction ค้างระหว่าง render PDF; render ก่อน แล้ว revalidate/lock ก่อน commit

### `letter.post.ts`

รักษา manual upload fallback และปรับให้:

- ใช้ storage utility เดียวกัน
- บันทึก hash/source/user/version ตาม schema
- รักษา magic-byte, MIME, extension และ size validation
- ไม่ลบฉบับเก่าก่อน DB commit

## Phase 6 — Staff UI

### ไฟล์หลัก

```text
app/pages/staff/cooperative-cycles/[cycleId]/applications/[requestId].vue
```

อ่าน `docs/fix-ui/UI-CONTRACT.md` และเทียบ `/dev/ui` ก่อนแก้

### UI เมื่อยังไม่มีหนังสือ

- ปุ่มหลัก `จัดทำหนังสือ`
- ปุ่มรอง `อัปโหลด PDF`

### UI เมื่อมีหนังสือ

- `เปิดดู`
- `จัดทำฉบับใหม่`
- `อัปโหลดแทน`
- metadata: เลขที่หนังสือ วันที่ออก ผู้จัดทำ และ template version เท่าที่ schema มี

### Modal

ใช้ Nuxt UI:

- `UModal`
- `UForm`
- `UFormField`
- `UInput` สำหรับเลขที่หนังสือ
- Nuxt UI date control ที่ project ใช้อยู่สำหรับวันที่
- `UAlert` สำหรับ missing cycle/signer config
- button `size="xl"` ตาม UI contract

ข้อมูลจาก server แสดง read-only:

- ผู้รับ
- บริษัท
- นักศึกษา
- ภาคเรียน/ปีการศึกษา
- ชั่วโมง
- ระยะเวลา
- ผู้ลงนาม

อย่าเปิดให้แก้ snapshot เหล่านี้ใน Modal หาก requirement ไม่ได้ขอ การแก้ข้อมูลต้นทางต้องทำที่ workflow ต้นทาง

### Preview behavior

- POST preview endpoint เป็น Blob
- สร้าง object URL
- แสดง PDF หรือเปิดแท็บใหม่ตาม pattern ที่ทดสอบได้จริง
- revoke object URL เมื่อสร้างใหม่ ปิด Modal หรือ unmount
- preview failure แสดง inline section error และ toast ระดับ action
- ปุ่มยืนยันป้องกัน double click และมี loading state
- generate สำเร็จ: ปิด Modal, revoke URL, refresh request และแจ้ง success

แก้ `<h2>` ที่เปิดซ้ำในไฟล์นี้พร้อมกัน เพราะเป็น markup defect ในจุดที่กำลังแก้

## Phase 7 — Automated และ visual verification

โปรเจกต์ยังไม่มี test framework จึงใช้ `node:test` ผ่าน `tsx` ที่ติดตั้งอยู่แล้ว ไม่เพิ่ม Vitest เพื่องานนี้เพียงงานเดียว

เพิ่ม scripts ตามที่ใช้จริง เช่น:

```json
{
  "test:request-letter": "tsx --test server/utils/requestLetter.test.ts",
  "verify:request-letter": "tsx scripts/verify-request-letter.ts"
}
```

### Unit/structural tests

- required fields
- Thai digit conversion
- Buddhist calendar formatting
- Asia/Bangkok timezone boundary
- PDF magic
- page count 2
- A4 page dimensions
- missing template/font/signature error
- long text fit/wrap/reject behavior
- signature aspect ratio helper
- stable SHA-256 for fixture เมื่อ byte output deterministic; ถ้าไม่ deterministic ให้ตรวจ hash shape/length แทน

### API integration cases

- preview ไม่เปลี่ยน DB/status
- generate สร้างไฟล์และเปลี่ยนสถานะถูกต้อง
- generate ซ้ำพร้อมกันไม่ทำให้ active file ชี้ผิด
- closed cycle ถูกปฏิเสธ
- terminal request ถูกปฏิเสธ
- student เจ้าของคำร้องดาวน์โหลดได้
- student คนอื่นดาวน์โหลดไม่ได้
- staff request คนละ cycle ดาวน์โหลดไม่ได้
- manual upload ยังทำงาน
- replacement/history ทำงานตาม policy

### Visual QA

render output ทุก fixture เป็น PNG ที่ความละเอียดเดียวกันและตรวจทุกหน้า:

- ไม่มี missing glyph
- วรรณยุกต์ไม่ผิดตำแหน่ง
- ไม่มี clipping/overlap
- static layout ไม่ขยับ
- หน้า 2 ยังมีช่องว่างครบ
- signature ไม่แตก ยืด หรือมีพื้นหลังผิด
- output พิมพ์ A4 ที่ 100% scale ได้

Poppler/renderer ใช้ใน dev/CI เท่านั้น ไม่ต้องเพิ่มใน runtime Docker

## Phase 8 — Build, Docker และ UAT

### Checks

```bash
pnpm typecheck
pnpm test:request-letter
pnpm verify:request-letter
pnpm build
git diff --check
docker compose config --quiet
docker compose build app migrate
```

ใน container จริงตรวจ:

- template/font ถูก bundle
- signer path อ่านได้
- เขียน `/app/uploads/letters` ได้
- restart แล้วไฟล์ยังอยู่
- generated PDF มี 2 หน้าและภาษาไทยถูกต้อง
- download endpoints ใช้งานได้

### Browser verification

ทดสอบ authenticated staff ทั้ง desktop และ narrow viewport:

- loading/error/ready states
- keyboard focus ใน Modal
- preview เปิดและปิดได้
- object URL ถูก cleanup
- duplicate submit ถูกป้องกัน
- browser console ไม่มี error หลัง HMR และ full reload

ทดสอบ authenticated student:

- notification/link ถูกต้อง
- ดาวน์โหลดเอกสารได้
- filename อ่านได้
- PDF เปิดได้ครบสองหน้า

### User acceptance

เจ้าหน้าที่หรือผู้รับผิดชอบสารบรรณต้องตรวจอย่างน้อย:

1. ตัวอย่างข้อมูลปกติ
2. ชื่อบุคคลและบริษัทยาว
3. วันที่ข้ามปี
4. เลขไทยและ พ.ศ.
5. พิมพ์ A4 จริง
6. หน้า 2 ให้บริษัทเขียนและลงนามได้
7. ชื่อ/ตำแหน่ง/ลายเซ็นผู้ลงนามถูกต้อง
8. นโยบายฉบับใหม่/ฉบับเก่าตรงกับการปฏิบัติงานจริง

## 7. Definition of Done

งานนี้เสร็จเมื่อครบทุกข้อ:

- PDF ตรงต้นฉบับและได้รับอนุมัติจากผู้ใช้
- ภาษาไทยและฟอนต์ผ่าน visual QA
- หน้า 2 เติมเฉพาะระยะเวลาฝึก
- preview ไม่มี side effect
- generate ใช้เฉพาะ authoritative server data
- signature ไม่ถูกเปิดเผยเป็น public asset
- storage path ปลอดภัยและ persistent
- concurrency/error cleanup ผ่าน
- manual upload fallback ยังอยู่
- staff และ student authorization ผ่าน
- typecheck, tests, build, diff check และ Docker checks ผ่าน
- authenticated desktop/narrow verification ผ่าน หรือบันทึก blocker ตามหลักฐานจริง
- ไม่มีการเปลี่ยนหนังสือส่งตัวหรือ workflow อื่นนอก scope

## 8. รูปแบบรายงานของ AI agent หลังแต่ละ Phase

Agent ต้องรายงานสั้นและตรวจสอบได้:

```text
Phase: <เลขและชื่อ>
ผลลัพธ์: <สร้างหรือเปลี่ยนอะไร>
ไฟล์ที่เปลี่ยน: <รายการ>
ตรวจแล้ว: <คำสั่ง/visual checks พร้อมผลจริง>
ความต่างจากต้นฉบับ: <ถ้ามี>
ข้อสมมติ: <ถ้ามี>
สิ่งที่ต้องยืนยันก่อน Phase ถัดไป: <รายการ>
```

ห้ามระบุว่าผ่านหากไม่ได้รันจริง และห้ามใช้ build/typecheck แทนการตรวจ PDF ด้วยภาพ

## 9. แหล่งอ้างอิง

- pdf-lib: https://pdf-lib.js.org/
- pdf-lib releases: https://github.com/Hopding/pdf-lib/releases
- @pdf-lib/fontkit: https://www.npmjs.com/package/@pdf-lib/fontkit
- Sarabun font: https://github.com/cadsondemak/Sarabun
- TH Sarabun New license: https://thaifaces.com/resources/license/GPL-License-TH-Sarabun-New.pdf
- Intl.DateTimeFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- ETDA electronic signatures: https://www.etda.or.th/th/contact/faq/ETDA.aspx
- PDF standards and PDF/A: https://pdfa.org/pdf-standards/
- Nuxt server: https://nuxt.com/docs/4.x/getting-started/server
- Nitro: https://nitro.build/
