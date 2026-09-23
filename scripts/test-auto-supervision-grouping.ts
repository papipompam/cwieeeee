import assert from 'node:assert/strict'
import { distanceKm, groupCompaniesByLocation, type AutoGroupCompany } from '../server/utils/auto-supervision'

const company = (
  id: number,
  province: string,
  district: string,
  latitude: number | null,
  longitude: number | null,
  studentCount = 1
): AutoGroupCompany => ({
  id,
  name: `บริษัท ${id}`,
  province,
  district,
  subdistrict: '',
  latitude,
  longitude,
  studentCount
})

const companies = [
  company(1, 'กรุงเทพมหานคร', 'บางรัก', 13.7279, 100.5241, 3),
  company(2, 'กรุงเทพมหานคร', 'สาทร', 13.7202, 100.5251, 1),
  company(3, 'เชียงใหม่', 'เมืองเชียงใหม่', 18.7883, 98.9853, 2),
  company(4, 'เชียงใหม่', 'เมืองเชียงใหม่', 18.7953, 98.9986, 1)
]

const groups = groupCompaniesByLocation(companies, 2)
assert.equal(groups.length, 2)
assert.ok(groups.every(group => group.length === 2), 'แต่ละกลุ่มต้องสมดุลตามความจุ')
assert.deepEqual(
  groups.map(group => group.map(item => item.province)),
  [['กรุงเทพมหานคร', 'กรุงเทพมหานคร'], ['เชียงใหม่', 'เชียงใหม่']],
  'บริษัทที่อยู่พื้นที่เดียวกันควรอยู่กลุ่มเดียวกัน'
)
assert.deepEqual(groupCompaniesByLocation(companies, 2), groups, 'ผลลัพธ์ต้องคงที่เมื่อใช้ข้อมูลเดิม')
assert.ok(distanceKm(companies[0]!, companies[1]!) < distanceKm(companies[0]!, companies[2]!))

const addressOnly = [
  company(10, 'บุรีรัมย์', 'เมืองบุรีรัมย์', null, null),
  company(11, 'บุรีรัมย์', 'เมืองบุรีรัมย์', null, null),
  company(12, 'นครราชสีมา', 'เมืองนครราชสีมา', null, null),
  company(13, 'นครราชสีมา', 'เมืองนครราชสีมา', null, null)
]
assert.deepEqual(
  groupCompaniesByLocation(addressOnly, 2).map(group => group.map(item => item.province)),
  [['บุรีรัมย์', 'บุรีรัมย์'], ['นครราชสีมา', 'นครราชสีมา']],
  'ข้อมูลไม่มีพิกัดต้อง fallback ไปจัดตามพื้นที่ข้อความ'
)

console.log('All automatic supervision grouping checks PASSED')
