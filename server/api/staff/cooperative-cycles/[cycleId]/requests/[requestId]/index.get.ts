export default defineEventHandler(async (event) => {
  const { cycleId } = await getStaffCycle(event)
  const requestId = validatePositiveId(getRouterParam(event, 'requestId'), 'รหัสคำร้อง')

  const request = await getStaffCycleRequest(event, cycleId, requestId)

  return request
})
