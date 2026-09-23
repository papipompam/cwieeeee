# CWIE CS BRU

ระบบจัดการสหกิจศึกษาและการนิเทศสำหรับนักศึกษา อาจารย์ และเจ้าหน้าที่ พัฒนาด้วย Nuxt 4, Prisma และ PostgreSQL

## สิ่งที่ต้องมี

- Node.js 24
- pnpm 11
- Docker และ Docker Compose

## เริ่มต้นใช้งานบนเครื่อง

1. ติดตั้ง dependencies

   ```bash
   pnpm install
   ```

2. ตรวจสอบไฟล์ `.env` ให้มีค่า local development ดังนี้

   ```env
   DATABASE_URL=postgresql://cwie:<POSTGRES_PASSWORD>@localhost:5432/cwie_dev
   DIRECT_URL=postgresql://cwie:<POSTGRES_PASSWORD>@localhost:5432/cwie_dev
   PERSISTENT_STORAGE_DIR=./uploads
   POSTGRES_USER=cwie
   POSTGRES_PASSWORD=choose-a-local-password
   POSTGRES_DB=cwie_dev
   ```

3. เริ่ม PostgreSQL

   ```bash
   docker compose --profile local-db up -d db
   ```

4. สร้าง Prisma Client และ apply migrations

   ```bash
   pnpm db:generate
   pnpm exec prisma migrate deploy
   ```

5. ตั้ง `ADMIN_BOOTSTRAP_PASSWORD` ใน shell เป็นรหัสผ่านเฉพาะระบบอย่างน้อย 12 ตัวอักษร แล้วสร้างบัญชีเจ้าหน้าที่เริ่มต้น

   ```bash
   pnpm auth:bootstrap
   ```

   ใช้ `admin` กับรหัสผ่านที่กำหนดเพื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับเปลี่ยนรหัสผ่าน

6. เริ่ม development server

   ```bash
   pnpm dev
   ```

   เปิด <http://localhost:3000>

## คำสั่งหลัก

```bash
pnpm dev                         # รัน development server
pnpm typecheck                   # ตรวจ TypeScript และ Vue
pnpm build                       # build สำหรับ production
pnpm exec prisma validate        # ตรวจ Prisma schema
pnpm exec prisma migrate status  # ตรวจ migration กับฐานข้อมูล
pnpm db:studio                   # เปิด Prisma Studio
```

## ชุดตรวจสอบ flow

สคริปต์เหล่านี้สร้าง fixture เฉพาะทดสอบและล้างออกเมื่อจบ:

```bash
pnpm exec tsx scripts/test-rules.ts
pnpm exec tsx scripts/test-student-flow.ts
pnpm exec tsx scripts/test-company-race.ts
pnpm exec tsx scripts/test-staff-cycle-flow.ts
pnpm exec tsx scripts/test-staff-supervision-flow.ts
```

## Docker และ Production

Production ใช้ Supabase PostgreSQL ผ่าน `DATABASE_URL` ของแอปและ `DIRECT_URL` สำหรับ migration. Docker Compose เริ่ม `migrate` ก่อน `app`; service `db` สำหรับพัฒนาในเครื่องอยู่ใน profile `local-db` และไม่เริ่มใน production. ไฟล์อัปโหลดอยู่ใน named volume `uploads-data` ของเครื่องที่รันแอป

1. ตั้ง `.env` บนเครื่อง deploy: `DATABASE_URL` เป็น Supabase transaction pooler พอร์ต 6543 และ `DIRECT_URL` เป็น session pooler พอร์ต 5432 ของโครงการเดียวกัน; ห้าม commit `.env`. ตั้ง `DOCUMENT_SIGNER_NAME`, `DOCUMENT_SIGNER_TITLE` และเตรียมไฟล์ `authorized-dean.png` ใน `DOCUMENT_SIGNER_SIGNATURE_DIR` หากจะออกเอกสารที่ต้องลงนาม
2. ตรวจ backup ของฐานข้อมูล Supabase และสำรอง `uploads-data` ควบคู่กัน เพราะฐานข้อมูลเก็บ path ของไฟล์ไว้ และไฟล์ไม่ได้อยู่ใน Supabase
3. Build และเริ่มระบบ

   ```bash
   docker compose up -d --build
   ```

4. ตั้ง `ADMIN_BOOTSTRAP_PASSWORD` ใน shell เป็นรหัสผ่านเฉพาะระบบอย่างน้อย 12 ตัวอักษร แล้วสร้างบัญชี `admin` ครั้งเดียวโดยรัน `docker compose run --rm -e ADMIN_BOOTSTRAP_PASSWORD migrate pnpm auth:bootstrap`. ระบบจะบังคับเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก
5. ตรวจสถานะและ log

   ```bash
   docker compose ps
   docker compose logs -f migrate app
   curl -f http://localhost:3000/api/health
   ```

ก่อน deploy เวอร์ชันใหม่ ให้สำรองฐานข้อมูลและไฟล์ จากนั้นรัน migration เพียงครั้งเดียว แล้วจึง build/recreate แอป:

```bash
docker compose run --rm migrate
docker compose up -d --build app
```

พอร์ตแอป bind ที่ `127.0.0.1` โดยตั้งใจ ให้ reverse proxy ที่รองรับ HTTPS เป็นจุดรับ traffic จากภายนอก. Proxy ต้องเขียน `X-Forwarded-For` ใหม่จาก IP ผู้ใช้จริงและไม่ยอมรับค่าที่ client ส่งมาเอง เพราะระบบจำกัดการลองเข้าสู่ระบบตาม header นี้. หากต้องรันหลาย application instances ต้องใช้พื้นที่เก็บไฟล์ร่วมกันและให้มีผู้รัน migration เพียงหนึ่งตัวก่อน scale แอป

การล้างระบบ Docker ด้วยคำสั่งต่อไปนี้จะลบไฟล์ที่อัปโหลดใน named volume และลบฐานข้อมูล local หากเปิด profile ไว้; คำสั่งนี้ไม่ลบข้อมูล Supabase:

```bash
docker compose down -v
```

ไฟล์อัปโหลดอยู่ใน `PERSISTENT_STORAGE_DIR` และถูก ignore จาก Git โดยตั้งใจ
