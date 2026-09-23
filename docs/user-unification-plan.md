# แผนรวมบัญชีและข้อมูลบุคคลเป็น `User`

## เป้าหมาย

แทนที่ตาราง `Student`, `Teacher`, `Staff` และตารางบัญชี `User` ที่แยกกันด้วย
**ตาราง `User` เพียงตารางเดียว** สำหรับบัญชีและข้อมูลบุคคลของนักศึกษา อาจารย์ และเจ้าหน้าที่
โดยคง `AuthSession` และ route/UI การจัดการข้อมูลเดิมไว้เท่าที่ทำได้

หลังงานนี้ `loginId` คือรหัสประจำตัวและรหัสเข้าสู่ระบบของทุก role โดยไม่เก็บ
`studentId`, `teacherId` หรือ `staffId` ซ้ำในฐานข้อมูล:

| Role | ความหมายของ `loginId` | รหัสผ่านเริ่มต้นเมื่อสร้างบัญชีใหม่ |
| --- | --- | --- |
| `STUDENT` | รหัสนักศึกษา | รหัสนักศึกษา |
| `TEACHER` | รหัสอาจารย์ | รหัสอาจารย์ |
| `STAFF` | รหัสเจ้าหน้าที่ | รหัสเจ้าหน้าที่ |
| staff เริ่มต้น `admin` | `admin` | `admin1234` |

แผนนี้ต้องเสร็จก่อนเริ่ม implementation ของ
[student-application-plan.md](student-application-plan.md) เพราะ feature นักศึกษาต้องอ้าง
`User.id` โดยตรง

## ขอบเขตและการตัดสินใจ

### อยู่ในขอบเขต

- Prisma schema, migration และ data migration จากตารางเดิม
- auth bootstrap, session, middleware และ API ที่ต้องเปลี่ยนจาก legacy models เป็น `User`
- CRUD เดิมของ `/staff/students`, `/staff/teachers`, `/staff/staffs` โดยคง route และ
  label เฉพาะ role
- student import ที่ต้องสร้างบัญชีผู้ใช้จริงพร้อมรหัสผ่านเริ่มต้น
- tests/scripts ที่อ้าง `Student`, `Teacher`, `Staff`

### อยู่นอกขอบเขต

- หลาย role ต่อหนึ่งคน, role table, permissions แบบละเอียด หรือ profile table เพิ่ม
- ระบบเชิญผู้ใช้, reset password ผ่านอีเมล, MFA และ SSO
- เปลี่ยนหน้าตา dashboard หรือรวมหน้าจัดการทั้งสาม role เป็นหน้าจอเดียว
- เปลี่ยน public API route เพียงเพราะ backend เปลี่ยน model

ผู้ใช้หนึ่งคนมีหนึ่ง `role` ตาม requirement ปัจจุบัน หากอนาคตต้องให้อาจารย์เป็นเจ้าหน้าที่
ด้วย ให้เป็น feature ใหม่ที่ออกแบบ many-to-many role พร้อมสิทธิ์และ audit trail ไม่ทำล่วงหน้า

## โครงสร้างเป้าหมาย

```prisma
model User {
  id           Int       @id @default(autoincrement())
  loginId      String    @unique @map("login_id")
  passwordHash String    @map("password_hash")
  role         UserRole
  prefix       String
  firstName    String    @map("first_name")
  lastName     String    @map("last_name")
  gender       String
  phone        String?
  cohortYear   Int?      @map("cohort_year")
  classGroup   Int?      @map("class_group")
  isActive     Boolean   @default(true) @map("is_active")
  sessions     AuthSession[]
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([role, isActive])
  @@index([role, cohortYear, classGroup])
  @@map("users")
}
```

`phone`, `cohortYear`, `classGroup` ต้อง nullable ใน Prisma เพราะใช้เฉพาะบาง role:

| Role | required ที่ API | ต้องเป็น `null`/ไม่ใช้ |
| --- | --- | --- |
| `STUDENT` | `cohortYear`, `classGroup` | `phone` ยังไม่บังคับใน requirement ปัจจุบัน |
| `TEACHER` | `phone` | `cohortYear`, `classGroup` |
| `STAFF` | `phone` | `cohortYear`, `classGroup` |

`prefix`, `firstName`, `lastName`, `gender` เป็นข้อมูลบังคับของทุก role ที่เป็นบุคคล
หาก preflight พบ user เดิมที่ไม่มี profile ให้หยุดก่อน cleanup migration และรายงานรหัสที่
ขาดข้อมูล ห้ามใส่ชื่อ/เพศ placeholder เพื่อให้ migration ผ่าน

กฎ role-specific ถูกตรวจที่ API validator ทั้ง create และ update; เพิ่ม raw SQL `CHECK`
ใน migration ได้เมื่อ preflight ยืนยันข้อมูลเดิมครบและ agent ตรวจ PostgreSQL syntax แล้ว
แต่ไม่ใช้ Prisma validation อย่างเดียวเป็นข้ออ้างว่า database ปลอดภัย

## หลักการ migration ที่ห้ามละเมิด

- ห้าม rename/drop `students`, `teachers`, `staffs` ใน migration แรก
- ห้าม reset password ของ `User` เดิม; `passwordHash` และ `AuthSession` เดิมต้องอยู่
- ห้ามใช้ `createMany` เพื่อสร้าง user ใหม่หากต้อง hash password รายบัญชี
- ห้ามสร้าง user โดย password plaintext หรือ hash คงที่
- หากพบ `loginId` ซ้ำข้าม legacy role, role ของ User ไม่ตรงกับ profile, หรือ profile
  ที่จำเป็นขาดข้อมูล ให้หยุด data migration พร้อม report; ห้ามเลือก record ฝั่งใดเอง
- schema migration, application refactor และ data migration ต้องส่งมอบเป็นชุดเดียวกัน
  แต่ห้าม commit/push หากผู้ใช้ไม่ได้สั่ง และห้าม drop legacy tables จนกว่าการตรวจหลังย้ายผ่านครบ

## ขั้นตอนละเอียดสำหรับ agent

### U0 — สำรวจและ preflight (read-only ก่อน)

1. อ่าน `AGENTS.md`, schema/migrations ล่าสุด, `server/utils/auth.ts`,
   `server/middleware/auth.ts`, `scripts/bootstrap-auth.ts`, API/UI ทั้งสาม role และ `git status`
2. สร้างรายงาน read-only ของ:
   - จำนวนและ `loginId` ของ `User`
   - จำนวน/rหัสของ `Student.studentId`, `Teacher.teacherId`, `Staff.staffId`
   - รหัสซ้ำข้ามสามตาราง
   - legacy record ที่ยังไม่มี `User`
   - `User` ที่ยังไม่มี legacy record หรือ role ไม่ตรงกัน
   - null/invalid profile fields ตาม role
3. หากฐานข้อมูลเป็นข้อมูลพัฒนาและมี `admin` แต่ไม่มี `Staff` profile ให้ถือเป็น
   exceptional account เท่านั้น: ต้องให้ user กรอก profile ให้ครบ หรือ agent รายงานและ
   หยุดก่อน cleanup; ห้ามเดาชื่อ/เบอร์โทร
4. สำรองฐานข้อมูลหรือยืนยันว่าฐานข้อมูลเป็น disposable development database ตาม workflow
   ของโครงการก่อน migration ที่ drop table ในภายหลัง

**เกณฑ์ผ่าน U0:** มี mapping one-to-one ที่ตรวจได้ระหว่าง legacy profile ทุก record กับ
`User` หรือมีรายการ conflict ที่ส่งกลับผู้ใช้แล้ว ไม่มีการเขียนฐานข้อมูลในระยะนี้

### U1 — ขยาย schema โดยไม่ลบข้อมูล

1. เพิ่ม fields profile และ indexes ตาม “โครงสร้างเป้าหมาย” ลง `User`
2. ใช้ migration แบบ additive ก่อน: fields ใหม่ nullable ชั่วคราวได้เฉพาะเพื่อ backfill
3. ห้ามลบ model legacy, ห้ามเปลี่ยน `AuthSession.userId`, และห้ามแก้ cookie/session format
4. รัน `pnpm exec prisma validate` และ `pnpm exec prisma migrate dev` ตาม workflow ที่มี

**เกณฑ์ผ่าน U1:** database มีข้อมูลทั้งตารางเก่าและ columns ใหม่ใน `users`; login/session
เดิมยังใช้งานได้

### U2 — data migration แบบตรวจซ้ำได้

สร้าง script แบบ explicit เช่น `scripts/migrate-legacy-users.ts` ซึ่งต้อง:

1. รองรับ `--dry-run` เป็นค่าเริ่มต้นและพิมพ์ summary/conflicts โดยไม่เขียนข้อมูล
2. ใช้ transaction ที่เหมาะสมสำหรับการ update/upsert โดยไม่ลบ source rows
3. map ข้อมูลดังนี้:

| legacy source | `User.loginId` | `User.role` | field เพิ่ม |
| --- | --- | --- | --- |
| `students` | `student_id` | `STUDENT` | prefix, name, gender, cohortYear, classGroup, isActive |
| `teachers` | `teacher_id` | `TEACHER` | prefix, name, gender, phone, isActive |
| `staffs` | `staff_id` | `STAFF` | prefix, name, gender, phone, isActive |

4. เมื่อ `User.loginId` มีอยู่และ role ตรงกัน ให้ update เฉพาะ profile fields; ห้ามเขียน
   `passwordHash` ทับ
5. เมื่อไม่มี User ให้สร้าง User พร้อม `hashPassword(loginId)` ตาม role; ยกเว้น `admin`
   ใช้ `hashPassword('admin1234')` เมื่อเป็นการสร้าง account ใหม่เท่านั้น
6. เมื่อ `loginId` ซ้ำหรือ role ไม่ตรงกัน ให้บันทึก conflict และ exit non-zero โดยไม่มี
   cleanup ต่อ
7. รันจริงหลัง user ตรวจ output `--dry-run` แล้วเท่านั้น; รอบจริงต้องพิมพ์จำนวน created,
   updated, skipped และ conflict
8. ใช้ script ซ้ำได้โดยไม่เปลี่ยน password hash หรือสร้าง user ซ้ำในการรันรอบสอง

**เกณฑ์ผ่าน U2:** legacy profile ทุก record มี user ที่ role ถูกต้องและ profile บน `users`
ครบ; sessions เดิมยังชี้ `users.id` เดิม; password ของ user เดิมไม่เปลี่ยน

### U3 — เปลี่ยน application ให้ใช้ `User`

1. เปลี่ยน CRUD handlers ภายใต้ `/api/students`, `/api/teachers`, `/api/staffs` ให้ query
   `prisma.user` พร้อม `where: { role: ... }` แทน legacy models
2. คง endpoint, route, ข้อความใน UI และ DTO role-specific เดิมไว้ก่อน เพื่อลด diff:
   - `/api/students` ยังส่ง `studentId` โดย map จาก `User.loginId`
   - `/api/teachers` ยังส่ง `teacherId` โดย map จาก `User.loginId`
   - `/api/staffs` ยังส่ง `staffId` โดย map จาก `User.loginId`
   - ชื่อเหล่านี้เป็น **API/UI labels เท่านั้น** ไม่ใช่ column หรือข้อมูลซ้ำในฐานข้อมูล
3. CRUD create ใช้ transaction สร้าง `User` และ password hash เริ่มต้นใน server; update
   ต้องห้ามแก้ `role` และต้องรักษา passwordHash หากไม่ได้เปลี่ยนรหัสผ่านผ่าน endpoint เฉพาะ
4. แก้ `readStudentInput`, `readTeacherInput`, `readStaffInput` ให้ยัง validate กฎเฉพาะ role
   ได้ แต่คืน payload ที่ map ไป `User` ได้; ไม่ต้องสร้าง generic form/validator framework
5. แก้ `scripts/bootstrap-auth.ts`: เมื่อรวมข้อมูลแล้ว script นี้ไม่ควรสร้างบัญชีจากสามตาราง
   ให้ลบหรือเปลี่ยนเป็น bootstrap admin เฉพาะเมื่อ user สั่งและไม่ทำงานซ้ำกับ CRUD
6. แก้ `students/import.post.ts`: import นักศึกษาใหม่ต้องสร้าง `User` role `STUDENT` พร้อม
   profile และ `passwordHash` จากรหัสนักศึกษา; duplicate check ใช้ `User.loginId` ใน role
   `STUDENT`; report รูปแบบเดิมให้มากที่สุด
7. เปลี่ยนทุก reference ของ `prisma.student`, `prisma.teacher`, `prisma.staff` รวมถึง
   staff cycle pages, components, tests และ scripts; ค้นหาจนไม่มี runtime reference เหลือ
8. `auth/me` ควรคืนข้อมูลขั้นต่ำที่ UI ต้องใช้ เช่น `loginId`, `role`, ชื่อที่แสดงได้;
   ห้ามคืน password hash หรือข้อมูลเกินจำเป็น

**เกณฑ์ผ่าน U3:** UI และ API ของสาม role เดิมทำ CRUD/ค้นหา/filter ได้จาก `users` เท่านั้น;
รหัสที่แสดงและใช้ login ยังคงตรงความหมายเดิม

### U4 — auth middleware และ authorization

1. รักษา `requireRole` เป็น source เดียวของ role check และเพิ่ม helper รับหลาย role
   เฉพาะเมื่อมี caller ใช้จริง
2. ปรับ global `server/middleware/auth.ts` ให้ route ฝั่ง staff ยัง require `STAFF` และ
   route ใหม่ในอนาคตใต้ `/api/student/` require `STUDENT`; endpoint auth/health/geo
   ยัง bypass ตามเดิม
3. ห้ามทำ middleware ค่าเริ่มต้นเป็น allow-all เพื่อแก้ปัญหา route นักศึกษา
4. ทุก endpoint role-specific ต้อง filter ownership ที่ server แม้ `User.id` มาจาก session
   และ client ซ่อนข้อมูลคนอื่นอยู่แล้ว
5. ตรวจ user `isActive = false` login ไม่ได้ และ session ที่มีอยู่ใช้ต่อไม่ได้ตาม
   `getCurrentUser` เดิม

**เกณฑ์ผ่าน U4:** staff access student API ไม่ได้, student access staff API ไม่ได้, account
inactive ใช้งานไม่ได้ และ endpoint สาธารณะที่มีอยู่ไม่เสีย

### U5 — cleanup migration หลัง integration ผ่าน

ทำเฉพาะเมื่อ U2–U4 ผ่าน, ตรวจ data parity และ user/owner references ใหม่พร้อมแล้ว:

1. สร้าง migration ใหม่แยกต่างหากเพื่อลบ foreign keys/models/tables `students`, `teachers`,
   `staffs` เท่านั้น
2. เปลี่ยน profile fields ที่ต้อง required จาก nullable เป็น required หลังตรวจว่าไม่มี null
   ที่ผิดกฎ; ใช้ raw SQL check constraint เฉพาะกฎที่ผ่าน preflight และ migration ได้จริง
3. ลบ legacy utilities/scripts/tests/import paths ที่ไม่มี caller แล้วเท่านั้น
4. ตรวจ Prisma generated client, migration status และ final schema อีกครั้ง

**เกณฑ์ผ่าน U5:** ไม่มี model/table/endpoint runtime reference เก่าค้างอยู่ และไม่มีข้อมูล
ที่ถูกทิ้งโดยไม่ได้ map ไป `users`

## UI และ API ที่ต้องคงพฤติกรรม

เพื่อไม่ให้ refactor นี้กลายเป็น redesign:

- คง `/staff/students`, `/staff/teachers`, `/staff/staffs` และ layout/table pattern เดิม
- คงปุ่มเพิ่ม แก้ไข ลบ, bulk delete, import นักศึกษา, filters, detail modal และ feedback
  ตาม behavior เดิม เว้นแต่ต้องเปลี่ยนเพื่อป้องกัน account/session เสียหาย
- ห้ามให้ลบ `User` ที่มี `AuthSession` หรือถูกอ้างจาก feature ใหม่ในอนาคตโดยไม่กำหนด
  policy; ระยะนี้ตรวจ relation ก่อนลบ และเสนอ `isActive = false` เมื่อมีการอ้างอิง
- การลบบัญชีจากตาราง role-specific ต้องลบ User เดียวกัน ไม่ลบแค่ profile เพราะหลัง U5
  ไม่มี profile แยกแล้ว

## การตรวจรับ

### Database และ migration

- `login_id` ไม่ซ้ำ และไม่มี columns รหัส role-specific ซ้ำใน `users`
- จำนวน legacy profile ที่ map สำเร็จเท่ากับจำนวน `User` ตาม role หลัง U2 โดยมี report
  สำหรับ exceptional account ทุกตัว
- password hash และ `AuthSession.user_id` ของ user เดิมไม่เปลี่ยน
- รัน `pnpm exec prisma validate` และ `pnpm exec prisma migrate status`

### การทำงาน

- login เดิมด้วย `admin/admin1234` ใช้ได้ (หาก account ถูกสร้างจาก rule นี้)
- นักศึกษา/อาจารย์/เจ้าหน้าที่ที่ import หรือสร้างใหม่ login ด้วยรหัสประจำตัวเป็นครั้งแรกได้
- staff CRUD ทั้งสามหน้าสร้าง, แก้, ค้นหา, filter, ปิดใช้งาน และลบตาม policy ได้
- student CSV/Excel import สร้าง user ที่ login ได้และไม่สร้างซ้ำ
- user ที่ปิดใช้งาน login หรือเรียก API ที่ป้องกันไม่ได้
- `pnpm typecheck`, `pnpm build`, tests/scripts ที่ปรับแล้ว และ `git diff --check` ผ่าน

### Final diff

- ไม่มี dependency ใหม่, global auth bypass, password plaintext, reset password โดยไม่ตั้งใจ
- ไม่มี legacy table/model เหลือหลัง U5 และไม่มี source file ถูกลบก่อน U3/U4 ผ่าน
- ไม่มี commit/push เว้นแต่ผู้ใช้สั่งตรง

## รูปแบบรายงานส่งมอบของ agent

1. สรุป mapping และผล preflight (created/updated/conflict)
2. migration ที่สร้างและผล `migrate status`
3. API/UI/script ที่เปลี่ยน โดยระบุว่า route เดิมยังทำงาน
4. การตรวจ login, CRUD, import, authorization และ checks ที่รันจริง
5. exceptional account หรือ conflict ที่ต้องให้ผู้ใช้ตัดสินใจ
6. ยืนยันว่า commit/push หรือไม่ได้ทำตามคำสั่งที่ได้รับ
