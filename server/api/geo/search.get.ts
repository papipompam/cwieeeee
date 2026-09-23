export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === "string" ? query.q.trim() : ""

  if (!q || q.length < 2) {
    return []
  }

  try {
    const data = await $fetch<Array<{
      place_id: number
      name?: string
      display_name: string
      lat: string
      lon: string
    }>>("https://nominatim.openstreetmap.org/search", {
      query: {
        q,
        format: "json",
        countrycodes: "th",
        addressdetails: 1,
        limit: 5,
        "accept-language": "th"
      },
      headers: {
        "User-Agent": "CWIE-Supervision-App/1.0"
      },
      timeout: 5000
    })

    return data.map(item => ({
      name: item.name || item.display_name.split(",")[0]?.trim() || item.display_name,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }))
  } catch {
    return []
  }
})
