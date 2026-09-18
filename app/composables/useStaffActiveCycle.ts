export const useStaffActiveCycle = () => {
  const activeCycleId = useCookie<number | null>('staff-active-cycle', {
    default: () => null,
    sameSite: 'lax'
  })

  const setActiveCycle = (cycleId: number | null) => {
    activeCycleId.value = cycleId
  }

  return { activeCycleId, setActiveCycle }
}
