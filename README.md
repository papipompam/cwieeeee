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
   PERSISTENT_STORAGE_DIR=./uploads
   POSTGRES_USER=cwie
   POSTGRES_PASSWORD=choose-a-local-password
   POSTGRES_DB=cwie_dev
   ```

3. เริ่ม PostgreSQL

   ```bash
   docker compose up -d db
   ```

4. สร้าง Prisma Client และ apply migrations

   ```bash
   pnpm db:generate
   pnpm exec prisma migrate deploy
   ```

5. สร้างบัญชีเจ้าหน้าที่เริ่มต้น

   ```bash
   pnpm auth:bootstrap
   ```

   ใช้ `admin` / `admin1234` เพื่อเข้าสู่ระบบครั้งแรก แล้วเปลี่ยนรหัสผ่านทันที

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

Docker Compose จะมี 3 services: `db` (PostgreSQL), `migrate` (apply migration แบบครั้งเดียว) และ `app` (Nuxt production). แอปจะเริ่มหลัง migration สำเร็จเท่านั้น และทั้งฐานข้อมูลกับไฟล์อัปโหลดอยู่ใน named volume ถาวร

1. สร้าง `.env` จาก `.env.example` แล้วตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านที่รัดกุม ห้ามใช้ค่าตัวอย่างใน production
2. Build และเริ่มระบบ

   ```bash
   docker compose up -d --build
   ```

3. ตรวจสถานะและ log

   ```bash
   docker compose ps
   docker compose logs -f migrate app
   curl -f http://localhost:3000/api/health
   ```

ก่อน deploy เวอร์ชันใหม่ ให้รัน migration เพียงครั้งเดียว แล้วจึง build/recreate แอป:

```bash
docker compose run --rm migrate
docker compose up -d --build app
```

พอร์ต PostgreSQL และแอป bind ที่ `127.0.0.1` โดยตั้งใจ ให้ reverse proxy ที่รองรับ HTTPS เป็นจุดรับ traffic จากภายนอก ไม่ควรเปิด PostgreSQL ออก internet. หากต้องรันหลาย application instances ต้องให้มีผู้รัน migration เพียงหนึ่งตัวก่อน scale แอป

การล้างระบบ Docker (รวมฐานข้อมูลและไฟล์ที่อัปโหลด) เป็นการทำลายข้อมูล:

```bash
docker compose down -v
```

ไฟล์อัปโหลดอยู่ใน `PERSISTENT_STORAGE_DIR` และถูก ignore จาก Git โดยตั้งใจ
