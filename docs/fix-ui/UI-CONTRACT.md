# UI Parity Contract

เอกสารนี้เป็น acceptance contract สำหรับทุกงานที่สร้าง แก้ หรือ review dashboard UI ในโปรเจกต์นี้ โดย `app/pages/dev/ui.vue` เป็น rendered reference ที่ต้องเปรียบเทียบกับหน้าจริง

การใช้ Nuxt UI component ถูกชนิดอย่างเดียวไม่ถือว่าผ่าน หน้าจริงต้องตรงกับ pattern ที่เกี่ยวข้องใน `/dev/ui` ทั้งขนาด, typography, spacing, surface, state และ responsive behavior เว้นแต่ production behavior บังคับให้ต่างและผู้ทำงานบันทึกข้อยกเว้นพร้อมเหตุผล

## Source of truth

ใช้ลำดับต่อไปนี้เมื่อข้อมูลขัดกัน:

1. Requirement ล่าสุดของผู้ใช้
2. Contract นี้และ rendered `/dev/ui`
3. `app/app.config.ts` สำหรับ Nuxt UI global defaults
4. `app/assets/css/main.css` สำหรับ semantic tokens
5. production behavior และ accessibility ที่มีอยู่

ห้ามแก้ `/dev/ui` ให้เหมือนหน้าจริงเพื่อทำให้ comparison ผ่าน หาก baseline ต้องเปลี่ยนต้องเป็นงานที่ผู้ใช้ขอโดยตรงและต้องประเมินผลกระทบทั้งสาม actor ก่อน

## Component size contract

| Context | Component | Size |
| --- | --- | --- |
| Primary page action | `UButton` | `xl` |
| Form action และ modal footer | `UButton` | `xl` |
| Search ใน control row | `UInput` | `xl` |
| Filter ใน control row | `USelect` | `xl` |
| Form field | `UInput`, `USelect`, `UTextarea`, `UInputDate` | `xl` |
| Refresh ใน control row | `UIButtonRefresh` | `xl` |
| Tabs | `UTabs` | `xl` |
| Form confirmation | `UCheckbox` | `sm` |
| Form toggle | `USwitch` | `sm` |
| Table row selection | `UCheckbox` | `lg` |
| Table row action | `UButton` | `xs` |
| Table bulk action | `UButton` | `sm` |
| Clear-filter action | `UButton` | `xs` |
| Sort-header action | `UButton` | `md`, `font-semibold` |
| Operational page-size selector | `USelect` | `md` |
| Operational pagination | `UPagination` | `md` |

ระบุ `size` ให้ชัดเจนใน pattern เหล่านี้ ห้ามพึ่ง implicit default. Controls ที่อยู่ในแถวเดียวกันต้องมี rendered height เท่ากัน โดยเฉพาะ search/filter/refresh และ page-size/pagination

## Operational table anatomy

หน้าที่มี operational list ใช้โครงสร้างเดียวกับ Data Table ใน `/dev/ui` เฉพาะ feature ที่ business workflow มีจริง:

1. `UCard :ui="{ body: 'p-0' }"` เป็น table surface
2. Card header ใช้ `border-b border-divider p-5 sm:p-6`
3. Title ใช้ `text-lg font-bold text-ink`
4. Description ใช้ `mt-1 text-sm leading-6 text-muted`
5. Controls อยู่ใน header, ใช้ responsive column-to-row layout และ `gap-3`
6. Active filters แสดงใต้ controls พร้อม clear-all action
7. Bulk-action bar แสดงเมื่อมี real selection และใช้ semantic soft surface
8. Table wrapper ใช้ `w-full overflow-x-auto`
9. `UTable` ใช้ `min-w-full`; base ต้องเต็มพื้นที่และกำหนด minimum width ตามคอลัมน์จริง
10. Header ใช้ surface กลาง; sort header ต้องมี font size/weight เท่าหัวคอลัมน์อื่น
11. Primary cell text ใช้ `font-medium` หรือ `font-semibold`; metadata ใช้ `text-xs text-muted`
12. Status ใช้ semantic `UBadge variant="subtle"` และมีข้อความ ไม่ใช้สีอย่างเดียว
13. `จัดการ` เป็นคอลัมน์สุดท้าย ชิดขวา และใช้ direct labeled actions ที่ทำงานจริง
14. Footer ใช้ `border-t border-divider px-5 py-4 sm:px-6`
15. เมื่อมี pagination ให้แสดง `แสดง X–Y จาก Z รายการ`, page-size `md` และ pagination `md`
16. Search/filter/page size change ต้อง reset ไปหน้าแรกตามความเหมาะสม

Sorting, selection, bulk actions, pagination และ page size เป็น conditional features: ห้ามเพิ่มเมื่อ workflow ไม่มี แต่เมื่อมีต้องใช้ anatomy และขนาดตาม contract นี้

## Forms and overlays

- ใช้ `UForm`/`UFormField`, visible label และ inline validation
- Controls ใน form grid เดียวกันใช้ขนาดตาม contract และจัดแนวเท่ากัน
- Placeholder ไม่แทน label
- Date control ต้องมี accessible name และรักษา API format/timezone เดิม
- `UModal` ใช้ `#body` และ `#footer`; footer actions ใช้ `xl`
- Consequential/destructive action ใช้ `UIConfirmModal` ตาม semantic color ของผลกระทบ
- Loading state ต้องป้องกันการ submit ซ้ำและไม่ทำให้ layout กระโดด
- Modal ต้องใช้งานได้ด้วย keyboard, คืน focus เมื่อปิด และไม่ overflow ที่ narrow viewport

## Required states

ตรวจเฉพาะ states ที่ workflow มีจริง แต่ห้ามรวมความหมายต่อไปนี้เข้าด้วยกัน:

- initial loading: skeleton เมื่อโครงสร้างคาดเดาได้
- action loading: loading state บน action ที่เริ่ม operation
- no data: ระบบยังไม่มีข้อมูล
- no results: มีข้อมูลแต่ไม่ตรง search/filter พร้อม clear-filter action
- error: อธิบาย failure และมี retry เมื่อทำได้
- forbidden: ใช้เมื่อ permission/API ให้ state นี้จริง
- disabled: แสดงเมื่อ action ใช้ไม่ได้จริงและมีเหตุผลที่เข้าใจได้

## Visual verification gate

ก่อนส่งมอบ UI ทุกงาน:

1. เปิด `/dev/ui` และหน้าที่แก้ใน browser session เดียวกัน
2. ตรวจ desktop อย่างน้อย 1280px และ narrow viewport ประมาณ 390px
3. เปรียบเทียบ component pattern ที่เกี่ยวข้อง ไม่ตรวจจาก source codeเพียงอย่างเดียว
4. ตรวจ computed/rendered dimensions อย่างน้อย:
   - search input, filter select และ refresh button
   - form controls ใน row/grid เดียวกัน
   - page-size select และ pagination buttons
   - table width, header typography และ card header/footer padding
   - modal width/height และ overflow
5. ตรวจ normal, hover, focus-visible, disabled, loading และ applicable data states
6. ตรวจ browser console หลัง initial load, interaction และ HMR
7. รัน `pnpm typecheck`, `pnpm build` และ `git diff --check`

Typecheck/build ผ่านไม่เท่ากับ visual parity ผ่าน หาก browser comparison ยังต่าง งานยังไม่เสร็จ

## Exceptions

ถ้าจำเป็นต้องต่างจาก `/dev/ui`:

- ระบุไฟล์และ pattern ที่ต่าง
- ระบุ production behavior หรือ accessibility constraint ที่ทำให้ใช้ baseline ตรง ๆ ไม่ได้
- ใช้ความแตกต่างน้อยที่สุด
- ตรวจว่า exception ไม่กลายเป็น global override
- รายงานให้ผู้ใช้เห็นก่อนถือว่างานเสร็จ

ห้ามใช้คำว่า “เหมาะสมกว่า”, “ดูสมดุลกว่า” หรือ “ใช้ Nuxt UI แล้ว” เป็นเหตุผลโดยไม่มี rendered evidence หรือข้อจำกัดของ workflow
