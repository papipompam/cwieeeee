# CWIE Application Setup Plan

## เป้าหมาย

เตรียมโปรเจกต์สำหรับพัฒนาระบบนิเทศสหกิจศึกษา โดยใช้ Nuxt เป็น full-stack application เดียว เชื่อม PostgreSQL ผ่าน Prisma ORM และใช้ Nuxt UI เป็นระบบ UI หลัก

## Technology baseline

- Node.js 24 LTS
- pnpm
- Nuxt 4 และ TypeScript
- Nuxt UI v4
- Tailwind CSS v4
- Lucide icons ผ่าน Iconify integration ของ Nuxt UI
- Prisma ORM stable version ที่ตรวจสอบและ pin ณ วันติดตั้ง
- PostgreSQL

ยังไม่เพิ่ม Pinia, authentication library, validation library หรือ abstraction อื่นจนมี requirement ที่จำเป็น ส่วน PostgreSQL สำหรับ development ใช้ Docker Compose แล้ว

## 1. เตรียม runtime

```bash
node --version
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

งานที่ต้องทำ:

- กำหนด Node.js 24 ใน `.nvmrc` หรือ `.node-version`
- กำหนด `packageManager` ใน `package.json`
- ใช้ pnpm เป็น package manager เดียวของโปรเจกต์

ตรวจผ่านเมื่อ Node.js และ pnpm แสดงเวอร์ชันที่กำหนดไว้

## 2. Scaffold Nuxt 4

สร้าง Nuxt ใน repository ปัจจุบัน:

```bash
pnpm create nuxt@latest .
```

ตัวเลือก:

- Package manager: pnpm
- ใช้ TypeScript ตามค่าเริ่มต้นของ Nuxt
- ไม่ initialize Git ใหม่
- ยังไม่เลือก module เพิ่มจาก wizard

ต้องรักษา `AGENTS.md` และ `.agents/` ที่มีอยู่ ห้าม scaffold ทับไฟล์เหล่านี้

Scripts ขั้นต่ำ:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "typecheck": "nuxt typecheck"
  }
}
```

## 3. ติดตั้ง UI stack

```bash
pnpm add @nuxt/ui tailwindcss @iconify-json/lucide
```

ไม่ติดตั้ง `lucide-vue-next` เพิ่ม เพราะใช้ icon integration ของ Nuxt UI ด้วยชื่อรูปแบบ `i-lucide-*`

ตั้งค่า `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
})
```

สร้าง `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

ครอบแอปด้วย `UApp` ใน `app/app.vue`:

```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

ตรวจผ่านเมื่อ Nuxt UI component, Tailwind utility และ `i-lucide-*` render ได้ และ `pnpm typecheck` ผ่าน

## 4. เตรียม PostgreSQL

ใช้ PostgreSQL 17 ผ่าน `docker-compose.yml` สำหรับ development โดยใช้ database ชื่อ `cwie_dev`

```bash
docker compose up -d db
docker compose ps
```

`.env`:

```dotenv
DATABASE_URL="postgresql://cwie:cwie@localhost:5432/cwie_dev"
```

`.env.example` ต้องมีเฉพาะค่าตัวอย่างและ `.env` ต้องอยู่ใน `.gitignore`

ใช้ credential นี้สำหรับ local development เท่านั้น ห้ามนำไปใช้ใน production และให้ใช้ `docker-deployment-standards` เมื่อแก้ Compose หรือเพิ่ม Dockerfile

## 5. ติดตั้ง Prisma ORM

ตรวจสอบ stable release ณ วันติดตั้ง แล้ว pin Prisma packages ให้เป็น major/version เดียวกัน

```bash
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add -D prisma @types/pg dotenv tsx
pnpm exec prisma init --datasource-provider postgresql
```

โครงสร้างเป้าหมาย:

```text
prisma/
  schema.prisma
  migrations/
  generated/
prisma.config.ts
server/
  utils/
    db.ts
```

ข้อกำหนด:

- ใช้ `@prisma/adapter-pg` เชื่อม PostgreSQL
- สร้าง Prisma client แบบ singleton ใน `server/utils/db.ts`
- ใช้ Prisma เฉพาะฝั่ง `server/`
- ห้าม expose `DATABASE_URL` หรือ Prisma client ไปยัง client bundle

## 6. สร้าง schema และ migration แรก

เริ่มด้วย model ขั้นต่ำที่ใช้พิสูจน์การเชื่อมต่อ เช่น `Student` เพียง model เดียว ยังไม่ออกแบบ schema ระบบทั้งหมดก่อนเก็บ requirement

```bash
pnpm exec prisma format
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
```

เพิ่ม scripts:

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

## 7. สร้าง vertical slice สำหรับตรวจระบบ

สร้าง flow ขั้นต่ำ:

```text
Nuxt page -> Nitro API -> Prisma -> PostgreSQL
```

ไฟล์เป้าหมาย:

```text
server/api/health.get.ts
server/api/students.get.ts
app/pages/index.vue
```

พฤติกรรมที่ต้องมี:

- `/api/health` ยืนยันว่า application ทำงาน
- `/api/students` query PostgreSQL ผ่าน Prisma
- หน้าแรกโหลดข้อมูลด้วย `useFetch`
- หน้าแสดง loading, empty และ error state
- ใช้ Nuxt UI component และ Lucide icon อย่างน้อยหนึ่งจุด

## 8. ปรับ project-local agent setup

ติดตั้ง `web-ui-coding-standards` และ `docker-deployment-standards` จาก source repository ลง `.agents/skills/` แล้ว เพราะโปรเจกต์ใช้ Nuxt/Vue และ Docker Compose จริง

บันทึก conventions เฉพาะโปรเจกต์ไว้ใกล้พื้นที่ใช้งาน:

- ใช้ Nuxt 4 และ `app/` directory
- ใช้ Nuxt UI เป็น component system หลัก
- ใช้ semantic colors ของ Nuxt UI
- ใช้ Lucide เพียง icon set เดียว
- ใช้ Prisma เฉพาะใน `server/`
- ใช้ pnpm เป็น package manager

เมื่อต้องแก้ UI หรือ Docker ให้ agent อ่าน skill ที่ตรงกับงานก่อน และไม่โหลด skill ที่ไม่เกี่ยวข้อง

## 9. Final verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm exec prisma validate
pnpm exec prisma migrate status
pnpm dev
```

ตรวจเพิ่มเติม:

- หน้าแรกเปิดได้
- Nuxt UI และ Tailwind แสดงผลถูกต้อง
- Lucide icon โหลดได้
- API query PostgreSQL สำเร็จ
- เมื่อ PostgreSQL ใช้งานไม่ได้ UI แสดง error อย่างเหมาะสม
- ไม่มี secret หรือ Prisma client หลุดเข้า client bundle
- `AGENTS.md` และ `.agents/` เดิมยังอยู่ครบ

## ลำดับดำเนินงาน

1. ติดตั้ง Node.js 24 และ pnpm
2. Scaffold Nuxt 4
3. ติดตั้ง Nuxt UI, Tailwind CSS และ Lucide
4. เลือกและเปิด PostgreSQL
5. ติดตั้งและตั้งค่า Prisma ORM
6. สร้าง migration แรก
7. ทำ API และหน้า smoke test
8. ติดตั้ง conditional agent skills ตามหลักฐานที่เกิดขึ้น
9. รัน typecheck, build และ database validation
