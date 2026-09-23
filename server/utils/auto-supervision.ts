export interface AutoGroupCompany {
  id: number
  name: string
  province: string
  district: string
  subdistrict: string
  latitude: number | null
  longitude: number | null
  studentCount: number
}

const hasCoordinates = (company: AutoGroupCompany) =>
  Number.isFinite(company.latitude) && Number.isFinite(company.longitude)

export const distanceKm = (left: AutoGroupCompany, right: AutoGroupCompany) => {
  if (hasCoordinates(left) && hasCoordinates(right)) {
    const toRadians = (degrees: number) => degrees * Math.PI / 180
    const lat1 = toRadians(left.latitude!)
    const lat2 = toRadians(right.latitude!)
    const deltaLat = lat2 - lat1
    const deltaLng = toRadians(right.longitude! - left.longitude!)
    const value = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
  }

  if (left.province === right.province && left.district === right.district && left.subdistrict === right.subdistrict) return 1
  if (left.province === right.province && left.district === right.district) return 10
  if (left.province === right.province) return 50
  return 500
}

/** Deterministic, capacity-constrained geographic grouping. */
export const groupCompaniesByLocation = (companies: AutoGroupCompany[], groupCount: number) => {
  if (groupCount < 1 || companies.length < groupCount) return []

  const sorted = [...companies].sort((a, b) => a.id - b.id)
  const seeds = [sorted[0]!]
  while (seeds.length < groupCount) {
    const next = sorted
      .filter(company => !seeds.some(seed => seed.id === company.id))
      .map(company => ({
        company,
        nearest: Math.min(...seeds.map(seed => distanceKm(company, seed)))
      }))
      .sort((a, b) => b.nearest - a.nearest || a.company.id - b.company.id)[0]!
    seeds.push(next.company)
  }

  const capacity = Math.ceil(companies.length / groupCount)
  const groups = seeds.map(seed => [seed])
  const remaining = sorted
    .filter(company => !seeds.some(seed => seed.id === company.id))
    .sort((a, b) => b.studentCount - a.studentCount || a.id - b.id)

  for (const company of remaining) {
    const target = groups
      .map((members, index) => ({
        index,
        members,
        distance: Math.min(...members.map(member => distanceKm(company, member))),
        students: members.reduce((sum, member) => sum + member.studentCount, 0)
      }))
      .filter(candidate => candidate.members.length < capacity)
      .sort((a, b) => a.distance - b.distance || a.students - b.students || a.index - b.index)[0]!
    target.members.push(company)
  }

  return groups.map(group => group.sort((a, b) => a.id - b.id))
}
